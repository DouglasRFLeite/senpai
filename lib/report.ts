import type { CourseProgress } from "./progress";

/**
 * Builds the Markdown progress report the Learner exports and pastes into
 * Claude Code, where /teach reads it. Pure and tested.
 *
 * HEADING CONTRACT (do not rename — /teach parses these):
 *   `# Progress report — <course title>`
 *   `## Summary`               completion, XP, streak, last active
 *   `## Lessons`               checkbox list in course order
 *   `## Quiz results`          per inline-Quiz question verdicts
 *   `### Struggle spots`       Quiz questions not yet mastered
 *   `## Sessions`              Bank Session history (kind, date, score)
 *   `## Topic accuracy`        `<topic>: <correct>/<total> (<pct>%)`
 *   `### Bank struggle spots`  failed Bank questions, with the Learner's own
 *                              answer and the missed Criteria — the reteaching signal
 *   `## Notes for your teacher`
 */
export interface ReportInput {
  courseTitle: string;
  courseSlug: string;
  lessons: { file: string; title: string }[];
  progress?: CourseProgress;
  streakDays?: number;
  comment?: string;
  generatedAt?: Date;
}

const date = (iso: string | null | undefined): string =>
  iso ? new Date(iso).toISOString().slice(0, 10) : "—";

export function buildReport(input: ReportInput): string {
  const { courseTitle, lessons, progress: p, comment, streakDays = 0 } = input;
  const gen = (input.generatedAt ?? new Date()).toISOString().slice(0, 10);
  const done = p?.lessonsCompleted ?? 0;
  const total = p?.lessonsTotal ?? lessons.length;
  const pct = p?.completionPct ?? 0;

  const out: string[] = [];
  out.push(`# Progress report — ${courseTitle}`, "");
  out.push(`_Generated ${gen}. Paste this into Claude Code and run /teach; it reads your progress to pick what's next._`, "");

  out.push("## Summary", "");
  out.push(`- **Completion:** ${pct}% (${done}/${total} lessons)`);
  out.push(`- **XP:** ${p?.xp ?? 0} XP`);
  out.push(`- **Daily streak:** ${streakDays}-day streak`);
  out.push(`- **Last active:** ${date(p?.lastActive)}`, "");

  out.push("## Lessons", "");
  for (const l of lessons) {
    const st = p?.lessons[l.file];
    const box = st?.completed ? "[x]" : "[ ]";
    const when = st?.completed ? ` — completed ${date(st.completedAt)}` : st?.viewed ? " — started" : "";
    out.push(`- ${box} ${l.title}${when}`);
  }
  out.push("");

  const questions = p?.questions ?? [];
  if (questions.length) {
    const titleOf = (file: string) => lessons.find((l) => l.file === file)?.title ?? file;
    out.push("## Quiz results", "");
    for (const q of questions) {
      const verdict = q.correct
        ? q.attempts > 1
          ? `correct after ${q.attempts} attempts`
          : "correct first try"
        : `not yet correct (${q.wrongAttempts} wrong)`;
      out.push(`- ${titleOf(q.lessonFile)} · Q${q.questionId}: ${verdict}`);
    }
    out.push("");

    const struggles = questions.filter((q) => q.struggling || q.wrongAttempts > 1);
    if (struggles.length) {
      out.push("### Struggle spots", "");
      for (const q of struggles) {
        const why = q.correct ? `${q.wrongAttempts} wrong before getting it` : `${q.wrongAttempts} wrong, not yet correct`;
        out.push(`- ${titleOf(q.lessonFile)} · Q${q.questionId} — ${why}`);
      }
      out.push("");
    }
  }

  const sessions = p?.sessions ?? [];
  if (sessions.length) {
    out.push("## Sessions", "");
    for (const s of sessions) {
      const state = s.finishedAt ? "finished" : "abandoned";
      out.push(`- ${s.kind ?? "session"} · ${date(s.startedAt)} — ${s.scorePct}% (${s.answered} answered, ${state})`);
    }
    out.push("");
  }

  const topics = Object.entries(p?.topicAccuracy ?? {});
  if (topics.length) {
    out.push("## Topic accuracy", "");
    for (const [topic, t] of topics) {
      out.push(`- ${topic}: ${t.correct}/${t.total} (${Math.round((100 * t.correct) / t.total)}%)`);
    }
    out.push("");
  }

  const bankStruggles = (p?.bankQuestions ?? []).filter((q) => q.struggling);
  if (bankStruggles.length) {
    out.push("### Bank struggle spots", "");
    for (const q of bankStruggles) {
      out.push(`- **${q.questionId}**${q.topic ? ` (${q.topic})` : ""} — ${q.attempts} attempt(s), not mastered${q.selfAssessed ? ", self-assessed" : ""}`);
      if (q.answerText) out.push(`  - Their answer: "${q.answerText}"`);
      for (const c of q.missedCriteria) out.push(`  - Missed: ${c}`);
    }
    out.push("");
  }

  out.push("## Notes for your teacher", "");
  out.push(comment && comment.trim() ? comment.trim() : "_None._", "");

  return out.join("\n");
}
