import type { ProgressEvent } from "./progress";

/**
 * Weekly goals: one goal per Learner per ISO week (Monday start),
 * kind `lessons` (completed) or `questions` (answered — Quiz + Bank alike).
 * Editing replaces the current week's goal; history stays in the table but has
 * no UI (backlog). Pure helpers here; storage in lib/db.ts.
 */

export type GoalKind = "lessons" | "questions";

export interface Goal {
  kind: GoalKind;
  target: number;
  weekStart: string; // YYYY-MM-DD, a Monday
}

/** The Monday of the date's ISO week, as YYYY-MM-DD (UTC). */
export function isoWeekStart(d: Date): string {
  const day = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const dow = day.getUTCDay(); // 0 = Sunday
  day.setUTCDate(day.getUTCDate() - ((dow + 6) % 7));
  return day.toISOString().slice(0, 10);
}

/** How much of the goal the week's events already cover. */
export function goalProgress(events: ProgressEvent[], kind: GoalKind, weekStart: string): number {
  const from = `${weekStart}T00:00:00Z`;
  const counted: ProgressEvent["kind"][] =
    kind === "lessons" ? ["lesson_completed"] : ["quiz_answered", "question_answered"];
  return events.filter((e) => e.createdAt >= from && counted.includes(e.kind)).length;
}

/** Validate an untrusted goal body (PUT /api/goals). */
export function parseGoalInput(body: unknown): { kind: GoalKind; target: number } | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  if (b.kind !== "lessons" && b.kind !== "questions") return null;
  if (typeof b.target !== "number" || !Number.isInteger(b.target) || b.target < 1 || b.target > 10_000) return null;
  return { kind: b.kind, target: b.target };
}
