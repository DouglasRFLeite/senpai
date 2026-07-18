import { NextResponse } from "next/server";
import { listUsers } from "@/lib/db";

/** Every Learner seen so far — feeds the "Who is studying?" picker. */
export async function GET() {
  try {
    return NextResponse.json(await listUsers(), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err) {
    console.error("user list failed:", err);
    return NextResponse.json({ error: "event store unavailable" }, { status: 500 });
  }
}
