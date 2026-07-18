import type {
  List,
  Node,
  Paragraph,
  Parent,
  PhrasingContent,
  Root,
  RootContent,
} from "mdast";
import type { ContainerDirective } from "mdast-util-directive";
import remarkDirective from "remark-directive";
import remarkFrontmatter from "remark-frontmatter";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";
import YAML from "yaml";
import {
  TeachdownValidationError,
  type CalloutKind,
  type Frontmatter,
  type JargonEntry,
  type LessonBlock,
  type LessonDoc,
  type Problem,
  type QuizBlock,
} from "./types.ts";

const CALLOUT_KINDS: readonly CalloutKind[] = ["note", "warn", "win"];

const lessonProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkFrontmatter)
  .use(remarkDirective);

const plainProcessor = unified().use(remarkParse).use(remarkGfm);

/** Plain GFM markdown → mdast, no Teachdown vocabulary (RESOURCES.md et al.). */
export function parseMarkdown(md: string): Root {
  return plainProcessor.parse(md);
}

/**
 * Tolerant frontmatter-title read for listings: a lesson broken elsewhere must
 * still show up under its title (or stem). Never throws.
 */
export function readTitle(md: string): string | null {
  const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  try {
    const data = YAML.parse(match[1]) as unknown;
    const title = (data as Record<string, unknown> | null)?.title;
    return typeof title === "string" && title.trim() !== "" ? title.trim() : null;
  } catch {
    return null;
  }
}

/**
 * Parse and validate one Teachdown lesson/reference. Collects every problem
 * (unknown directive, malformed quiz, missing title, …) and throws a single
 * TeachdownValidationError; a returned doc is safe to render.
 */
export function parseLesson(md: string): LessonDoc {
  const root = lessonProcessor.parse(md);
  const problems: Problem[] = [];
  restoreInlineColonForms(root, md);

  const frontmatter = readFrontmatter(root, problems);
  const blocks: LessonBlock[] = [];
  let quizCount = 0;
  let prose: RootContent[] = [];
  const flushProse = () => {
    if (prose.length > 0) blocks.push({ type: "prose", children: prose });
    prose = [];
  };

  for (const node of root.children) {
    if (node.type === "yaml") continue;
    if (node.type !== "containerDirective") {
      prose.push(node);
      continue;
    }
    flushProse();
    const directive = node as ContainerDirective;
    const block = parseDirective(directive, problems, () => ++quizCount);
    if (block) blocks.push(block);
  }
  flushProse();

  if (problems.length > 0) throw new TeachdownValidationError(problems);
  return { frontmatter, blocks };
}

function lineOf(node: Node): number | null {
  return node.position?.start.line ?? null;
}

function readFrontmatter(root: Root, problems: Problem[]): Frontmatter {
  const node = root.children.find((n) => n.type === "yaml");
  if (!node) {
    problems.push({ message: "missing frontmatter (--- title: … ---)", line: 1 });
    return { title: "" };
  }
  let data: unknown;
  try {
    data = YAML.parse(node.value);
  } catch (err) {
    problems.push({ message: `invalid frontmatter YAML: ${(err as Error).message}`, line: lineOf(node) });
    return { title: "" };
  }
  const fm = (data ?? {}) as Record<string, unknown>;
  const out: Frontmatter = { title: "" };

  if (typeof fm.title === "string" && fm.title.trim() !== "") {
    out.title = fm.title.trim();
  } else {
    problems.push({ message: "frontmatter `title` is required", line: lineOf(node) });
  }
  if (fm.unit !== undefined) {
    if (typeof fm.unit === "string") out.unit = fm.unit;
    else problems.push({ message: "frontmatter `unit` must be a string", line: lineOf(node) });
  }
  if (fm.related !== undefined) {
    if (Array.isArray(fm.related) && fm.related.every((r) => typeof r === "string")) {
      out.related = fm.related as string[];
    } else {
      problems.push({ message: "frontmatter `related` must be a list of strings", line: lineOf(node) });
    }
  }
  return out;
}

function parseDirective(
  node: ContainerDirective,
  problems: Problem[],
  nextQuizPosition: () => number,
): LessonBlock | null {
  // remark-directive marks `[label]` paragraphs; Teachdown uses attrs, not labels.
  const children = node.children.filter((c) => !(c.data && "directiveLabel" in c.data && c.data.directiveLabel));
  const title = typeof node.attributes?.title === "string" ? node.attributes.title : undefined;

  switch (node.name) {
    case "quiz":
      return parseQuiz(node, children, problems, nextQuizPosition);
    case "ordering":
      return parseOrdering(node, children, problems);
    case "note":
    case "warn":
    case "win":
      return { type: "callout", kind: node.name as CalloutKind, title, children };
    case "jargon":
      return parseJargon(node, children, problems);
    case "source":
      return { type: "source", title, children };
    default:
      problems.push({
        message: `unknown directive :::${node.name} — the vocabulary is ${["quiz", "ordering", ...CALLOUT_KINDS, "jargon", "source"].join(", ")}`,
        line: lineOf(node),
      });
      return null;
  }
}

