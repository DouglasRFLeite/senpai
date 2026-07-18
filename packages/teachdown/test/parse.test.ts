import { describe, expect, it } from "vitest";
import {
  parseLesson,
  parseMarkdown,
  readTitle,
  TeachdownValidationError,
} from "../src/index.ts";

const fm = (body: string, extra = "") =>
  `---\ntitle: Test Lesson\n${extra}---\n\n${body}`;

function problemsOf(md: string) {
  try {
    parseLesson(md);
  } catch (err) {
    if (err instanceof TeachdownValidationError) return err.problems;
    throw err;
  }
  throw new Error("expected parseLesson to throw");
}

describe("frontmatter", () => {
  it("parses title, unit and related", () => {
    const doc = parseLesson(
      "---\ntitle: How It Works\nunit: Unit 1\nrelated:\n  - reference/glossary\n  - 0002-accounts\n---\n\nHello.\n",
    );
    expect(doc.frontmatter).toEqual({
      title: "How It Works",
      unit: "Unit 1",
      related: ["reference/glossary", "0002-accounts"],
    });
  });

  it("leaves unit and related undefined when absent", () => {
    const doc = parseLesson("---\ntitle: Bare\n---\n\nHi.\n");
    expect(doc.frontmatter.title).toBe("Bare");
    expect(doc.frontmatter.unit).toBeUndefined();
    expect(doc.frontmatter.related).toBeUndefined();
  });

  it("errors on missing frontmatter", () => {
    const problems = problemsOf("Just prose.\n");
    expect(problems[0].message).toMatch(/frontmatter/i);
    expect(problems[0].line).toBe(1);
  });

  it("errors on missing title", () => {
    const problems = problemsOf("---\nunit: Unit 1\n---\n\nHi.\n");
    expect(problems[0].message).toMatch(/title/i);
    expect(problems[0].line).toBe(1);
  });

  it("errors on non-list related", () => {
    const problems = problemsOf("---\ntitle: X\nrelated: glossary\n---\n\nHi.\n");
    expect(problems[0].message).toMatch(/related/i);
  });
});

describe("prose", () => {
  it("groups consecutive markdown nodes into one prose block", () => {
    const doc = parseLesson(fm("# Heading\n\nPara one.\n\nPara two.\n"));
    expect(doc.blocks).toHaveLength(1);
    expect(doc.blocks[0].type).toBe("prose");
    const prose = doc.blocks[0];
    if (prose.type !== "prose") throw new Error("unreachable");
    expect(prose.children.map((n) => n.type)).toEqual(["heading", "paragraph", "paragraph"]);
  });

  it("splits prose around a directive", () => {
    const doc = parseLesson(
      fm("Before.\n\n:::note\nInside.\n:::\n\nAfter.\n"),
    );
    expect(doc.blocks.map((b) => b.type)).toEqual(["prose", "callout", "prose"]);
  });
});

describe("quiz", () => {
  const quiz = `:::quiz
Which one?

- [ ] wrong option
- [x] right option
- [ ] another wrong
:::`;

  it("parses prompt, options and the correct flag", () => {
    const doc = parseLesson(fm(quiz));
    const q = doc.blocks[0];
    if (q.type !== "quiz") throw new Error("expected quiz");
    expect(q.prompt).toHaveLength(1);
    expect(q.options).toHaveLength(3);
    expect(q.options.map((o) => o.correct)).toEqual([false, true, false]);
  });

  it("numbers questions 1-based across the whole lesson", () => {
    const doc = parseLesson(fm(`${quiz}\n\nSome prose.\n\n${quiz}`));
    const quizzes = doc.blocks.filter((b) => b.type === "quiz");
    expect(quizzes.map((q) => q.id)).toEqual(["1", "2"]);
    expect(quizzes.map((q) => q.position)).toEqual([1, 2]);
  });

  it("honors an explicit {#id}", () => {
    const doc = parseLesson(
      fm(":::quiz{#gas-halting}\nWhy gas?\n\n- [x] halting\n- [ ] fashion\n:::"),
    );
    const q = doc.blocks[0];
    if (q.type !== "quiz") throw new Error("expected quiz");
    expect(q.id).toBe("gas-halting");
    expect(q.position).toBe(1);
  });

  it("keeps inline markdown in options", () => {
    const doc = parseLesson(
      fm(":::quiz\nQ?\n\n- [x] call `transfer` on it\n- [ ] nothing\n:::"),
    );
    const q = doc.blocks[0];
    if (q.type !== "quiz") throw new Error("expected quiz");
    expect(q.options[0].content.some((n) => n.type === "inlineCode")).toBe(true);
  });

  it("errors when no option is checked", () => {
    const problems = problemsOf(
      fm("prelude\n\n:::quiz\nQ?\n\n- [ ] a\n- [ ] b\n:::"),
    );
    expect(problems[0].message).toMatch(/exactly one correct/i);
    expect(problems[0].line).toBe(7); // the :::quiz line
  });

  it("errors when two options are checked", () => {
    const problems = problemsOf(fm(":::quiz\nQ?\n\n- [x] a\n- [x] b\n:::"));
    expect(problems[0].message).toMatch(/exactly one correct/i);
  });

  it("errors when the quiz has no options list", () => {
    const problems = problemsOf(fm(":::quiz\nJust prose.\n:::"));
    expect(problems[0].message).toMatch(/options/i);
  });

  it("errors when list items are not task-list options", () => {
    const problems = problemsOf(fm(":::quiz\nQ?\n\n- plain item\n- [x] ok\n:::"));
    expect(problems[0].message).toMatch(/task/i);
  });

  it("collects every problem before throwing", () => {
    const problems = problemsOf(
      fm(":::quiz\nQ?\n\n- [ ] a\n- [ ] b\n:::\n\n:::mystery\nwho am i\n:::"),
    );
    expect(problems).toHaveLength(2);
  });
});

