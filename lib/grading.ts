/**
 * The Grader: Ollama-only LLM grading of Open answers. The prompt rules ARE
 * the product: the model is FORBIDDEN from using its own domain knowledge and
 * scores strictly against the Model Answer + Criteria. Field names
 * are English; the prompt is language-neutral (it instructs the model to
 * answer in the question's own language, so a pt-BR course gets pt-BR
 * justifications).
 *
 * Env (read per call so tests can stub): OLLAMA_URL, MODEL, OLLAMA_KEEP_ALIVE,
 * OLLAMA_THINK, OLLAMA_TIMEOUT_MS, GRADER_BEST_OF. See CLAUDE.md.
 */

export interface GradeRequest {
  stem: string;
  modelAnswer: string;
  criteria: string[];
  answer: string;
}

export interface GradeResponse {
  score: number; // 0..1, one decimal
  criteria: { criterion: string; met: boolean }[];
  justification: string;
}

/** Any failure between us and a valid model verdict — the API maps it to 502. */
export class GraderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "GraderError";
  }
}

interface Config {
  url: string;
  model: string;
  keepAlive: string | number;
  think: boolean;
  timeoutMs: number;
  bestOf: number;
}

function config(): Config {
  // OLLAMA_KEEP_ALIVE arrives as a string; Ollama 400s unless it's a number or
  // a valid duration string — coerce numeric strings, pass durations through.
  const rawKeep = process.env.OLLAMA_KEEP_ALIVE;
  const keepAlive =
    rawKeep == null || rawKeep === "" ? -1 : Number.isNaN(Number(rawKeep)) ? rawKeep : Number(rawKeep);
  return {
    url: process.env.OLLAMA_URL || "http://127.0.0.1:11434",
    model: process.env.MODEL || "qwen3.5:4b",
    keepAlive,
    think: process.env.OLLAMA_THINK === "true",
    timeoutMs: parseInt(process.env.OLLAMA_TIMEOUT_MS || "45000", 10),
    bestOf: process.env.GRADER_BEST_OF === "2" ? 2 : 1,
  };
}

/* Response schema: forces Ollama to emit 100% valid JSON. Without it, small
   models sometimes wrap the justification in ESCAPED quotes (\"...\"), which
   breaks JSON.parse and used to surface as spurious 502s. */
export const GRADE_SCHEMA = {
  type: "object",
  properties: {
    score: { type: "number" },
    criteria: {
      type: "array",
      items: {
        type: "object",
        properties: { criterion: { type: "string" }, met: { type: "boolean" } },
        required: ["criterion", "met"],
      },
    },
    justification: { type: "string" },
  },
  required: ["score", "criteria", "justification"],
} as const;

export function buildMessages(req: GradeRequest): { role: "system" | "user"; content: string }[] {
  const crit = req.criteria.map((c, i) => `${i + 1}. ${c}`).join("\n");
  const system = `You are a rigorous but kind grader of written exam answers.
ABSOLUTE RULE: you must NOT decide what is correct based on your own knowledge of the subject.
Base your judgment EXCLUSIVELY on the MODEL ANSWER and the CRITERIA provided below.
Accept wording that differs from the model answer as long as it is equivalent in substance (same concept/grounds).
Do not require exact citation numbers if the learner correctly identified the concept.
Write the "justification" in the same language as the QUESTION.
Reply ONLY with a valid JSON object, with no text outside it.`;
  const user = `QUESTION:
${req.stem}

MODEL ANSWER (the teacher's expected answer):
${req.modelAnswer}

CRITERIA for the answer to be considered correct:
${crit}

LEARNER'S ANSWER:
${req.answer}

TASK:
1) For each criterion above, say whether it was met (true/false).
2) Assign a SCORE from 0.0 to 1.0 (one decimal), proportional to how many essential criteria were met and how close the answer is to the model answer.
3) In "justification", explain in 2 to 4 sentences, in a didactic and warm tone and in the same language as the question, what was right and what was missing, naming the correct concept.

Reply ONLY in this JSON format:
{"score": 0.0, "criteria": [{"criterion": "criterion text", "met": true}], "justification": "..."}`;
  return [
    { role: "system", content: system },
    { role: "user", content: user },
  ];
}

