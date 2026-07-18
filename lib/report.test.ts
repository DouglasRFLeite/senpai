import { describe, it, expect } from "vitest";
import { buildReport } from "./report";
import type { CourseProgress } from "./progress";

const progress: CourseProgress = {
  slug: "espresso",
  lessonsTotal: 3,
  lessonsCompleted: 1,
  completionPct: 33,
  xp: 24,
  lastActive: "2026-07-02T10:00:00Z",
  lessons: {
    "0001-grind.html": { viewed: true, completed: true, completedAt: "2026-07-01T10:05:00Z" },
    "0002-extraction.html": { viewed: true, completed: false, completedAt: null },
  },
  questions: [
    { questionId: "1", lessonFile: "0001-grind.html", correct: true, attempts: 1, wrongAttempts: 0, struggling: false },
    { questionId: "2", lessonFile: "0002-extraction.html", correct: false, attempts: 3, wrongAttempts: 3, struggling: true },
  ],
  sessions: [
    {
      sessionId: "s1",
      kind: "exam",
      startedAt: "2026-07-01T09:00:00Z",
      finishedAt: "2026-07-01T10:00:00Z",
      answered: 80,
      correct: 60,
      scorePct: 75,
    },
    {
      sessionId: "s2",
      kind: "topic",
      startedAt: "2026-07-02T09:00:00Z",
      finishedAt: null,
      answered: 3,
      correct: 1,
      scorePct: 33,
    },
  ],
  topicAccuracy: {
    "Grind & dose": { correct: 9, total: 10 },
    Extraction: { correct: 2, total: 6 },
  },
  bankQuestions: [
    { questionId: "M01", topic: "Grind & dose", correct: true, attempts: 1, struggling: false, answerText: null, missedCriteria: [], selfAssessed: false },
    {
      questionId: "A01",
      topic: "Extraction",
      correct: false,
      attempts: 2,
      struggling: true,
      answerText: "I thought a finer grind always makes the shot pour faster.",
      missedCriteria: ["Identifies that a finer grind slows the flow", "Distinguishes grind size from dose"],
      selfAssessed: true,
    },
  ],
};

const input = {
  courseTitle: "Espresso Fundamentals",
  courseSlug: "espresso",
  lessons: [
    { file: "0001-grind.html", title: "Dialing In the Grinder" },
    { file: "0002-extraction.html", title: "Reading the Extraction" },
    { file: "0003-theory.html", title: "How Extraction Works" },
  ],
  progress,
  streakDays: 4,
  generatedAt: new Date("2026-07-02T12:00:00Z"),
};

describe("buildReport", () => {
  it("headlines the course and summarizes completion, XP, and streak", () => {
    const md = buildReport(input);
    expect(md).toContain("# Progress report — Espresso Fundamentals");
    expect(md).toContain("33% (1/3 lessons)");
    expect(md).toContain("24 XP");
    expect(md).toContain("4-day streak");
  });

  it("checks off completed lessons and leaves the rest unchecked", () => {
    const md = buildReport(input);
    expect(md).toContain("- [x] Dialing In the Grinder");
    expect(md).toContain("- [ ] Reading the Extraction");
    expect(md).toContain("- [ ] How Extraction Works"); // untouched lesson still listed
  });

  it("calls out quiz struggle spots — questions not yet answered correctly", () => {
    const md = buildReport(input);
    expect(md).toMatch(/Struggle spots[\s\S]*Reading the Extraction.*Q2/);
    expect(md).toMatch(/3 wrong/);
  });

  it("lists Session history with kind, score and abandonment", () => {
    const md = buildReport(input);
    expect(md).toMatch(/## Sessions[\s\S]*exam.*2026-07-01.*75%.*80 answered/);
    expect(md).toMatch(/topic.*2026-07-02.*33%.*abandoned/);
  });

  it("tabulates per-topic accuracy", () => {
    const md = buildReport(input);
    expect(md).toMatch(/## Topic accuracy[\s\S]*Grind & dose: 9\/10 \(90%\)/);
    expect(md).toContain("Extraction: 2/6 (33%)");
  });

  it("surfaces bank struggle spots with the learner's own answer and missed criteria", () => {
    const md = buildReport(input);
    expect(md).toMatch(/### Bank struggle spots[\s\S]*A01/);
    expect(md).toContain("I thought a finer grind always makes the shot pour faster.");
    expect(md).toContain("Identifies that a finer grind slows the flow");
    expect(md).toContain("self-assessed");
    expect(md).not.toMatch(/Bank struggle spots[\s\S]*M01/); // healthy question stays out
  });

  it("includes the learner's comment, or notes when there is none", () => {
    expect(buildReport({ ...input, comment: "The extraction lesson confused me." })).toContain(
      "The extraction lesson confused me.",
    );
    expect(buildReport(input)).toMatch(/Notes for your teacher[\s\S]*_None\._/);
  });

  it("omits Session and Bank sections for a course without Bank activity", () => {
    const md = buildReport({
      ...input,
      progress: { ...progress, sessions: [], topicAccuracy: {}, bankQuestions: [] },
    });
    expect(md).not.toContain("## Sessions");
    expect(md).not.toContain("## Topic accuracy");
    expect(md).not.toContain("### Bank struggle spots");
  });
});