describe("ordering", () => {
  it("parses prompt and items in authored (correct) order", () => {
    const doc = parseLesson(
      fm(":::ordering\nOrder these:\n\n1. sign it\n2. broadcast it\n3. mine it\n:::"),
    );
    const o = doc.blocks[0];
    if (o.type !== "ordering") throw new Error("expected ordering");
    expect(o.prompt).toHaveLength(1);
    expect(o.items).toHaveLength(3);
  });

  it("errors without an ordered list", () => {
    const problems = problemsOf(fm(":::ordering\n- a\n- b\n:::"));
    expect(problems[0].message).toMatch(/ordered list/i);
  });

  it("errors with fewer than 2 items", () => {
    const problems = problemsOf(fm(":::ordering\n1. only one\n:::"));
    expect(problems[0].message).toMatch(/at least 2/i);
  });
});

describe("callouts", () => {
  it.each(["note", "warn", "win"] as const)("parses %s with a title", (kind) => {
    const doc = parseLesson(fm(`:::${kind}{title="The win"}\nBody text.\n:::`));
    const c = doc.blocks[0];
    if (c.type !== "callout") throw new Error("expected callout");
    expect(c.kind).toBe(kind);
    expect(c.title).toBe("The win");
    expect(c.children).toHaveLength(1);
  });

  it("title is optional", () => {
    const doc = parseLesson(fm(":::note\nPlain note.\n:::"));
    const c = doc.blocks[0];
    if (c.type !== "callout") throw new Error("expected callout");
    expect(c.title).toBeUndefined();
  });
});

describe("jargon", () => {
  it("parses term :: definition lines with inline markdown", () => {
    const doc = parseLesson(
      fm(
        ":::jargon\nIt's signed :: authorized by the sender's **private key**\nDeterministic :: same input, same output\n:::",
      ),
    );
    const j = doc.blocks[0];
    if (j.type !== "jargon") throw new Error("expected jargon");
    expect(j.entries).toHaveLength(2);
    expect(j.entries[0].definition.some((n) => n.type === "strong")).toBe(true);
  });

  it("errors on a line without the :: separator", () => {
    const problems = problemsOf(fm(":::jargon\nno separator here\n:::"));
    expect(problems[0].message).toMatch(/::/);
  });

  it("errors on an empty body", () => {
    const problems = problemsOf(fm(":::jargon\n:::"));
    expect(problems[0].message).toMatch(/empty/i);
  });
});

describe("source", () => {
  it("wraps prose", () => {
    const doc = parseLesson(
      fm(':::source{title="Read this next"}\n[Intro](https://example.org) — accounts, the EVM.\n:::'),
    );
    const s = doc.blocks[0];
    if (s.type !== "source") throw new Error("expected source");
    expect(s.title).toBe("Read this next");
    expect(s.children).toHaveLength(1);
  });
});

describe("unknown directives", () => {
  it("errors on unknown container directives with the line number", () => {
    const problems = problemsOf(fm("One.\n\n:::spoiler\nnope\n:::"));
    expect(problems[0].message).toMatch(/spoiler/);
    expect(problems[0].line).toBe(7);
  });

  it("restores inline colon forms to literal text (prose like '1:2' is not a directive)", () => {
    const doc = parseLesson(fm("A classic shot is 1:2 exactly.\n"));
    const prose = doc.blocks[0];
    if (prose.type !== "prose") throw new Error("expected prose");
    const para = prose.children[0];
    if (para.type !== "paragraph") throw new Error("expected paragraph");
    const text = para.children.map((n) => (n.type === "text" ? n.value : "")).join("");
    expect(text).toBe("A classic shot is 1:2 exactly.");
    expect(JSON.stringify(prose.children)).not.toContain("Directive");
  });

  it("restores leaf directives (::x) as literal paragraph text", () => {
    const doc = parseLesson(fm("::video\n"));
    const prose = doc.blocks[0];
    if (prose.type !== "prose") throw new Error("expected prose");
    expect(JSON.stringify(prose.children)).toContain("::video");
  });
});

describe("readTitle (tolerant listing helper)", () => {
  it("reads the frontmatter title", () => {
    expect(readTitle("---\ntitle: Hello\n---\n\nBody.\n")).toBe("Hello");
  });

  it("returns null without frontmatter, without a title, or on broken YAML", () => {
    expect(readTitle("Just prose.\n")).toBeNull();
    expect(readTitle("---\nunit: U1\n---\n\nX.\n")).toBeNull();
    expect(readTitle("---\ntitle: [broken\n---\n\nX.\n")).toBeNull();
  });

  it("never throws on a lesson that is otherwise invalid", () => {
    expect(readTitle("---\ntitle: Broken Quiz\n---\n\n:::quiz\nno options\n:::\n")).toBe("Broken Quiz");
  });
});

describe("parseMarkdown (plain entry)", () => {
  it("returns an mdast root for plain GFM markdown", () => {
    const root = parseMarkdown("# Hi\n\nSome **bold** and a [link](https://x.y).\n");
    expect(root.type).toBe("root");
    expect(root.children[0].type).toBe("heading");
  });

  it("does not treat ::: as directives", () => {
    const root = parseMarkdown(":::note\nnot a directive here\n:::\n");
    expect(JSON.stringify(root)).not.toContain("containerDirective");
  });
});
