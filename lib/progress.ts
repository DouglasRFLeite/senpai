/**
 * Pure progress aggregation.
 * Turns one Learner's event log into the per-course summary the UI consumes.
 * No DB, no I/O — fully unit-tested. Callers filter events by Learner first;
 * this module never sees more than one user's history.
 */

export type EventKind =
  | "lesson_viewed"
  | "lesson_completed"
  | "quiz_answered"
  | "session_started"
  | "session_finished"
  | "question_answered"
  | "question_graded";

export type SessionKind = "exam" | "practice" | "topic";

export interface CriterionMark {
  criterion: string;
  met: boolean;
}

/** Grader output stored on question_graded events (`criteria` JSONB). */
export interface CriteriaResult {
  marks: CriterionMark[];
  selfAssessed?: boolean;
}

export interface ProgressEvent {
  userId: string;
  courseSlug: string;
  sessionId: string | null;
  lessonFile: string | null;
  kind: EventKind;
  questionId: string | null;
  correct: boolean | null;
  attempts: number | null;
  answerText: string | null;
  score: number | null;
  criteria: CriteriaResult | null;
  sessionKind: SessionKind | null;
  createdAt: string; // ISO 8601
}

export interface QuestionResult {
  questionId: string;
  lessonFile: string;
  correct: boolean;
  attempts: number;
  wrongAttempts: number;
  /** Struggle spot: never answered correctly, or wrong on the last attempt. */
  struggling: boolean;
}

/** One Session as the history list shows it. */
export interface SessionSummary {
  sessionId: string;
  kind: SessionKind | null;
  startedAt: string;
  finishedAt: string | null;
  answered: number;
  /** Correct MC + passed Open. */
  correct: number;
  scorePct: number;
}

/** One Bank Question's standing for a Learner (Sessions layer, not the Quiz layer). */
export interface BankQuestionResult {
  questionId: string;
  topic: string | null;
  /** Last attempt's outcome. */
  correct: boolean;
  attempts: number;
  /** Never correct, or wrong on the last attempt. */
  struggling: boolean;
  /** Last Open answer — the reteaching signal. */
  answerText: string | null;
  /** Criteria missed on the last grading. */
  missedCriteria: string[];
  selfAssessed: boolean;
}

export interface CourseProgress {
  slug: string;
  lessonsTotal: number;
  lessonsCompleted: number;
  completionPct: number;
  xp: number;
  lastActive: string | null;
  lessons: Record<string, { viewed: boolean; completed: boolean; completedAt: string | null }>;
  questions: QuestionResult[];
  sessions: SessionSummary[];
  topicAccuracy: Record<string, { correct: number; total: number }>;
  bankQuestions: BankQuestionResult[];
}

export interface ProgressSummary {
  courses: Record<string, CourseProgress>;
  totalXp: number;
  streakDays: number;
  lastActive: string | null;
  /** Event counts per UTC day (YYYY-MM-DD) — the dashboard heatmap feed. */
  dailyActivity: Record<string, number>;
}

const XP_PER_LESSON = 15;
const XP_PER_CORRECT = 3;

const dayKey = (iso: string | Date): string =>
  (typeof iso === "string" ? new Date(iso) : iso).toISOString().slice(0, 10);

