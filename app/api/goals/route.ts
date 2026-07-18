import { NextResponse } from "next/server";
import { normalizeUserId } from "@/lib/user-id";
import { getGoal, setGoal, getEventsForUser } from "@/lib/db";
import { isoWeekStart, goalProgress, parseGoalInput } from "@/lib/goals";

/** The current ISO week's goal + how far along it is. */
export async function GET(request: Request) {
  const userId = normalizeUserId(new URL(request.url).searchParams.get("u"));
  if (!userId) return NextResponse.json({ error: "missing or invalid ?u=" }, { status: 400 });

  const weekStart = isoWeekStart(new Date());
  try {
    const goal = await getGoal(userId, weekStart);
    const progress = goal ? goalProgress(await getEventsForUser(userId), goal.kind, weekStart) : 0;
    return NextResponse.json({ goal, progress }, { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    console.error("goal read failed:", err);
    return NextResponse.json({ error: "goal store unavailable" }, { status: 500 });
  }
}

/** Set (replace) this week's goal: { userId, kind: lessons|questions, target }. */
export async function PUT(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const userId = normalizeUserId((body as Record<string, unknown> | null)?.userId);
  const input = parseGoalInput(body);
  if (!userId || !input) return NextResponse.json({ error: "invalid goal" }, { status: 400 });

  const goal = { ...input, weekStart: isoWeekStart(new Date()) };
  try {
    await setGoal(userId, goal);
    return NextResponse.json({ goal }, { status: 200 });
  } catch (err) {
    console.error("goal write failed:", err);
    return NextResponse.json({ error: "goal store unavailable" }, { status: 500 });
  }
}
