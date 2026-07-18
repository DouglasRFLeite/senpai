import { describe, it, expect } from "vitest";
import { parseEvent } from "./events";

describe("parseEvent", () => {
  it("accepts a well-formed quiz_answered event and normalizes optionals", () => {
    const e = parseEvent({
      userId: "maya",
      courseSlug: "espresso",
      lessonFile: "0001-the-ratio.html",
      kind: "quiz_answered",
      questionId: "2",
      correct: false,
      attempts: 1,
    });
    expect(e).toMatchObject({
      userId: "maya",
      courseSlug: "espresso",
      lessonFile: "0001-the-ratio.html",
      kind: "quiz_answered",
      questionId: "2",
      correct: false,
      attempts: 1,
    });
  });

  it("accepts a lesson_viewed with only user + course + lesson, filling nulls", () => {
    const e = parseEvent({ userId: "leo", courseSlug: "espresso", lessonFile: "0001.html", kind: "lesson_viewed" });
    expect(e).toEqual({
      userId: "leo",
      courseSlug: "espresso",
      sessionId: null,
      lessonFile: "0001.html",
      kind: "lesson_viewed",
      questionId: null,
      correct: null,
      attempts: null,
      answerText: null,
      score: null,
      criteria: null,
      sessionKind: null,
    });
  });

  it("normalizes the userId with the shared rule", () => {
    const e = parseEvent({ userId: "  Maya Ç! ", courseSlug: "espresso", kind: "lesson_viewed" });
    expect(e?.userId).toBe("mayac");
  });

  it("rejects a missing or unnormalizable userId", () => {
    expect(parseEvent({ courseSlug: "espresso", kind: "lesson_viewed" })).toBeNull();
    expect(parseEvent({ userId: "!!!", courseSlug: "espresso", kind: "lesson_viewed" })).toBeNull();
  });

  it("rejects unknown kinds", () => {
    expect(parseEvent({ userId: "t", courseSlug: "x", kind: "hacked" })).toBeNull();
  });

  it("rejects a missing courseSlug", () => {
    expect(parseEvent({ userId: "t", kind: "lesson_viewed" })).toBeNull();
  });

  it("rejects a non-object body", () => {
    expect(parseEvent(null)).toBeNull();
    expect(parseEvent("nope")).toBeNull();
  });

  it("clamps a nonsense slug length to keep the store tidy", () => {
    expect(parseEvent({ userId: "t", courseSlug: "a".repeat(500), kind: "lesson_viewed" })).toBeNull();
  });

  it("accepts a Session-era question_graded event with score and criteria", () => {
    const e = parseEvent({
      userId: "maya",
      courseSlug: "espresso",
      sessionId: "3f2c8a4e",
      kind: "question_graded",
      questionId: "A01",
      correct: true,
      answerText: "A fast sour shot means under-extraction…",
      score: 0.75,
      criteria: { marks: [{ criterion: "cites the rule", met: true }], selfAssessed: false },
      sessionKind: "exam",
    });
    expect(e).toMatchObject({
      sessionId: "3f2c8a4e",
      kind: "question_graded",
      score: 0.75,
      criteria: { marks: [{ criterion: "cites the rule", met: true }], selfAssessed: false },
      sessionKind: "exam",
    });
  });

  it("clamps score into [0,1] and rejects non-finite scores", () => {
    expect(parseEvent({ userId: "t", courseSlug: "x", kind: "question_graded", score: 1.7 })?.score).toBe(1);
    expect(parseEvent({ userId: "t", courseSlug: "x", kind: "question_graded", score: -2 })?.score).toBe(0);
    expect(parseEvent({ userId: "t", courseSlug: "x", kind: "question_graded", score: NaN })?.score).toBeNull();
  });

  it("nulls malformed criteria rather than storing junk", () => {
    expect(parseEvent({ userId: "t", courseSlug: "x", kind: "question_graded", criteria: "junk" })?.criteria).toBeNull();
    expect(parseEvent({ userId: "t", courseSlug: "x", kind: "question_graded", criteria: { marks: [{ criterion: 1, met: "yes" }] } })?.criteria).toBeNull();
  });

  it("rejects an unknown sessionKind but keeps a valid one", () => {
    expect(parseEvent({ userId: "t", courseSlug: "x", kind: "session_started", sessionKind: "marathon" })?.sessionKind).toBeNull();
    expect(parseEvent({ userId: "t", courseSlug: "x", kind: "session_started", sessionKind: "practice" })?.sessionKind).toBe("practice");
  });
});
