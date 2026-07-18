/**
 * eval-grader — the Grader's analysis suite.
 * Uses the SAME functions as /api/grade, so it tests the real pipeline.
 * Needs a live Ollama; deliberately NOT part of `npm test`.
 *
 * Per Open Question it sends 3 answer tiers and measures 3 things:
 *   1) JSON reliability — direct / repaired (escaped quotes) / failed
 *   2) Score calibration — full ≈ 1.0, half in between, wrong ≈ 0.0
 *   3) Per-criterion judgment — false positives (leniency) / negatives (severity)
 *
 * Tiers (and the per-criterion ground truth each implies):
 *   ✅ full  = the question's own modelAnswer -> EVERY criterion should be met
 *   🟡 half  = first half of the modelAnswer  -> truth unknown (scores only)
 *   🔴 wrong = ANOTHER question's modelAnswer -> NO criterion should be met
 *
 * Run:  node scripts/eval-grader.ts <course-slug> [perTier=4] [reps=2]
 * Baseline (qwen3.5:4b, the reference course it was calibrated on): full ≈ 0.88, ~13% false negatives, ~0% false positives.
 */
import fs from "node:fs";
import path from "node:path";
import { loadBank, type OpenQuestion } from "../lib/bank.ts";
import { callModel, extractJSON, computeScore, type GradeRequest } from "../lib/grading.ts";

const [slug, perArg, repsArg] = process.argv.slice(2);
if (!slug) {
  console.error("usage: node scripts/eval-grader.ts <course-slug> [perTier] [reps]");
  process.exit(1);
}
const PER = parseInt(perArg || "4", 10);
const REPS = parseInt(repsArg || "2", 10);
const FAIL_LOG = path.join(import.meta.dirname, "eval-failures.log");

const open = loadBank(slug).filter((q): q is OpenQuestion => q.type === "open");
if (open.length < 2) {
  console.error(`course "${slug}" has ${open.length} open question(s) — need at least 2`);
  process.exit(1);
}

function spread(total: number, n: number): number[] {
  const out: number[] = [];
  for (let k = 0; k < n; k++) out.push(Math.round((k * (total - 1)) / (n - 1 || 1)));
  return [...new Set(out)];
}
function half(g: string): string {
  const p = g.split(/(?<=[.;])\s+/).filter(Boolean);
  return p.slice(0, Math.max(1, Math.floor(p.length / 2))).join(" ");
}
function otherModelAnswer(i: number): string {
  const t = open.length;
  for (let s = 1; s < t; s++) {
    const j = (i + Math.floor(t / 2) + s) % t;
    if (open[j].topic !== open[i].topic) return open[j].modelAnswer;
  }
  return open[(i + 1) % t].modelAnswer;
}

const TIERS = [
  { key: "full", glyph: "✅", truth: true as boolean | null, make: (q: OpenQuestion, _i: number) => q.modelAnswer },
  { key: "half", glyph: "🟡", truth: null as boolean | null, make: (q: OpenQuestion, _i: number) => half(q.modelAnswer) },
  { key: "wrong", glyph: "🔴", truth: false as boolean | null, make: (_q: OpenQuestion, i: number) => otherModelAnswer(i) },
];

/** How the JSON arrived: parseable directly, only after repair, or not at all. */
function classify(raw: string): "direct" | "repaired" | "failed" {
  const clean = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = clean.indexOf("{");
  const b = clean.lastIndexOf("}");
  const slice = a >= 0 && b > a ? clean.slice(a, b + 1) : null;
  for (const t of [clean, slice]) {
    if (t) {
      try {
        JSON.parse(t);
        return "direct";
      } catch {
        /* try next */
      }
    }
  }
  return extractJSON(raw) ? "repaired" : "failed";
}

interface RunResult {
  status: "direct" | "repaired" | "failed" | "ollama-error";
  ms: number;
  score?: number;
  flags?: boolean[];
}

async function gradeOnce(q: OpenQuestion, answer: string): Promise<RunResult> {
  const payload: GradeRequest = { stem: q.stem, modelAnswer: q.modelAnswer, criteria: q.criteria, answer };
  const t0 = Date.now();
  let raw: string;
  try {
    raw = await callModel(payload);
  } catch (e) {
    return { status: "ollama-error", ms: Date.now() - t0 };
  }
  const ms = Date.now() - t0;
  const status = classify(raw);
  if (status === "failed") {
    fs.appendFileSync(FAIL_LOG, `\n=== ${q.id} @ ${new Date().toISOString()} ===\n${raw}\n`);
    return { status, ms };
  }
  const parsed = extractJSON(raw)!;
  const marks = Array.isArray(parsed.criteria) ? (parsed.criteria as { met?: unknown }[]) : [];
  return {
    status,
    ms,
    score: computeScore(parsed, q.criteria),
    flags: q.criteria.map((_, k) => marks[k]?.met === true || marks[k]?.met === "true"),
  };
}