function parseQuiz(
  node: ContainerDirective,
  children: RootContent[],
  problems: Problem[],
  nextQuizPosition: () => number,
): QuizBlock | null {
  const position = nextQuizPosition();
  const lists = children.filter((c): c is List => c.type === "list");
  if (lists.length !== 1) {
    problems.push({ message: "quiz must contain exactly one options list", line: lineOf(node) });
    return null;
  }
  const list = lists[0];
  if (children[children.length - 1] !== list) {
    problems.push({ message: "the options list must be the last thing in a quiz", line: lineOf(list) });
    return null;
  }

  const options = list.children.map((item) => {
    if (typeof item.checked !== "boolean") {
      problems.push({
        message: "quiz options must be task-list items (`- [ ]` / `- [x]`)",
        line: lineOf(item),
      });
      return null;
    }
    return { content: itemContent(item, problems), correct: item.checked };
  });
  if (options.some((o) => o === null)) return null;
  const ok = options as { content: PhrasingContent[]; correct: boolean }[];

  if (ok.filter((o) => o.correct).length !== 1) {
    problems.push({ message: "quiz must have exactly one correct option ([x])", line: lineOf(node) });
    return null;
  }

  const explicitId = typeof node.attributes?.id === "string" && node.attributes.id !== "" ? node.attributes.id : null;
  return {
    type: "quiz",
    id: explicitId ?? String(position),
    position,
    prompt: children.slice(0, children.indexOf(list)),
    options: ok,
  };
}

function parseOrdering(
  node: ContainerDirective,
  children: RootContent[],
  problems: Problem[],
): LessonBlock | null {
  const list = children.find((c): c is List => c.type === "list" && c.ordered === true);
  if (!list) {
    problems.push({ message: "ordering must contain an ordered list (1. 2. 3.)", line: lineOf(node) });
    return null;
  }
  if (list.children.length < 2) {
    problems.push({ message: "ordering needs at least 2 items", line: lineOf(list) });
    return null;
  }
  return {
    type: "ordering",
    prompt: children.slice(0, children.indexOf(list)),
    items: list.children.map((item) => itemContent(item, problems)),
  };
}

/** A list item's single line of phrasing content (its first paragraph). */
function itemContent(item: Parent, problems: Problem[]): PhrasingContent[] {
  const para = item.children.find((c): c is Paragraph => c.type === "paragraph");
  if (!para) {
    problems.push({ message: "list item must be a single line of text", line: lineOf(item) });
    return [];
  }
  return para.children;
}

function parseJargon(
  node: ContainerDirective,
  children: RootContent[],
  problems: Problem[],
): LessonBlock | null {
  const paragraphs = children.filter((c): c is Paragraph => c.type === "paragraph");
  if (paragraphs.length === 0) {
    problems.push({ message: "jargon is empty — expected `term :: definition` lines", line: lineOf(node) });
    return null;
  }
  const entries: JargonEntry[] = [];
  let ok = true;
  for (const para of paragraphs) {
    for (const line of splitLines(para.children)) {
      const entry = splitEntry(line);
      if (!entry) {
        problems.push({
          message: "jargon line must be `term :: definition`",
          line: lineOf(line[0] ?? para),
        });
        ok = false;
        continue;
      }
      entries.push(entry);
    }
  }
  return ok ? { type: "jargon", entries } : null;
}

/** Split phrasing content on soft line breaks (newlines inside text nodes). */
function splitLines(nodes: PhrasingContent[]): PhrasingContent[][] {
  const lines: PhrasingContent[][] = [[]];
  for (const node of nodes) {
    if (node.type === "break") {
      lines.push([]);
      continue;
    }
    if (node.type !== "text" || !node.value.includes("\n")) {
      lines[lines.length - 1].push(node);
      continue;
    }
    const parts = node.value.split("\n");
    parts.forEach((part, i) => {
      if (i > 0) lines.push([]);
      if (part !== "") lines[lines.length - 1].push({ ...node, value: part, position: node.position });
    });
  }
  return lines.filter((l) => l.length > 0);
}

/** Split one jargon line at ` :: ` into term and definition, or null if it has none. */
function splitEntry(line: PhrasingContent[]): JargonEntry | null {
  for (let i = 0; i < line.length; i++) {
    const node = line[i];
    if (node.type !== "text") continue;
    const at = node.value.indexOf(" :: ");
    if (at === -1) continue;
    const before = node.value.slice(0, at).trimEnd();
    const after = node.value.slice(at + " :: ".length).trimStart();
    const term = [...line.slice(0, i)];
    if (before !== "") term.push({ ...node, value: before });
    const definition: PhrasingContent[] = [];
    if (after !== "") definition.push({ ...node, value: after });
    definition.push(...line.slice(i + 1));
    if (term.length === 0) return null;
    return { term, definition };
  }
  return null;
}

/**
 * Only container directives (`:::name`) are Teachdown vocabulary. remark-directive
 * also parses `:x`/`::x` forms, which ordinary prose produces by accident
 * ("a 1:2 ratio") — restore those to the literal source text.
 */
function restoreInlineColonForms(root: Root, source: string): void {
  const visit = (node: Parent): void => {
    if (!Array.isArray(node.children)) return;
    node.children = node.children.map((child) => {
      if (child.type !== "leafDirective" && child.type !== "textDirective") return child;
      const { name, position } = child as unknown as { name: string; position?: Node["position"] };
      const raw =
        position?.start.offset != null && position?.end.offset != null
          ? source.slice(position.start.offset, position.end.offset)
          : `:${name}`;
      const text = { type: "text" as const, value: raw, position: child.position };
      // A leaf directive sits in flow position; text must live in a paragraph.
      return child.type === "leafDirective"
        ? { type: "paragraph" as const, children: [text], position: child.position }
        : text;
    }) as typeof node.children;
    for (const child of node.children) visit(child as Parent);
  };
  visit(root);
}
