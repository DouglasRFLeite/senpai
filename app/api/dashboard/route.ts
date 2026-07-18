import { NextResponse } from "next/server";
import { normalizeUserId } from "@/lib/user-id";
import { getEventsForUser } from "@/lib/db";
import { computeBadges, longestStreak } from "@/lib/badges";
import { buildHeatmap } from "@/lib/heatmap";
import { listCourses, getCourse } from "@/lib/courses";
import { loadBank } from "@/lib/bank";

/** Everything the Dashboard needs beyond /api/progress: badges, heatmap, longest streak. */
export async function GET(request: Request) {
  const userId = normalizeUserId(new URL(request.url).searchParams.get("u"));
  if (!userId) return NextResponse.json({ error: "missing or invalid ?u=" }, { status: 400 });

  const lessonTotals: Record<string, number> = {};
  const bankTopics: Record<string, Record<string, string>> = {};
  for (const c of listCourses()) {
    lessonTotals[c.slug] = getCourse(c.slug)?.lessons.length ?? 0;
    try {
      bankTopics[c.slug] = Object.fromEntries(loadBank(c.slug).map((q) => [q.id, q.topic]));
    } catch (err) {
      console.error(`bank for ${c.slug} skipped:`, err);
    }
  }

  try {
    const events = await getEventsForUser(userId);
    const today = new Date();
    return NextResponse.json(
      {
        badges: computeBadges(events, lessonTotals, bankTopics, today),
        heatmap: buildHeatmap(events, today),
        longestStreak: longestStreak(events),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("dashboard read failed:", err);
    return NextResponse.json({ error: "event store unavailable" }, { status: 500 });
  }
}
