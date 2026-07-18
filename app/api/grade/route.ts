import { NextResponse } from "next/server";
import { grade, GraderError, type GradeRequest } from "@/lib/grading";

/**
 * Grade one Open answer against its Model Answer + Criteria. On any grader
 * failure (Ollama down, timeout, junk output) → 502 fast; the player then
 * drops to the Self-Assessment flow — the app stays fully usable.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON" }, { status: 400 });
  }

  const req = parseGradeRequest(body);
  if (!req) return NextResponse.json({ error: "invalid grade request" }, { status: 400 });

  try {
    return NextResponse.json(await grade(req), { headers: { "Cache-Control": "no-store" } });
  } catch (err) {
    const message = err instanceof GraderError ? err.message : "grading failed";
    console.error("grade failed:", err);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}

function parseGradeRequest(body: unknown): GradeRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const b = body as Record<string, unknown>;
  const str = (v: unknown): v is string => typeof v === "string" && v.trim() !== "";
  if (!str(b.stem) || !str(b.modelAnswer) || !str(b.answer)) return null;
  if (!Array.isArray(b.criteria) || !b.criteria.every(str) || b.criteria.length > 8) return null;
  return { stem: b.stem, modelAnswer: b.modelAnswer, criteria: b.criteria, answer: b.answer };
}