export function aggregate(
  events: ProgressEvent[],
  lessonTotals: Record<string, number>,
  today: Date = new Date(),
  /** Per course: Bank question id → topic (from lib/bank; events don't carry topics). */
  bankTopics: Record<string, Record<string, string>> = {},
): ProgressSummary {
  const courses: Record<string, CourseProgress> = {};
  const ensure = (slug: string): CourseProgress =>
    (courses[slug] ??= {
      slug,
      lessonsTotal: lessonTotals[slug] ?? 0,
      lessonsCompleted: 0,
      completionPct: 0,
      xp: 0,
      lastActive: null,
      lessons: {},
      questions: [],
      sessions: [],
      topicAccuracy: {},
      bankQuestions: [],
    });

  // Seed every known course so untouched ones report 0 rather than vanish.
  for (const slug of Object.keys(lessonTotals)) ensure(slug);

  // Group question events by course + lesson + question for retry summaries.
  const qKey = (e: ProgressEvent) => `${e.courseSlug} ${e.lessonFile} ${e.questionId}`;
  const questionEvents = new Map<string, ProgressEvent[]>();
  const sessionEvents = new Map<string, { events: ProgressEvent[] }>();
  const bankEvents = new Map<string, ProgressEvent[]>();
  const dailyActivity: Record<string, number> = {};

  for (const e of events) {
    const c = ensure(e.courseSlug);
    if (!c.lastActive || e.createdAt > c.lastActive) c.lastActive = e.createdAt;
    const day = dayKey(e.createdAt);
    dailyActivity[day] = (dailyActivity[day] ?? 0) + 1;

    if (e.lessonFile && (e.kind === "lesson_viewed" || e.kind === "lesson_completed")) {
      const l = (c.lessons[e.lessonFile] ??= { viewed: false, completed: false, completedAt: null });
      if (e.kind === "lesson_viewed") l.viewed = true;
      if (e.kind === "lesson_completed") {
        l.viewed = true;
        l.completed = true;
        if (!l.completedAt || e.createdAt < l.completedAt) l.completedAt = e.createdAt;
      }
    }

    if (e.kind === "quiz_answered" && e.lessonFile && e.questionId) {
      const arr = questionEvents.get(qKey(e)) ?? [];
      arr.push(e);
      questionEvents.set(qKey(e), arr);
    }

    if (e.sessionId && (e.kind === "session_started" || e.kind === "session_finished" || e.kind === "question_answered")) {
      const key = `${e.courseSlug} ${e.sessionId}`;
      const s = (sessionEvents.get(key) ?? { events: [] as ProgressEvent[] });
      s.events.push(e);
      sessionEvents.set(key, s);
    }

    if ((e.kind === "question_answered" || e.kind === "question_graded") && e.questionId) {
      const key = `${e.courseSlug} ${e.questionId}`;
      const arr = bankEvents.get(key) ?? [];
      arr.push(e);
      bankEvents.set(key, arr);
    }
  }

  for (const [, evs] of questionEvents) {
    evs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const first = evs[0];
    const c = ensure(first.courseSlug);
    const everCorrect = evs.some((e) => e.correct === true);
    const lastCorrect = evs[evs.length - 1].correct === true;
    c.questions.push({
      questionId: first.questionId!,
      lessonFile: first.lessonFile!,
      correct: everCorrect,
      attempts: Math.max(evs.length, ...evs.map((e) => e.attempts ?? 0)),
      wrongAttempts: evs.filter((e) => e.correct === false).length,
      struggling: !everCorrect || !lastCorrect,
    });
  }

  // Session history: one summary per session_id, ordered by start.
  for (const [key, { events: evs }] of sessionEvents) {
    const slug = key.slice(0, key.lastIndexOf(" "));
    const c = ensure(slug);
    evs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const answeredEvs = evs.filter((e) => e.kind === "question_answered");
    const answered = answeredEvs.length;
    const correct = answeredEvs.filter((e) => e.correct === true).length;
    c.sessions.push({
      sessionId: evs[0].sessionId!,
      kind: evs.find((e) => e.sessionKind)?.sessionKind ?? null,
      startedAt: (evs.find((e) => e.kind === "session_started") ?? evs[0]).createdAt,
      finishedAt: evs.find((e) => e.kind === "session_finished")?.createdAt ?? null,
      answered,
      correct,
      scorePct: answered === 0 ? 0 : Math.round((100 * correct) / answered),
    });
  }
  for (const c of Object.values(courses)) c.sessions.sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  // Bank question standing + per-topic accuracy (topics come from the bank map).
  for (const [key, evs] of bankEvents) {
    const slug = key.slice(0, key.lastIndexOf(" "));
    const questionId = key.slice(key.lastIndexOf(" ") + 1);
    const c = ensure(slug);
    evs.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const answeredEvs = evs.filter((e) => e.kind === "question_answered");
    if (answeredEvs.length === 0) continue;
    const topic = bankTopics[slug]?.[questionId] ?? null;
    const everCorrect = answeredEvs.some((e) => e.correct === true);
    const lastCorrect = answeredEvs[answeredEvs.length - 1].correct === true;
    const lastGraded = [...evs].reverse().find((e) => e.kind === "question_graded" && e.criteria);
    const lastAnswerText = [...answeredEvs].reverse().find((e) => e.answerText)?.answerText ?? null;
    c.bankQuestions.push({
      questionId,
      topic,
      correct: lastCorrect,
      attempts: answeredEvs.length,
      struggling: !everCorrect || !lastCorrect,
      answerText: lastAnswerText,
      missedCriteria: lastGraded?.criteria?.marks.filter((m) => !m.met).map((m) => m.criterion) ?? [],
      selfAssessed: lastGraded?.criteria?.selfAssessed === true,
    });
    if (topic) {
      const t = (c.topicAccuracy[topic] ??= { correct: 0, total: 0 });
      for (const e of answeredEvs) {
        t.total++;
        if (e.correct === true) t.correct++;
      }
    }
  }
  for (const c of Object.values(courses)) c.bankQuestions.sort((a, b) => a.questionId.localeCompare(b.questionId));

  let totalXp = 0;
  let lastActive: string | null = null;
  for (const c of Object.values(courses)) {
    c.lessonsCompleted = Object.values(c.lessons).filter((l) => l.completed).length;
    c.completionPct = c.lessonsTotal > 0 ? Math.round((c.lessonsCompleted / c.lessonsTotal) * 100) : 0;
    const correctQuestions = c.questions.filter((q) => q.correct).length;
    // 3 XP per distinct correct answer — Quiz items, MC, and passed Open alike.
    const correctBank = c.bankQuestions.filter((q) =>
      bankEvents.get(`${c.slug} ${q.questionId}`)?.some((e) => e.kind === "question_answered" && e.correct === true),
    ).length;
    c.xp = c.lessonsCompleted * XP_PER_LESSON + (correctQuestions + correctBank) * XP_PER_CORRECT;
    c.questions.sort((a, b) => a.lessonFile.localeCompare(b.lessonFile) || a.questionId.localeCompare(b.questionId));
    totalXp += c.xp;
    if (c.lastActive && (!lastActive || c.lastActive > lastActive)) lastActive = c.lastActive;
  }

  return { courses, totalXp, streakDays: streakDays(events, today), lastActive, dailyActivity };
}

/** Consecutive active days ending today, with a one-day grace (a streak ending yesterday still counts). */
export function streakDays(events: ProgressEvent[], today: Date): number {
  if (events.length === 0) return 0;
  const active = new Set(events.map((e) => dayKey(e.createdAt)));

  const cursor = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  if (!active.has(dayKey(cursor))) {
    cursor.setUTCDate(cursor.getUTCDate() - 1);
    if (!active.has(dayKey(cursor))) return 0;
  }

  let n = 0;
  while (active.has(dayKey(cursor))) {
    n++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return n;
}
