import type { ProgressEvent } from "./progress";

/**
 * Badges: pure, computed from the event log on every read — never
 * stored, so criteria changes retroactively re-award. Names/descriptions live
 * in messages/*.json under `badges.<id>`; this module only decides earned/when.
 * Earned date = the first event that satisfies the badge.
 */

export interface Badge {
  id: string;
  emoji: string;
  /** ISO timestamp (or YYYY-MM-DD for streaks) of the earning moment, null if locked. */
  earnedAt: string | null;
}

const EMOJI: Record<string, string> = {
  first_lesson: "📖",
  first_exam: "📝",
  perfect_exam: "🏆",
  streak_7: "🔥",
  streak_30: "🌋",
  centurion: "💯",
  scholar: "🎓",
  marksman: "🎯",
};

const dayKey = (iso: string): string => new Date(iso).toISOString().slice(0, 10);

export function computeBadges(
  events: ProgressEvent[],
  lessonTotals: Record<string, number>,
  bankTopics: Record<string, Record<string, string>>,
  _today: Date,
): Badge[] {
  const evs = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const earned: Record<string, string | null> = Object.fromEntries(Object.keys(EMOJI).map((id) => [id, null]));

  // Running state, one chronological pass.
  let answeredCount = 0;
  const sessionStats = new Map<string, { answered: number; allCorrect: boolean }>();
  const completedByCourse = new Map<string, Set<string>>();
  const topicStats = new Map<string, { correct: number; total: number }>();

  for (const e of evs) {
    if (e.kind === "lesson_completed") {
      earned.first_lesson ??= e.createdAt;
      if (e.lessonFile) {
        const set = completedByCourse.get(e.courseSlug) ?? new Set<string>();
        set.add(e.lessonFile);
        completedByCourse.set(e.courseSlug, set);
        const total = lessonTotals[e.courseSlug] ?? 0;
        if (total > 0 && set.size >= total) earned.scholar ??= e.createdAt;
      }
    }

    if (e.kind === "quiz_answered" || e.kind === "question_answered") {
      answeredCount++;
      if (answeredCount === 100) earned.centurion ??= e.createdAt;
    }

    if (e.kind === "question_answered" && e.sessionId) {
      const s = sessionStats.get(e.sessionId) ?? { answered: 0, allCorrect: true };
      s.answered++;
      if (e.correct !== true) s.allCorrect = false;
      sessionStats.set(e.sessionId, s);
    }

    if (e.kind === "session_finished" && e.sessionKind === "exam") {
      earned.first_exam ??= e.createdAt;
      const s = e.sessionId ? sessionStats.get(e.sessionId) : undefined;
      if (s && s.answered >= 10 && s.allCorrect) earned.perfect_exam ??= e.createdAt;
    }

    if (e.kind === "question_answered" && e.questionId) {
      const topic = bankTopics[e.courseSlug]?.[e.questionId];
      if (topic) {
        const t = topicStats.get(topic) ?? { correct: 0, total: 0 };
        t.total++;
        if (e.correct === true) t.correct++;
        topicStats.set(topic, t);
        if (t.total >= 10 && t.correct / t.total >= 0.9) earned.marksman ??= e.createdAt;
      }
    }
  }

  // Streak badges: walk the distinct active days once.
  const days = [...new Set(evs.map((e) => dayKey(e.createdAt)))].sort();
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev !== null && nextDay(prev) === d ? run + 1 : 1;
    prev = d;
    if (run === 7) earned.streak_7 ??= d;
    if (run === 30) earned.streak_30 ??= d;
  }

  return Object.keys(EMOJI).map((id) => ({ id, emoji: EMOJI[id], earnedAt: earned[id] }));
}

/** The longest run of consecutive active days anywhere in history. */
export function longestStreak(events: ProgressEvent[]): number {
  const days = [...new Set(events.map((e) => dayKey(e.createdAt)))].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev !== null && nextDay(prev) === d ? run + 1 : 1;
    prev = d;
    if (run > best) best = run;
  }
  return best;
}

function nextDay(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
