import { describe, expect, it } from "vitest";
import {
  clickOption,
  clickOrderingItem,
  initialOrderingState,
  initialQuizState,
} from "../src/react/state.ts";

describe("quiz state machine (mirrors the legacy exercise.js grading)", () => {
  it("correct first click resolves with attempts=1", () => {
    const r = clickOption(initialQuizState(3), 1, 1);
    expect(r.state.status).toBe("correct");
    expect(r.answered).toEqual({ correct: true, attempts: 1 });
    expect(r.resolved).toBe(true);
  });

  it("wrong click flags only the clicked option and stays open", () => {
    const r = clickOption(initialQuizState(3), 0, 1);
    expect(r.state.status).toBe("open");
    expect(r.state.flagged).toEqual([true, false, false]);
    expect(r.answered).toEqual({ correct: false, attempts: 1 });
    expect(r.resolved).toBe(false);
  });

  it("second wrong click reveals the answer and resolves", () => {
    const first = clickOption(initialQuizState(3), 0, 1);
    const second = clickOption(first.state, 2, 1);
    expect(second.state.status).toBe("revealed");
    expect(second.answered).toEqual({ correct: false, attempts: 2 });
    expect(second.resolved).toBe(true);
  });

  it("wrong then correct resolves as correct with attempts=2", () => {
    const first = clickOption(initialQuizState(3), 0, 1);
    const second = clickOption(first.state, 1, 1);
    expect(second.state.status).toBe("correct");
    expect(second.answered).toEqual({ correct: true, attempts: 2 });
  });

  it("clicks on a flagged option or a resolved question are no-ops", () => {
    const first = clickOption(initialQuizState(3), 0, 1);
    const again = clickOption(first.state, 0, 1);
    expect(again.answered).toBeNull();
    expect(again.state).toBe(first.state);

    const done = clickOption(first.state, 1, 1);
    const after = clickOption(done.state, 2, 1);
    expect(after.answered).toBeNull();
  });
});

describe("ordering state machine", () => {
  it("locks items clicked in the correct sequence", () => {
    const s0 = initialOrderingState(3);
    const r1 = clickOrderingItem(s0, 0);
    expect(r1.outcome).toBe("locked");
    expect(r1.state.placed).toBe(1);
  });

  it("flags an out-of-order click without advancing", () => {
    const r = clickOrderingItem(initialOrderingState(3), 2);
    expect(r.outcome).toBe("wrong");
    expect(r.state.placed).toBe(0);
  });

  it("reports done on the final correct click", () => {
    let s = initialOrderingState(2);
    s = clickOrderingItem(s, 0).state;
    const last = clickOrderingItem(s, 1);
    expect(last.outcome).toBe("done");
    expect(last.state.placed).toBe(2);
  });

  it("ignores clicks on already-locked items", () => {
    const s = clickOrderingItem(initialOrderingState(3), 0).state;
    expect(clickOrderingItem(s, 0).outcome).toBe("noop");
  });
});
