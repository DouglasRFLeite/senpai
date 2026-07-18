import { Pool } from "pg";
import type { IncomingEvent } from "./events";
import type { CriteriaResult, EventKind, ProgressEvent, SessionKind } from "./progress";
import type { Goal, GoalKind } from "./goals";

/**
 * Postgres access for the Event log. Deliberately tiny: an append-only `event`
 * table whose schema self-initializes on first use (idempotent), so a deploy
 * needs no migration step. There is NO no-op mode: a missing or
 * unreachable DATABASE_URL is an error, never silence.
 */

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

function getPool(): Pool {
  if (pool) return pool;
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set — Senpai requires Postgres");
  }
  pool = new Pool({ connectionString: process.env.DATABASE_URL });
  return pool;
}

function ensureSchema(p: Pool): Promise<void> {
  schemaReady ??= p
    .query(
      `CREATE TABLE IF NOT EXISTS event (
         id            BIGSERIAL PRIMARY KEY,
         user_id       TEXT NOT NULL,
         course_slug   TEXT NOT NULL,
         session_id    TEXT,
         lesson_file   TEXT,
         kind          TEXT NOT NULL,
         question_id   TEXT,
         correct       BOOLEAN,
         attempts      INTEGER,
         answer_text   TEXT,
         score         REAL,
         criteria      JSONB,
         session_kind  TEXT,
         created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
       );
       CREATE INDEX IF NOT EXISTS event_user_course_idx ON event (user_id, course_slug);
       CREATE TABLE IF NOT EXISTS goal (
         id          BIGSERIAL PRIMARY KEY,
         user_id     TEXT NOT NULL,
         kind        TEXT NOT NULL,
         target      INTEGER NOT NULL,
         week_start  DATE NOT NULL,
         created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
         UNIQUE (user_id, week_start)
       );`,
    )
    .then(() => undefined);
  return schemaReady;
}

export async function insertEvent(e: IncomingEvent): Promise<void> {
  const p = getPool();
  await ensureSchema(p);
  await p.query(
    `INSERT INTO event (user_id, course_slug, session_id, lesson_file, kind,
                        question_id, correct, attempts, answer_text, score, criteria, session_kind)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
    [
      e.userId,
      e.courseSlug,
      e.sessionId,
      e.lessonFile,
      e.kind,
      e.questionId,
      e.correct,
      e.attempts,
      e.answerText,
      e.score,
      e.criteria === null ? null : JSON.stringify(e.criteria),
      e.sessionKind,
    ],
  );
}

/** One Learner's full event history, oldest first — the aggregate() input. */
export async function getEventsForUser(userId: string): Promise<ProgressEvent[]> {
  const p = getPool();
  await ensureSchema(p);
  const { rows } = await p.query(
    `SELECT user_id, course_slug, session_id, lesson_file, kind, question_id,
            correct, attempts, answer_text, score, criteria, session_kind, created_at
       FROM event WHERE user_id = $1 ORDER BY created_at ASC, id ASC`,
    [userId],
  );
  return rows.map((r) => ({
    userId: r.user_id,
    courseSlug: r.course_slug,
    sessionId: r.session_id,
    lessonFile: r.lesson_file,
    kind: r.kind as EventKind,
    questionId: r.question_id,
    correct: r.correct,
    attempts: r.attempts,
    answerText: r.answer_text,
    score: r.score,
    criteria: (r.criteria as CriteriaResult | null) ?? null,
    sessionKind: r.session_kind as SessionKind | null,
    createdAt: r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
  }));
}

/** The Learner's goal for one ISO week, or null. */
export async function getGoal(userId: string, weekStart: string): Promise<Goal | null> {
  const p = getPool();
  await ensureSchema(p);
  const { rows } = await p.query(
    `SELECT kind, target, to_char(week_start, 'YYYY-MM-DD') AS week_start
       FROM goal WHERE user_id = $1 AND week_start = $2`,
    [userId, weekStart],
  );
  if (rows.length === 0) return null;
  return { kind: rows[0].kind as GoalKind, target: rows[0].target, weekStart: rows[0].week_start };
}

/** Set (or replace) the Learner's goal for one week. */
export async function setGoal(userId: string, goal: Goal): Promise<void> {
  const p = getPool();
  await ensureSchema(p);
  await p.query(
    `INSERT INTO goal (user_id, kind, target, week_start) VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, week_start) DO UPDATE SET kind = EXCLUDED.kind, target = EXCLUDED.target`,
    [userId, goal.kind, goal.target, goal.weekStart],
  );
}

/** Every Learner who ever logged an event — feeds the name picker. */
export async function listUsers(): Promise<string[]> {
  const p = getPool();
  await ensureSchema(p);
  const { rows } = await p.query(`SELECT DISTINCT user_id FROM event ORDER BY user_id ASC`);
  return rows.map((r) => r.user_id);
}
