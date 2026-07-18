import { NextResponse } from "next/server";
import { normalizeUserId } from "@/lib/user-id";
import { getEventsForUser } from "@/lib/db";
import { aggregate } from "@/lib/progress";
import { listCourses, getCourse } from "@/lib/courses";
import { loadBank } from "@/lib/bank";

/** One Learner's whole progress summary (?u=<user id>) — the UI's single feed. */
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
      // A malformed bank must not take progress down with it — /author-bank
      // surfaces these errors; here the course simply reports no topics.
      console.error(`bank for ${c.slug} skipped:`, err);
    }
  }

  try {
    const events = await getEventsForUser(userId);
    return NextResponse.json(aggregate(events, lessonTotals, new Date(), bankTopics), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("progress read failed:", err);
    return NextResponse.json({ error: "event store unavailable" }, { status: 500 });
  }
}
