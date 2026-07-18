"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  clickOption,
  DEFAULT_REVEAL_AFTER,
  initialQuizState,
  type QuizState,
} from "./state.ts";

export interface QuizAnsweredEvent {
  questionId: string;
  correct: boolean;
  attempts: number;
}

export interface QuizLabels {
  correct: ReactNode;
  retry: ReactNode;
  revealed: ReactNode;
}

export interface QuizClasses {
  root?: string;
  prompt?: string;
  options?: string;
  option?: string;
  feedback?: string;
}

export interface QuizProps {
  questionId: string;
  options: { correct: boolean; content: ReactNode }[];
  prompt?: ReactNode;
  labels: QuizLabels;
  revealAfter?: number;
  onAnswered?: (event: QuizAnsweredEvent) => void;
  /** Fires once, when the question becomes resolved (correct or revealed). */
  onResolved?: (questionId: string) => void;
  classes?: QuizClasses;
}

/**
 * Headless multiple-choice question. All styling comes from `classes` and the
 * `data-state`/`data-status` attributes; all copy comes from `labels`.
 */
export function Quiz({
  questionId,
  options,
  prompt,
  labels,
  revealAfter = DEFAULT_REVEAL_AFTER,
  onAnswered,
  onResolved,
  classes,
}: QuizProps) {
  const [state, setState] = useState<QuizState>(() => initialQuizState(options.length));
  const correctIndex = useMemo(() => options.findIndex((o) => o.correct), [options]);

  const handleClick = (index: number) => {
    const result = clickOption(state, index, correctIndex, revealAfter);
    if (result.answered === null) return;
    setState(result.state);
    onAnswered?.({ questionId, correct: result.answered.correct, attempts: result.answered.attempts });
    if (result.resolved) onResolved?.(questionId);
  };

  const optionState = (index: number): "idle" | "correct" | "wrong" => {
    if (state.flagged[index]) return "wrong";
    if (index === correctIndex && state.status !== "open") return "correct";
    return "idle";
  };

  const feedback =
    state.status === "correct" ? labels.correct : state.status === "revealed" ? labels.revealed : state.attempts > 0 ? labels.retry : null;

  return (
    <div className={classes?.root} data-status={state.status}>
      {prompt !== undefined && <div className={classes?.prompt}>{prompt}</div>}
      <div className={classes?.options}>
        {options.map((option, i) => (
          <button
            key={i}
            type="button"
            className={classes?.option}
            data-state={optionState(i)}
            disabled={state.status !== "open" || state.flagged[i]}
            onClick={() => handleClick(i)}
          >
            {option.content}
          </button>
        ))}
      </div>
      {feedback !== null && (
        <p className={classes?.feedback} data-tone={state.status === "correct" ? "ok" : "no"} aria-live="polite">
          {feedback}
        </p>
      )}
    </div>
  );
}
