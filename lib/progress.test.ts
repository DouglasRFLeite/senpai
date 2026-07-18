import { describe, it, expect } from "vitest";
import { aggregate, type ProgressEvent } from "./progress";

const at = (iso: string, e: Partial<ProgressEvent>): ProgressEvent => ({
  userId: "maya",
  courseSlug: "web3",
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

describe("aggregate", () => {
  const totals = { web3: 2, espresso: 1 };

  it("computes per-course completion from lesson_completed events", () => {
    const events = [
      at("2026-07-01T10:00:00Z", { kind: "lesson_viewed", lessonFile: "0001.html" }),
      at("2026-07-01T10:05:00Z", { kind: "lesson_completed", lessonFile: "0001.html" }),
    ];
    const r = aggregate(events, totals, new Date("2026-07-01T12:00:00Z"));
    expect(r.courses.web3.lessonsCompleted).toBe(1);
    expect(r.courses.web3.lessonsTotal).toBe(2);
    expect(r.courses.web3.completionPct).toBe(50);
    expect(r.courses.web3.lessons["0001.html"]).toEqual({
      viewed: true,
      completed: true,
      completedAt: "2026-07-01T10:05:00Z",
    });
  });

  it("awards XP: 15 per completed lesson + 3 per distinct correct question", () => {
    const events = [
      at("2026-07-01T10:05:00Z", { kind: "lesson_completed", lessonFile: "0001.html" }),
      at("2026-07-01T10:04:00Z", { kind: "quiz_answered", lessonFile: "0001.html", questionId: "1", correct: true, attempts: 1 }),
      at("2026-07-01T10:04:30Z", { kind: "quiz_answered", lessonFile: "0001.html", questionId: "2", correct: true, attempts: 2 }),
    ];
    const r = aggregate(events, totals, new Date("2026-07-01T12:00:00Z"));
    expect(r.courses.web3.xp).toBe(15 + 3 + 3);
    expect(r.totalXp).toBe(21);
  });

  it("summarizes a question's attempts and whether it was ever correct", () => {
    const events = [
      at("2026-07-01T10:00:00Z", { kind: "quiz_answered", lessonFile: "0001.html", questionId: "1", correct: false, attempts: 1 }),
      at("2026-07-01T10:00:10Z", { kind: "quiz_answered", lessonFile: "0001.html", questionId: "1", correct: true, attempts: 2 }),
    ];
    const q = aggregate(events, totals, new Date("2026-07-01T12:00:00Z")).courses.web3.questions[0];
    expect(q).toMatchObject({ questionId: "1", lessonFile: "0001.html", correct: true, attempts: 2, wrongAttempts: 1 });
  });

  it("counts a daily streak of consecutive active days ending today", () => {
    const events = [
      at("2026-06-29T09:00:00Z", { kind: "lesson_viewed" }),
      at("2026-06-30T09:00:00Z", { kind: "lesson_viewed" }),
      at("2026-07-01T09:00:00Z", { kind: "lesson_viewed" }),
    ];
    expect(aggregate(events, totals, new Date("2026-07-01T20:00:00Z")).streakDays).toBe(3);
  });

  it("gives a one-day grace: a streak ending yesterday still counts today", () => {
    const events = [at("2026-06-30T09:00:00Z", { kind: "lesson_viewed" })];
    expect(aggregate(events, totals, new Date("2026-07-01T20:00:00Z")).streakDays).toBe(1);
  });

  it("breaks the streak when a day is missed", () => {
    const events = [
      at("2026-06-28T09:00:00Z", { kind: "lesson_viewed" }),
      at("2026-07-01T09:00:00Z", { kind: "lesson_viewed" }),
    ];
    expect(aggregate(events, totals, new Date("2026-07-01T20:00:00Z")).streakDays).toBe(1);
  });

  it("keeps courses separate and reports 0% for an untouched course", () => {
    const events = [at("2026-07-01T10:00:00Z", { courseSlug: "web3", kind: "lesson_completed", lessonFile: "0001.html" })];
    const r = aggregate(events, totals, new Date("2026-07-01T12:00:00Z"));
    expect(r.courses.espresso.completionPct).toBe(0);
    expect(r.courses.espresso.xp).toBe(0);
  });

  // Senpai extensions

  it("flags a struggle spot when a question was never answered correctly", () => {
    const events = [
      at("2026-07-01T10:00:00Z", { kind: "quiz_answered", lessonFile: "0001.html", questionId: "1", correct: false, attempts: 1 }),
      at("2026-07-01T10:00:10Z", { kind: "quiz_answered", lessonFile: "0001.html", questionId: "1", correct: false, attempts: 2 }),
    ];
    const q = aggregate(events, totals, new Date("2026-07-01T12:00:00Z")).courses.web3.questions[0];
    expect(q.struggling).toBe(true);
  });

  it("flags a struggle spot when the last attempt was wrong even if once correct", () => {
    const events = [
      at("2026-07-01T10:00:00Z", { kind: "quiz_answered", lessonFile: "0001.html", questionId: "1", correct: true, attempts: 1 }),
      at("2026-07-02T10:00:00Z", { kind: "quiz_answered", lessonFile: "0001.html", questionId: "1", correct: false, attempts: 1 }),
    ];
    const q = aggregate(events, totals, new Date("2026-07-02T12:00:00Z")).courses.web3.questions[0];
    expect(q.correct).toBe(true);
    expect(q.struggling).toBe(true);
  });

  it("does not flag a question answered correctly on the last attempt", () => {
    const events = [
      at("2026-07-01T10:00:00Z", { kind: "quiz_answered", lessonFile: "0001.html", questionId: "1", correct: false, attempts: 1 }),
      at("2026-07-01T10:00:10Z", { kind: "quiz_answered", lessonFile: "0001.html", questionId: "1", correct: true, attempts: 2 }),
    ];
    const q = aggregate(events, totals, new Date("2026-07-01T12:00:00Z")).courses.web3.questions[0];
    expect(q.struggling).toBe(false);
  });

  it("counts daily activity per day for the heatmap feed", () => {
    const events = [
      at("2026-06-30T09:00:00Z", { kind: "lesson_viewed", lessonFile: "0001.html" }),
      at("2026-06-30T10:00:00Z", { kind: "quiz_answered", lessonFile: "0001.html", questionId: "1", correct: true, attempts: 1 }),
      at("2026-07-01T09:00:00Z", { kind: "lesson_viewed", lessonFile: "0002.html" }),
    ];
    const r = aggregate(events, totals, new Date("2026-07-01T12:00:00Z"));
    expect(r.dailyActivity).toEqual({ "2026-06-30": 2, "2026-07-01": 1 });
  });

  it("builds a per-Session history from session/question events", () => {
    const events = [
      at("2026-07-01T09:00:00Z", { kind: "session_started", sessionId: "s1", sessionKind: "exam" }),
      at("2026-07-01T09:01:00Z", { kind: "question_answered", sessionId: "s1", questionId: "M01", correct: true, sessionKind: "exam" }),
      at("2026-07-01T09:02:00Z", { kind: "question_answered", sessionId: "s1", questionId: "M02", correct: false, sessionKind: "exam" }),
      at("2026-07-01T09:03:00Z", { kind: "question_answered", sessionId: "s1", questionId: "A01", correct: true, answerText: "boa", sessionKind: "exam" }),
      at("2026-07-01T09:03:01Z", { kind: "question_graded", sessionId: "s1", questionId: "A01", score: 0.7, criteria: { marks: [{ criterion: "c1", met: true }] } }),
      at("2026-07-01T09:04:00Z", { kind: "session_finished", sessionId: "s1", sessionKind: "exam" }),
      at("2026-07-02T10:00:00Z", { kind: "session_started", sessionId: "s2", sessionKind: "topic" }),
      at("2026-07-02T10:01:00Z", { kind: "question_answered", sessionId: "s2", questionId: "M01", correct: false, sessionKind: "topic" }),
    ];
    const r = aggregate(events, totals, new Date("2026-07-02T12:00:00Z"));
    const sessions = r.courses.web3.sessions;
    expect(sessions).toHaveLength(2);
    expect(sessions[0]).toMatchObject({
      sessionId: "s1",
      kind: "exam",
      startedAt: "2026-07-01T09:00:00Z",
      finishedAt: "2026-07-01T09:04:00Z",
      answered: 3,
      correct: 2,
      scorePct: 67,
    });
    expect(sessions[1]).toMatchObject({ sessionId: "s2", finishedAt: null, answered: 1, correct: 0 });
  });

  it("computes per-topic accuracy when given the bank's question→topic map", () => {
    const events = [
      at("2026-07-01T09:01:00Z", { kind: "question_answered", sessionId: "s1", questionId: "M01", correct: true }),
      at("2026-07-01T09:02:00Z", { kind: "question_answered", sessionId: "s1", questionId: "M02", correct: false }),
      at("2026-07-01T09:03:00Z", { kind: "question_answered", sessionId: "s1", questionId: "A01", correct: true }),
    ];
    const topics = { web3: { M01: "Erro", M02: "Erro", A01: "Iter" } };
    const r = aggregate(events, totals, new Date("2026-07-01T12:00:00Z"), topics);
    expect(r.courses.web3.topicAccuracy).toEqual({
      Erro: { correct: 1, total: 2 },
      Iter: { correct: 1, total: 1 },
    });
  });

  it("tracks bank questions: last outcome wins, missed criteria and answer kept for reteaching", () => {
    const events = [
      at("2026-07-01T09:00:00Z", { kind: "question_answered", sessionId: "s1", questionId: "A01", correct: false, answerText: "primeira tentativa" }),
      at("2026-07-01T09:00:01Z", {
        kind: "question_graded",
        sessionId: "s1",
        questionId: "A01",
        score: 0.3,
        criteria: { marks: [{ criterion: "c1", met: true }, { criterion: "c2", met: false }], selfAssessed: true },
      }),
    ];
    const r = aggregate(events, totals, new Date("2026-07-01T12:00:00Z"), { web3: { A01: "Erro" } });
    const q = r.courses.web3.bankQuestions[0];
    expect(q).toMatchObject({
      questionId: "A01",
      topic: "Erro",
      correct: false,
      struggling: true,
      answerText: "primeira tentativa",
      missedCriteria: ["c2"],
      selfAssessed: true,
    });
  });

  it("clears a bank struggle once the last attempt is correct", () => {
    const events = [
      at("2026-07-01T09:00:00Z", { kind: "question_answered", questionId: "M01", correct: false }),
      at("2026-07-02T09:00:00Z", { kind: "question_answered", questionId: "M01", correct: true }),
    ];
    const q = aggregate(events, totals, new Date("2026-07-02T12:00:00Z")).courses.web3.bankQuestions[0];
    expect(q).toMatchObject({ correct: true, struggling: false, attempts: 2 });
  });

  it("awards 3 XP per distinct correct bank question — MC and passed Open alike", () => {
    const events = [
      at("2026-07-01T09:01:00Z", { kind: "question_answered", questionId: "M01", correct: true }),
      at("2026-07-01T09:02:00Z", { kind: "question_answered", questionId: "M01", correct: true }), // same question again
      at("2026-07-01T09:03:00Z", { kind: "question_answered", questionId: "A01", correct: true }),
      at("2026-07-01T09:04:00Z", { kind: "question_answered", questionId: "M02", correct: false }),
    ];
    const r = aggregate(events, totals, new Date("2026-07-01T12:00:00Z"));
    expect(r.courses.web3.xp).toBe(6);
  });

  it("accepts Session-era kinds without breaking lesson aggregation", () => {
    // Phase 3 adds real handling; today they must count as activity, no more.
    const events = [
      at("2026-07-01T09:00:00Z", { kind: "session_started", sessionId: "s1", sessionKind: "exam" }),
      at("2026-07-01T09:10:00Z", {
        kind: "question_graded",
        sessionId: "s1",
        questionId: "A01",
        answerText: "…",
        score: 0.75,
        criteria: { marks: [{ criterion: "cites the rule", met: true }] },
      }),
      at("2026-07-01T09:20:00Z", { kind: "session_finished", sessionId: "s1", sessionKind: "exam" }),
    ];
    const r = aggregate(events, totals, new Date("2026-07-01T12:00:00Z"));
    expect(r.courses.web3.lessonsCompleted).toBe(0);
    expect(r.courses.web3.questions).toEqual([]);
    expect(r.dailyActivity["2026-07-01"]).toBe(3);
    expect(r.streakDays).toBe(1);
  });
});
