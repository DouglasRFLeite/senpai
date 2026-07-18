import { describe, it, expect } from "vitest";
import type { BankQuestion } from "./bank";
import { buildDeck, current, answerMc, answerOpen, results, newSession, DEFAULT_OPEN_PASS } from "./session";

const mc = (id: string, topic = "T1"): BankQuestion => ({
  id,
  type: "mc",
  topic,
  source: null,
  stem: `stem ${id}`,
  options: ["a", "b", "c"],
  correctIndex: 1,
  explanation: "why",
});

const open = (id: string, topic = "T2"): BankQuestion => ({
  id,
  type: "open",
  topic,
  source: null,
  stem: `stem ${id}`,
  modelAnswer: "expected",
  criteria: ["c1", "c2"],
  explanation: null,
});

const bank: BankQuestion[] = [open("A01"), mc("M01"), open("A02", "T1"), mc("M02", "T2"), mc("M03")];

// Deterministic rng: cycles through a fixed sequence.
const seq = (...vals: number[]) => {
  let i = 0;
  return () => vals[i++ % vals.length];
};

describe("buildDeck", () => {
  it("exam: whole bank, every MC before every Open", () => {
    const deck = buildDeck(bank, { mode: "exam", rng: seq(0.9, 0.1, 0.5) });
    expect(deck).toHaveLength(5);
    const types = deck.map((q) => q.type);
    expect(types.lastIndexOf("mc")).toBeLessThan(types.indexOf("open"));
    expect(new Set(deck.map((q) => q.id)).size).toBe(5);
  });

  it("practice: N random, mixed types allowed", () => {
    const deck = buildDeck(bank, { mode: "practice", n: 3, rng: seq(0.2, 0.7, 0.4) });
    expect(deck).toHaveLength(3);
    expect(new Set(deck.map((q) => q.id)).size).toBe(3);
  });

  it("topic: every question of the topic, shuffled", () => {
    const deck = buildDeck(bank, { mode: "topic", topic: "T1", rng: seq(0.3) });
    expect(deck.map((q) => q.id).sort()).toEqual(["A02", "M01", "M03"]);
  });
});

describe("session state", () => {
  it("walks the deck: current advances as answers land, null at the end", () => {
    let s = newSession("sid-1", "exam", buildDeck(bank, { mode: "exam", rng: seq(0.5) }));
    expect(current(s)?.type).toBe("mc");
    while (current(s)) {
      const q = current(s)!;
      s =
        q.type === "mc"
          ? answerMc(s, 1)
          : answerOpen(s, { answerText: "x", score: 1, criteriaMarks: q.criteria.map((c) => ({ criterion: c, met: true })), selfAssessed: false });
    }
    expect(current(s)).toBeNull();
    expect(s.outcomes).toHaveLength(5);
  });

  it("answerMc records the choice and grades single-attempt", () => {
    let s = newSession("sid", "practice", [mc("M01")]);
    s = answerMc(s, 2);
    expect(s.outcomes[0]).toMatchObject({ questionId: "M01", type: "mc", chosenIndex: 2, correct: false });
  });

  it("answerOpen passes at the threshold, fails below it", () => {
    const q = open("A01");
    let s = newSession("sid", "practice", [q, open("A02")]);
    s = answerOpen(s, { answerText: "boa", score: 0.6, criteriaMarks: [], selfAssessed: false });
    s = answerOpen(s, { answerText: "ruim", score: 0.5, criteriaMarks: [], selfAssessed: true });
    expect(s.outcomes[0]).toMatchObject({ passed: true, selfAssessed: false });
    expect(s.outcomes[1]).toMatchObject({ passed: false, selfAssessed: true });
  });

  it("honors a custom pass threshold", () => {
    let s = newSession("sid", "practice", [open("A01")], 0.8);
    s = answerOpen(s, { answerText: "x", score: 0.7, criteriaMarks: [], selfAssessed: false });
    expect(s.outcomes[0]).toMatchObject({ passed: false });
    expect(DEFAULT_OPEN_PASS).toBe(0.6);
  });
});

describe("results", () => {
  it("summarizes totals by type, score and struggle spots", () => {
    let s = newSession("sid", "exam", [mc("M01"), mc("M02"), open("A01")]);
    s = answerMc(s, 1); // correct
    s = answerMc(s, 0); // wrong
    s = answerOpen(s, {
      answerText: "meh",
      score: 0.5,
      criteriaMarks: [
        { criterion: "c1", met: true },
        { criterion: "c2", met: false },
      ],
      selfAssessed: false,
    }); // failed
    const r = results(s);
    expect(r.mc).toEqual({ correct: 1, total: 2 });
    expect(r.open).toEqual({ passed: 0, total: 1 });
    expect(r.answered).toBe(3);
    expect(r.scorePct).toBe(33);
    expect(r.struggles.map((o) => o.questionId)).toEqual(["M02", "A01"]);
  });

  it("mid-session results only count answered questions", () => {
    let s = newSession("sid", "practice", [mc("M01"), open("A01")]);
    s = answerMc(s, 1);
    const r = results(s);
    expect(r.answered).toBe(1);
    expect(r.total).toBe(2);
    expect(r.scorePct).toBe(100);
  });
});
