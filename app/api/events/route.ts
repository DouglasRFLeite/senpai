import { NextResponse } from "next/server";
import { parseEvent } from "@/lib/events";
import { insertEvent } from "@/lib/db";

/**
 * Record one progress event. Validation failures are the caller's fault (400);
 * a DB failure is OURS and must be visible (500), never swallowed.
 * The widget already treats delivery as fire-and-forget on its side.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const event = parseEvent(body);
  if (!event) return NextResponse.json({ error: "invalid event" }, { status: 400 });

  try {
    await insertEvent(event);
  } catch (err) {
    console.error("event insert failed:", err);
    return NextResponse.json({ error: "event store unavailable" }, { status: 500 });
  }
  return new NextResponse(null, { status: 204 });
}
