import { normalizeUserId } from "./user-id";
import type { CriteriaResult, EventKind, ProgressEvent, SessionKind } from "./progress";

const KINDS: EventKind[] = [
  "lesson_viewed",
  "lesson_completed",
  "quiz_answered",
  "session_started",
  "session_finished",
  "question_answered",
  "question_graded",
];

const SESSION_KINDS: SessionKind[] = ["exam", "practice", "topic"];

/** Fields as they arrive from the browser (no createdAt — the server stamps that). */
export type IncomingEvent = Omit<ProgressEvent, "createdAt">;

const str = (v: unknown, max: number): string | null =>
  typeof v === "string" && v.length > 0 && v.length <= max ? v : null;

/**
 * Validate an untrusted request body into an event, or null if it's malformed.
 * The store is trusted-group and low-stakes, but we still bound field sizes and
 * reject unknown kinds so a stray POST can't wedge the table. Malformed optional
 * fields degrade to null; a bad userId, courseSlug, or kind rejects the event.
 */
export function parseEvent(body: unknown): IncomingEvent | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;

  const userId = normalizeUserId(b.userId);
  if (!userId) return null;
  const courseSlug = str(b.courseSlug, 128);
  if (!courseSlug) return null;
  if (typeof b.kind !== "string" || !KINDS.includes(b.kind as EventKind)) return null;

  return {
    userId,
    courseSlug,
    sessionId: str(b.sessionId, 64),
    lessonFile: str(b.lessonFile, 256),
    kind: b.kind as EventKind,
    questionId: str(b.questionId, 64),
    correct: typeof b.correct === "boolean" ? b.correct : null,
    attempts: typeof b.attempts === "number" && Number.isFinite(b.attempts) ? Math.trunc(b.attempts) : null,
    answerText: str(b.answerText, 20_000),
    score: typeof b.score === "number" && Number.isFinite(b.score) ? Math.min(1, Math.max(0, b.score)) : null,
    criteria: parseCriteria(b.criteria),
    sessionKind: SESSION_KINDS.includes(b.sessionKind as SessionKind) ? (b.sessionKind as SessionKind) : null,
  };
}

function parseCriteria(v: unknown): CriteriaResult | null {
  if (typeof v !== "object" || v === null || !Array.isArray((v as CriteriaResult).marks)) return null;
  const { marks, selfAssessed } = v as CriteriaResult;
  const valid = marks.every(
    (m) => typeof m === "object" && m !== null && typeof m.criterion === "string" && typeof m.met === "boolean",
  );
  if (!valid || marks.length > 32) return null;
  return { marks, ...(typeof selfAssessed === "boolean" ? { selfAssessed } : {}) };
}
