import type { ProgressEvent } from "./progress";

/**
 * GitHub-style activity heatmap data: the last 12 months of
 * lessons completed + questions answered, bucketed per UTC day, laid out as
 * week columns × weekday rows (Sunday first). Pure — the component just paints.
 */

export interface HeatmapDay {
  date: string; // YYYY-MM-DD
  count: number;
  /** 0 = idle; 1..4 intensity relative to the busiest day in the window. */
  level: 0 | 1 | 2 | 3 | 4;
}

export interface Heatmap {
  /** Week columns, oldest first; each has exactly 7 slots (Sun..Sat), null-padded. */
  weeks: (HeatmapDay | null)[][];
  max: number;
}

const COUNTED: ProgressEvent["kind"][] = ["lesson_completed", "quiz_answered", "question_answered"];

const dayKey = (d: Date): string => d.toISOString().slice(0, 10);

export function buildHeatmap(events: ProgressEvent[], today: Date = new Date()): Heatmap {
  const end = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
  const start = new Date(end);
  start.setUTCFullYear(start.getUTCFullYear() - 1);
  start.setUTCDate(start.getUTCDate() + 1);

  const counts = new Map<string, number>();
  for (const e of events) {
    if (!COUNTED.includes(e.kind)) continue;
    const key = dayKey(new Date(e.createdAt));
    if (key < dayKey(start) || key > dayKey(end)) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const max = Math.max(0, ...counts.values());

  const level = (count: number): HeatmapDay["level"] =>
    count === 0 || max === 0 ? 0 : (Math.min(4, Math.max(1, Math.ceil((count / max) * 4))) as HeatmapDay["level"]);

  // Walk day by day, filling week columns; pad the first week before the
  // window's start and the last week after today with nulls.
  const weeks: (HeatmapDay | null)[][] = [];
  let week: (HeatmapDay | null)[] = new Array(start.getUTCDay()).fill(null);
  const cursor = new Date(start);
  while (cursor <= end) {
    const date = dayKey(cursor);
    const count = counts.get(date) ?? 0;
    week.push({ date, count, level: level(count) });
    if (week.length === 7) {
      weeks.push(week);
      week = [];
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }

  return { weeks, max };
}