const bump = (map: Map<string, number>, k: string) => map.set(k, (map.get(k) || 0) + 1);
const topN = (map: Map<string, number>, n: number) => [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
const trunc = (s: string) => (s.length > 70 ? s.slice(0, 70) + "…" : s);
const fmt = (x: number) => (Number.isNaN(x) ? "—" : x.toFixed(2));

(async function main() {
  const idxs = spread(open.length, PER);
  fs.writeFileSync(FAIL_LOG, `# parse failures — ${new Date().toISOString()}\n`);

  const rel = { direct: 0, repaired: 0, failed: 0, "ollama-error": 0 };
  const ms: number[] = [];
  const scores: Record<string, number[]> = { full: [], half: [], wrong: [] };
  let fpHit = 0, fpTot = 0, fnHit = 0, fnTot = 0;
  const fpLeak = new Map<string, number>();
  const fnMiss = new Map<string, number>();

  const total = idxs.length * TIERS.length * REPS;
  console.log(`\n=== Grader analysis suite — course "${slug}" ===`);
  console.log(`${idxs.length} questions × ${TIERS.length} tiers × ${REPS} reps = ${total} calls\n`);

  let done = 0;
  for (const tier of TIERS) {
    for (const i of idxs) {
      const q = open[i];
      for (let rep = 0; rep < REPS; rep++) {
        const r = await gradeOnce(q, tier.make(q, i));
        rel[r.status]++;
        if (r.ms) ms.push(r.ms);
        process.stdout.write(`\r  ${++done}/${total}  (${tier.glyph} ${q.id})        `);
        if (r.status === "failed" || r.status === "ollama-error") continue;
        scores[tier.key].push(r.score!);
        for (let k = 0; k < q.criteria.length; k++) {
          const marked = r.flags![k] === true;
          if (tier.truth === true) {
            fnTot++;
            if (!marked) {
              fnHit++;
              bump(fnMiss, q.criteria[k]);
            }
          }
          if (tier.truth === false) {
            fpTot++;
            if (marked) {
              fpHit++;
              bump(fpLeak, q.criteria[k]);
            }
          }
        }
      }
    }
  }
  console.log("\n");

  const t = rel.direct + rel.repaired + rel.failed + rel["ollama-error"];
  const pct = (n: number) => `${((100 * n) / t).toFixed(0)}%`;
  console.log("1) JSON RELIABILITY");
  console.log(`   direct valid : ${rel.direct}  (${pct(rel.direct)})`);
  console.log(`   repaired (\\")  : ${rel.repaired}  (${pct(rel.repaired)})   <- escaped-quote bug, fixed server-side`);
  console.log(`   failed        : ${rel.failed}  (${pct(rel.failed)})   ${rel.failed ? "-> raw in " + path.basename(FAIL_LOG) : ""}`);
  if (rel["ollama-error"]) console.log(`   Ollama errors : ${rel["ollama-error"]}`);
  console.log(`   avg time      : ${(ms.reduce((s, x) => s + x, 0) / ms.length / 1000).toFixed(1)}s/call\n`);

  const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : NaN);
  const cA = avg(scores.full), mA = avg(scores.half), wA = avg(scores.wrong);
  console.log("2) SCORE CALIBRATION");
  console.log(`   ✅ full   ${fmt(cA)}  (want ~1.0)`);
  console.log(`   🟡 half   ${fmt(mA)}`);
  console.log(`   🔴 wrong  ${fmt(wA)}  (want ~0.0)`);
  console.log(`   full−wrong separation: ${fmt(cA - wA)} ${cA - wA >= 0.5 ? "✅" : "⚠ low"}\n`);

  console.log("3) PER-CRITERION JUDGMENT");
  console.log(`   🔴 False POSITIVES (wrong answer marked met = leniency): ${fpHit}/${fpTot} (${fpTot ? ((100 * fpHit) / fpTot).toFixed(0) : 0}%)`);
  topN(fpLeak, 3).forEach(([c, n]) => console.log(`        ${n}×  "${trunc(c)}"`));
  console.log(`   ✅ False NEGATIVES (right answer marked NOT met = severity): ${fnHit}/${fnTot} (${fnTot ? ((100 * fnHit) / fnTot).toFixed(0) : 0}%)`);
  topN(fnMiss, 3).forEach(([c, n]) => console.log(`        ${n}×  "${trunc(c)}"`));
  console.log("");
})().catch((e) => {
  console.error("\nFailed:", (e as Error).message);
  process.exit(1);
});
