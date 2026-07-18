import type { PhrasingContent, RootContent } from "mdast";

/** Frontmatter contract — see TEACHDOWN-FORMAT.md. */
export interface Frontmatter {
  title: string;
  unit?: string;
  /** Bare stems point at sibling lessons, `reference/<stem>` at reference docs. */
  related?: string[];
}

/** Consecutive plain-markdown nodes between directives. */
export interface ProseBlock {
  type: "prose";
  children: RootContent[];
}

export interface QuizOption {
  content: PhrasingContent[];
  correct: boolean;
}

export interface QuizBlock {
  type: "quiz";
  /**
   * Progress identity (`events.question_id`): the explicit `{#id}` when given,
   * else the 1-based position among all quiz questions in the lesson.
   */
  id: string;
  /** 1-based position among the lesson's quiz questions, in document order. */
  position: number;
  prompt: RootContent[];
  options: QuizOption[];
}

export interface OrderingBlock {
  type: "ordering";
  prompt: RootContent[];
  /** In the authored (correct) order — presentation shuffling is the renderer's job. */
  items: PhrasingContent[][];
}

export type CalloutKind = "note" | "warn" | "win";

export interface CalloutBlock {
  type: "callout";
  kind: CalloutKind;
  title?: string;
  children: RootContent[];
}

export interface JargonEntry {
  term: PhrasingContent[];
  definition: PhrasingContent[];
}

export interface JargonBlock {
  type: "jargon";
  entries: JargonEntry[];
}

export interface SourceBlock {
  type: "source";
  title?: string;
  children: RootContent[];
}

export type LessonBlock =
  | ProseBlock
  | QuizBlock
  | OrderingBlock
  | CalloutBlock
  | JargonBlock
  | SourceBlock;

export interface LessonDoc {
  frontmatter: Frontmatter;
  blocks: LessonBlock[];
}

export interface Problem {
  message: string;
  /** 1-based source line, when the offending node carries a position. */
  line: number | null;
}

/** Thrown by parseLesson after collecting every problem in the document. */
export class TeachdownValidationError extends Error {
  readonly problems: Problem[];

  constructor(problems: Problem[]) {
    super(
      problems
        .map((p) => (p.line === null ? p.message : `line ${p.line}: ${p.message}`))
        .join("\n"),
    );
    this.name = "TeachdownValidationError";
    this.problems = problems;
  }
}
