/**
 * Pure state machines for the interactive blocks. The grading semantics are a
 * contract carried over from the legacy exercise.js (and lib/progress.ts keys):
 * a wrong click flags ONLY the clicked option; after `revealAfter` wrong tries
 * the answer is revealed; a question is *resolved* once correct or revealed.
 */

export type QuizStatus = "open" | "correct" | "revealed";

export interface QuizState {
  status: QuizStatus;
  attempts: number;
  wrongCount: number;
  /** Options wrong-clicked so far (disabled, flagged). */
  flagged: boolean[];
}

export interface QuizClickResult {
  state: QuizState;
  /** The quiz_answered payload this click produces, or null for a no-op click. */
  answered: { correct: boolean; attempts: number } | null;
  /** True when this click resolved the question (correct or revealed). */
  resolved: boolean;
}

export const DEFAULT_REVEAL_AFTER = 2;

export function initialQuizState(optionCount: number): QuizState {
  return { status: "open", attempts: 0, wrongCount: 0, flagged: Array(optionCount).fill(false) };
}

export function clickOption(
  state: QuizState,
  optionIndex: number,
  correctIndex: number,
  revealAfter: number = DEFAULT_REVEAL_AFTER,
): QuizClickResult {
  if (state.status !== "open" || state.flagged[optionIndex]) {
    return { state, answered: null, resolved: false };
  }
  const attempts = state.attempts + 1;

  if (optionIndex === correctIndex) {
    return {
      state: { ...state, status: "correct", attempts },
      answered: { correct: true, attempts },
      resolved: true,
    };
  }

  const flagged = state.flagged.slice();
  flagged[optionIndex] = true;
  const wrongCount = state.wrongCount + 1;
  const revealed = wrongCount >= revealAfter;
  return {
    state: { ...state, status: revealed ? "revealed" : "open", attempts, wrongCount, flagged },
    answered: { correct: false, attempts },
    resolved: revealed,
  };
}

export interface OrderingState {
  /** How many items are locked in, i.e. the next expected 0-based index. */
  placed: number;
  total: number;
}

export type OrderingOutcome = "locked" | "done" | "wrong" | "noop";

export function initialOrderingState(total: number): OrderingState {
  return { placed: 0, total };
}

/** `itemIndex` is the item's 0-based position in the authored (correct) order. */
export function clickOrderingItem(
  state: OrderingState,
  itemIndex: number,
): { state: OrderingState; outcome: OrderingOutcome } {
  if (itemIndex < state.placed || state.placed >= state.total) return { state, outcome: "noop" };
  if (itemIndex !== state.placed) return { state, outcome: "wrong" };
  const placed = state.placed + 1;
  return { state: { ...state, placed }, outcome: placed === state.total ? "done" : "locked" };
}
