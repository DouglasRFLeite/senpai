import { describe, it, expect } from "vitest";
import type { ProgressEvent } from "./progress";
import { buildHeatmap } from "./heatmap";

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

const TODAY = new Date("2026-07-08T15:00:00Z"); // a Wednesday

describe("buildHeatmap", () => {
  it("covers the last 12 months in whole weeks, ending in today's week", () => {
    const h = buildHeatmap([], TODAY);
    const days = h.weeks.flat().filter((d) => d !== null);
    const last = days[days.length - 1]!;
    expect(last.date).toBe("2026-07-08");
    expect(h.weeks.length).toBeGreaterThanOrEqual(52);
    expect(h.weeks.length).toBeLessThanOrEqual(54);
    // each week column has 7 slots (nulls pad before start / after today)
    expect(h.weeks.every((w) => w.length === 7)).toBe(true);
  });

  it("counts lessons completed and questions answered — not views", () => {
    const events = [
      at("2026-07-08T09:00:00Z", { kind: "lesson_viewed" }), // ignored
      at("2026-07-08T10:00:00Z", { kind: "lesson_completed" }),
      at("2026-07-08T11:00:00Z", { kind: "quiz_answered", questionId: "1" }),
      at("2026-07-08T12:00:00Z", { kind: "question_answered", questionId: "M01" }),
    ];
    const h = buildHeatmap(events, TODAY);
    const today = h.weeks.flat().find((d) => d?.date === "2026-07-08")!;
    expect(today.count).toBe(3);
  });

  it("drops events older than the window", () => {
    const h = buildHeatmap([at("2024-01-01T10:00:00Z")], TODAY);
    expect(h.weeks.flat().every((d) => d === null || d.count === 0)).toBe(true);
  });

  it("scales levels 1..4 by intensity relative to the busiest day, 0 = idle", () => {
    const events = [
      ...Array.from({ length: 8 }, (_, i) => at(`2026-07-06T0${i}:00:00Z`)), // 8 = max
      ...Array.from({ length: 2 }, (_, i) => at(`2026-07-07T0${i}:00:00Z`)), // 2
    ];
    const h = buildHeatmap(events, TODAY);
    const day = (date: string) => h.weeks.flat().find((d) => d?.date === date)!;
    expect(day("2026-07-06").level).toBe(4);
    expect(day("2026-07-07").level).toBe(1);
    expect(day("2026-07-08").level).toBe(0);
  });
});
