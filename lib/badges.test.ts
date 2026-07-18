import { describe, it, expect } from "vitest";
import type { ProgressEvent } from "./progress";
import { computeBadges, longestStreak } from "./badges";

const at = (iso: string, e: Partial<ProgressEvent>): ProgressEvent => ({
  userId: "t",
  courseSlug: "c1",
  sessionId: null,
  lessonFile: null,
  kind: "lesson_viewed",
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

const TODAY = new Date("2026-07-08T12:00:00Z");
const byId = (badges: ReturnType<typeof computeBadges>) => Object.fromEntries(badges.map((b) => [b.id, b.earnedAt]));

describe("computeBadges", () => {
  it("returns every badge, locked ones with earnedAt null", () => {
    const b = computeBadges([], {}, {}, TODAY);
    expect(b.map((x) => x.id).sort()).toEqual(
      ["centurion", "first_exam", "first_lesson", "marksman", "perfect_exam", "scholar", "streak_30", "streak_7"].sort(),
    );
    expect(b.every((x) => x.earnedAt === null)).toBe(true);
    expect(b.every((x) => x.emoji.length > 0)).toBe(true);
  });

  it("First Lesson: earned at the first lesson_completed", () => {
    const events = [
      at("2026-07-01T10:00:00Z", { kind: "lesson_viewed", lessonFile: "a.html" }),
      at("2026-07-02T10:00:00Z", { kind: "lesson_completed", lessonFile: "a.html" }),
      at("2026-07-03T10:00:00Z", { kind: "lesson_completed", lessonFile: "b.html" }),
    ];
    expect(byId(computeBadges(events, {}, {}, TODAY)).first_lesson).toBe("2026-07-02T10:00:00Z");
  });

  it("First Exam: earned at the first finished exam Session", () => {
    const events = [
      at("2026-07-01T09:00:00Z", { kind: "session_started", sessionId: "s1", sessionKind: "exam" }),
      at("2026-07-01T10:00:00Z", { kind: "session_finished", sessionId: "s1", sessionKind: "exam" }),
    ];
    expect(byId(computeBadges(events, {}, {}, TODAY)).first_exam).toBe("2026-07-01T10:00:00Z");
  });

  it("Perfect Exam: a finished exam of ≥10 questions, all correct", () => {
    const tenRight = Array.from({ length: 10 }, (_, i) =>
      at(`2026-07-01T09:${String(i + 1).padStart(2, "0")}:00Z`, {
        kind: "question_answered",
        sessionId: "s1",
        sessionKind: "exam",
        questionId: `M${i}`,
        correct: true,
      }),
    );
    const events = [
      at("2026-07-01T09:00:00Z", { kind: "session_started", sessionId: "s1", sessionKind: "exam" }),
      ...tenRight,
      at("2026-07-01T09:30:00Z", { kind: "session_finished", sessionId: "s1", sessionKind: "exam" }),
    ];
    expect(byId(computeBadges(events, {}, {}, TODAY)).perfect_exam).toBe("2026-07-01T09:30:00Z");

    // one wrong answer spoils it
    const spoiled = events.map((e) => (e.questionId === "M3" ? { ...e, correct: false } : e));
    expect(byId(computeBadges(spoiled, {}, {}, TODAY)).perfect_exam).toBeNull();

    // 9 questions are not enough
    const nine = events.filter((e) => e.questionId !== "M9");
    expect(byId(computeBadges(nine, {}, {}, TODAY)).perfect_exam).toBeNull();
  });

  it("7-Day Streak: earned on the 7th consecutive active day", () => {
    const events = Array.from({ length: 8 }, (_, i) =>
      at(`2026-06-2${i + 1}T10:00:00Z`, { kind: "lesson_viewed" }),
    );
    const b = byId(computeBadges(events, {}, {}, TODAY));
    expect(b.streak_7).toBe("2026-06-27");
    expect(b.streak_30).toBeNull();
  });

  it("Centurion: the 100th answered question (Quiz + Bank alike)", () => {
    const events = Array.from({ length: 100 }, (_, i) =>
      at(`2026-07-01T${String(Math.floor(i / 60)).padStart(2, "0")}:${String(i % 60).padStart(2, "0")}:00Z`, {
        kind: i % 2 ? "quiz_answered" : "question_answered",
        lessonFile: i % 2 ? "a.html" : null,
        questionId: `q${i}`,
        correct: i % 3 === 0,
      }),
    );
    const b = byId(computeBadges(events, {}, {}, TODAY));
    expect(b.centurion).toBe(events[99].createdAt);
    expect(byId(computeBadges(events.slice(0, 99), {}, {}, TODAY)).centurion).toBeNull();
  });

  it("Scholar: every lesson of a course completed", () => {
    const events = [
      at("2026-07-01T10:00:00Z", { kind: "lesson_completed", lessonFile: "a.html" }),
      at("2026-07-02T10:00:00Z", { kind: "lesson_completed", lessonFile: "b.html" }),
    ];
    expect(byId(computeBadges(events, { c1: 2 }, {}, TODAY)).scholar).toBe("2026-07-02T10:00:00Z");
    expect(byId(computeBadges(events, { c1: 3 }, {}, TODAY)).scholar).toBeNull();
  });

  it("Marksman: ≥90% on a topic over ≥10 answers, earned at the qualifying answer", () => {
    const events = Array.from({ length: 10 }, (_, i) =>
      at(`2026-07-01T09:${String(i + 1).padStart(2, "0")}:00Z`, {
        kind: "question_answered",
        questionId: `M${i}`,
        correct: i !== 0, // 9/10 = 90%
      }),
    );
    const topics = { c1: Object.fromEntries(Array.from({ length: 10 }, (_, i) => [`M${i}`, "Erro"])) };
    expect(byId(computeBadges(events, {}, topics, TODAY)).marksman).toBe(events[9].createdAt);
    // 8/10 misses the bar
    const worse = events.map((e, i) => (i === 5 ? { ...e, correct: false } : e));
    expect(byId(computeBadges(worse, {}, topics, TODAY)).marksman).toBeNull();
  });
});

describe("longestStreak", () => {
  it("finds the longest run of consecutive active days, anywhere in history", () => {
    const days = ["2026-06-01", "2026-06-02", "2026-06-03", "2026-06-10", "2026-06-11"];
    const events = days.map((d) => at(`${d}T10:00:00Z`, {}));
    expect(longestStreak(events)).toBe(3);
  });

  it("is 0 with no events", () => {
    expect(longestStreak([])).toBe(0);
  });
});
