import { describe, it, expect } from "vitest";
import type { ProgressEvent } from "./progress";
import { isoWeekStart, goalProgress, parseGoalInput } from "./goals";

const at = (iso: string, e: Partial<ProgressEvent> = {}): ProgressEvent => ({
  userId: "t",
  courseSlug: "c1",
  sessionId: null,
  lessonFile: "a.html",
  kind: "lesson_completed",
  questionId: null,
  correct: null,
  attempts: null,
  answerText: null,
  score: null,
  criteria: null,
  sessionKind: null,
  createdAt: iso,
  ...e,
});

describe("isoWeekStart", () => {
  it("returns the Monday of the date's ISO week", () => {
    expect(isoWeekStart(new Date("2026-07-08T15:00:00Z"))).toBe("2026-07-06"); // Wed -> Mon
    expect(isoWeekStart(new Date("2026-07-06T00:00:00Z"))).toBe("2026-07-06"); // Mon -> itself
    expect(isoWeekStart(new Date("2026-07-12T23:59:59Z"))).toBe("2026-07-06"); // Sun -> prev Mon
  });
});

describe("goalProgress", () => {
  const events = [
    at("2026-07-05T10:00:00Z"), // Sunday before the week — out
    at("2026-07-06T10:00:00Z"),
    at("2026-07-07T10:00:00Z", { kind: "quiz_answered", questionId: "1" }),
    at("2026-07-07T11:00:00Z", { kind: "question_answered", questionId: "M01" }),
    at("2026-07-07T12:00:00Z", { kind: "lesson_viewed" }), // never counted
  ];

  it("counts lessons completed within the week for a lessons goal", () => {
    expect(goalProgress(events, "lessons", "2026-07-06")).toBe(1);
  });

  it("counts questions answered (Quiz + Bank) for a questions goal", () => {
    expect(goalProgress(events, "questions", "2026-07-06")).toBe(2);
  });
});

describe("parseGoalInput", () => {
  it("accepts a valid goal", () => {
    expect(parseGoalInput({ kind: "lessons", target: 5 })).toEqual({ kind: "lessons", target: 5 });
    expect(parseGoalInput({ kind: "questions", target: 40 })).toEqual({ kind: "questions", target: 40 });
  });

  it("rejects bad kinds and non-positive or absurd targets", () => {
    expect(parseGoalInput({ kind: "pushups", target: 5 })).toBeNull();
    expect(parseGoalInput({ kind: "lessons", target: 0 })).toBeNull();
    expect(parseGoalInput({ kind: "lessons", target: -2 })).toBeNull();
    expect(parseGoalInput({ kind: "lessons", target: 10001 })).toBeNull();
    expect(parseGoalInput({ kind: "lessons", target: 2.5 })).toBeNull();
    expect(parseGoalInput(null)).toBeNull();
  });
});
