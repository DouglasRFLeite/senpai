import type { BankQuestion, McQuestion, OpenQuestion } from "./bank-core";
import type { CriterionMark, SessionKind } from "./progress";

/**
 * Pure Session logic: deck building, answer/advance transitions and
 * Results Panel data. No I/O, no React — the player component drives this and
 * emits the Events; abandoning mid-Session loses nothing because every answer
 * was already appended to the log.
 */

export const DEFAULT_OPEN_PASS = 0.6;

export interface DeckOptions {
  mode: SessionKind;
  /** practice: deck size (5 | 10 | 20 in the UI; any n works here) */
  n?: number;
  /** topic: the Topic Drill's topic */
  topic?: string;
  rng?: () => number;
}

/** Fisher–Yates on a copy. */
function shuffle<T>(items: T[], rng: () => number): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Build a Session's deck. Order is shuffled except Exam's MC-before-Open grouping. */
export function buildDeck(bank: BankQuestion[], opts: DeckOptions): BankQuestion[] {
  const rng = opts.rng ?? Math.random;
  switch (opts.mode) {
    case "exam": {
      const mc = bank.filter((q) => q.type === "mc");
      const open = bank.filter((q) => q.type === "open");
      return [...shuffle(mc, rng), ...shuffle(open, rng)];
    }
    case "practice": {
      const n = opts.n ?? 10;
      return shuffle(bank, rng).slice(0, Math.min(n, bank.length));
    }
    case "topic":
      return shuffle(bank.filter((q) => q.topic === opts.topic), rng);
  }
}

export interface McOutcome {
  questionId: string;
  type: "mc";
  chosenIndex: number;
  correct: boolean;
}

export interface OpenOutcome {
  questionId: string;
  type: "open";
  answerText: string;
  score: number;
  criteriaMarks: CriterionMark[];
  selfAssessed: boolean;
  passed: boolean;
}

export type Outcome = McOutcome | OpenOutcome;

export interface SessionState {
  sessionId: string;
  kind: SessionKind;
  deck: BankQuestion[];
  outcomes: Outcome[];
  openPass: number;
}

export function newSession(
  sessionId: string,
  kind: SessionKind,
  deck: BankQuestion[],
  openPass: number = DEFAULT_OPEN_PASS,
): SessionState {
  return { sessionId, kind, deck, outcomes: [], openPass };
}

/** The Question on screen, or null when the deck is done. */
export function current(s: SessionState): BankQuestion | null {
  return s.deck[s.outcomes.length] ?? null;
}

/** MC is summative in a Session: one attempt, graded on the spot. */
export function answerMc(s: SessionState, chosenIndex: number): SessionState {
  const q = current(s);
  if (!q || q.type !== "mc") throw new Error("current question is not MC");
  const outcome: McOutcome = {
    questionId: q.id,
    type: "mc",
    chosenIndex,
    correct: chosenIndex === (q as McQuestion).correctIndex,
  };
  return { ...s, outcomes: [...s.outcomes, outcome] };
}

export interface OpenAnswer {
  answerText: string;
  /** Grader score, or fraction ticked in Self-Assessment. */
  score: number;
  criteriaMarks: CriterionMark[];
  selfAssessed: boolean;
}

export function answerOpen(s: SessionState, a: OpenAnswer): SessionState {
  const q = current(s);
  if (!q || q.type !== "open") throw new Error("current question is not Open");
  const outcome: OpenOutcome = {
    questionId: (q as OpenQuestion).id,
    type: "open",
    answerText: a.answerText,
    score: a.score,
    criteriaMarks: a.criteriaMarks,
    selfAssessed: a.selfAssessed,
    passed: a.score >= s.openPass,
  };
  return { ...s, outcomes: [...s.outcomes, outcome] };
}

export interface SessionResults {
  total: number;
  answered: number;
  mc: { correct: number; total: number };
  open: { passed: number; total: number };
  /** Correct + passed over answered, 0..100. */
  scorePct: number;
  outcomes: Outcome[];
  /** Wrong MC + failed Open — the Results Panel callout. */
  struggles: Outcome[];
}

export function results(s: SessionState): SessionResults {
  const mcOutcomes = s.outcomes.filter((o): o is McOutcome => o.type === "mc");
  const openOutcomes = s.outcomes.filter((o): o is OpenOutcome => o.type === "open");
  const good = mcOutcomes.filter((o) => o.correct).length + openOutcomes.filter((o) => o.passed).length;
  const answered = s.outcomes.length;
  return {
    total: s.deck.length,
    answered,
    mc: { correct: mcOutcomes.filter((o) => o.correct).length, total: mcOutcomes.length },
    open: { passed: openOutcomes.filter((o) => o.passed).length, total: openOutcomes.length },
    scorePct: answered === 0 ? 0 : Math.round((100 * good) / answered),
    outcomes: s.outcomes,
    struggles: s.outcomes.filter((o) => (o.type === "mc" ? !o.correct : !o.passed)),
  };
}