// Small models sometimes delimit a string value with ESCAPED quotes (\"...\"),
// which breaks JSON.parse. This fixes only the delimiters (right after ':' or
// immediately before ',' '}' ']'), never touching the justification's content.
export function repairJSON(txt: string): string {
  return txt
    .replace(/"[Jj]ustification:\s*/g, '"justification": "') // doubled key: "Justification: text" -> "justification": "text
    .replace(/:\s*\\"/g, ': "') // escaped opener:  "field": \"...   ->  "field": "...
    .replace(/\\"\s*:?\s*([,}\]])/g, '"$1'); // escaped closer:  ...text\" / \": before , } ]
}

export function extractJSON(txt: string): Record<string, unknown> | null {
  if (!txt) return null;
  txt = txt.replace(/```json/gi, "").replace(/```/g, "").trim();
  const a = txt.indexOf("{");
  const b = txt.lastIndexOf("}");
  const slice = a >= 0 && b > a ? txt.slice(a, b + 1) : null;
  const tries = [txt, repairJSON(txt)];
  if (slice) tries.push(slice, repairJSON(slice));
  for (const t of tries) {
    try {
      return JSON.parse(t);
    } catch {
      /* next shape */
    }
  }
  return null;
}

/**
 * The SCORE is computed HERE from the criteria the model marked. A 4B model
 * judges each criterion (true/false) well but does NOT score fractions
 * reliably (it returned score=1 with 1/3 met). So the score is the fraction of
 * EXPECTED criteria met — always consistent with the ✔/✘ shown, and an answer
 * with zero marks scores 0, not 1.
 */
export function computeScore(parsed: Record<string, unknown>, expectedCriteria: string[]): number {
  const marks = Array.isArray(parsed.criteria) ? (parsed.criteria as { met?: unknown }[]) : [];
  const met = marks.filter((c) => c.met === true || c.met === "true").length;
  const total = expectedCriteria.length || marks.length;
  let score: number;
  if (total > 0) {
    score = met / total;
  } else {
    score = parseFloat(String(parsed.score));
    if (Number.isNaN(score)) score = 0;
    if (score > 1) score = score / 10; // fix 0-10 scale when it shows up
  }
  return Math.round(Math.max(0, Math.min(1, score)) * 10) / 10;
}

/** Raw model call → the response text, unparsed (the eval harness inspects raw output). */
export async function callModel(req: GradeRequest): Promise<string> {
  const cfg = config();
  let r: Response;
  try {
    r = await fetch(`${cfg.url}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(cfg.timeoutMs),
      body: JSON.stringify({
        model: cfg.model,
        stream: false,
        format: GRADE_SCHEMA,
        keep_alive: cfg.keepAlive,
        think: cfg.think,
        options: { temperature: 0.2 },
        messages: buildMessages(req),
      }),
    });
  } catch (e) {
    throw new GraderError(`Ollama unreachable: ${(e as Error).message}`);
  }
  if (!r.ok) throw new GraderError(`Ollama HTTP ${r.status}`);
  const data = (await r.json()) as { message?: { content?: string } };
  return data?.message?.content || "";
}

async function gradeOnce(req: GradeRequest): Promise<{ metFlags: boolean[]; justification: string; parsed: Record<string, unknown> }> {
  const content = await callModel(req);
  const parsed = extractJSON(content);
  if (!parsed) throw new GraderError("model reply had no valid JSON");
  const marks = Array.isArray(parsed.criteria) ? (parsed.criteria as { met?: unknown }[]) : [];
  // Align by index to OUR criteria — the model's echo of the text may drift.
  const metFlags = req.criteria.map((_, i) => marks[i]?.met === true || marks[i]?.met === "true");
  return { metFlags, justification: String(parsed.justification ?? ""), parsed };
}

/**
 * Grade one Open answer. With GRADER_BEST_OF=2, grades twice and unions the
 * met criteria (false-negative mitigation — the model errs on the severe side
 * ~13% per criterion; a second opinion mostly recovers those).
 */
export async function grade(req: GradeRequest): Promise<GradeResponse> {
  const runs = config().bestOf;
  const first = await gradeOnce(req);
  let metFlags = first.metFlags;
  if (runs === 2) {
    const second = await gradeOnce(req);
    metFlags = metFlags.map((m, i) => m || second.metFlags[i]);
  }
  const score =
    req.criteria.length > 0
      ? computeScore({ criteria: req.criteria.map((c, i) => ({ criterion: c, met: metFlags[i] })) }, req.criteria)
      : computeScore(first.parsed, req.criteria);
  return {
    score,
    criteria: req.criteria.map((c, i) => ({ criterion: c, met: metFlags[i] })),
    justification: first.justification,
  };
}
