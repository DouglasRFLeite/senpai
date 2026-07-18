"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { clickOrderingItem, initialOrderingState } from "./state.ts";

export interface OrderingLabels {
  next: ReactNode;
  done: ReactNode;
  wrong: ReactNode;
}

export interface OrderingClasses {
  root?: string;
  prompt?: string;
  options?: string;
  option?: string;
  rank?: string;
  feedback?: string;
}

export interface OrderingProps {
  /** Items in the authored (correct) order. */
  items: ReactNode[];
  /** Presentation permutation of item indices; defaults to authored order. */
  displayOrder?: number[];
  prompt?: ReactNode;
  labels: OrderingLabels;
  /** How long a wrong click stays flagged, in ms (legacy widget: 600). */
  flashMs?: number;
  classes?: OrderingClasses;
}

/**
 * Headless click-in-order exercise. Practice-only by contract: no callbacks,
 * no progress events, no part in lesson completion (TEACHDOWN-FORMAT.md).
 */
export function Ordering({
  items,
  displayOrder,
  prompt,
  labels,
  flashMs = 600,
  classes,
}: OrderingProps) {
  const [state, setState] = useState(() => initialOrderingState(items.length));
  const [flashing, setFlashing] = useState<number | null>(null);
  const [lastOutcome, setLastOutcome] = useState<"ok" | "wrong" | null>(null);
  const flashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (flashTimer.current) clearTimeout(flashTimer.current); }, []);

  const order = displayOrder ?? items.map((_, i) => i);

  const handleClick = (index: number) => {
    const result = clickOrderingItem(state, index);
    if (result.outcome === "noop") return;
    setState(result.state);
    setLastOutcome(result.outcome === "wrong" ? "wrong" : "ok");
    if (result.outcome === "wrong") {
      setFlashing(index);
      if (flashTimer.current) clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setFlashing(null), flashMs);
    } else {
      setFlashing(null);
    }
  };

  const done = state.placed === items.length;
  const feedback =
    lastOutcome === null ? null : lastOutcome === "wrong" ? labels.wrong : done ? labels.done : labels.next;

  return (
    <div className={classes?.root} data-status={done ? "done" : "open"}>
      {prompt !== undefined && <div className={classes?.prompt}>{prompt}</div>}
      <div className={classes?.options}>
        {order.map((index) => {
          const locked = index < state.placed;
          return (
            <button
              key={index}
              type="button"
              className={classes?.option}
              data-state={locked ? "locked" : flashing === index ? "wrong" : "idle"}
              data-rank={locked ? String(index + 1) : undefined}
              disabled={locked}
              onClick={() => handleClick(index)}
            >
              {locked && <span className={classes?.rank}>{index + 1}. </span>}
              {items[index]}
            </button>
          );
        })}
      </div>
      {feedback !== null && (
        <p className={classes?.feedback} data-tone={lastOutcome === "wrong" ? "no" : "ok"} aria-live="polite">
          {feedback}
        </p>
      )}
    </div>
  );
}
