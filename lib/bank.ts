import fs from "node:fs";
import path from "node:path";
// Explicit .ts extension: scripts load this file through Node's strip-only TS
// loader, which resolves imports literally (tsconfig allowImportingTsExtensions).
import type { BankQuestion } from "./bank-core.ts";

export * from "./bank-core.ts";

/**
 * Question Bank: `public/courses/<slug>/bank/*.json`, merged (authors may split
 * files by topic). Validated on load — malformed content fails
 * LOUDLY with the file and question named, because /author-bank relies on these
 * messages. English keys always; content in the course's own language.
 */

const DEFAULT_ROOT = path.join(process.cwd(), "public", "courses");

export class BankValidationError extends Error {
  readonly errors: string[];
  // No TS parameter properties here: scripts run this file through Node's
  // strip-only TS loader, which cannot rewrite them.
  constructor(errors: string[]) {
    super(`Question Bank has ${errors.length} problem(s):\n- ${errors.join("\n- ")}`);
    this.name = "BankValidationError";
    this.errors = errors;
  }
}

/** Load and validate a course's whole Bank. Empty array when the course has none. */
export function loadBank(slug: string, root: string = DEFAULT_ROOT): BankQuestion[] {
  const bankDir = path.join(root, slug, "bank");
  if (!fs.existsSync(bankDir)) return [];

  const files = fs
    .readdirSync(bankDir)
    .filter((f) => f.endsWith(".json"))
    .sort();

  const questions: BankQuestion[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();

  for (const file of files) {
    let doc: unknown;
    try {
      doc = JSON.parse(fs.readFileSync(path.join(bankDir, file), "utf8"));
    } catch (e) {
      errors.push(`${file}: not valid JSON (${(e as Error).message})`);
      continue;
    }
    const list = (doc as { questions?: unknown }).questions;
    if (!Array.isArray(list)) {
      errors.push(`${file}: missing a top-level "questions" array`);
      continue;
    }
    list.forEach((raw, i) => {
      const q = validateQuestion(raw, `${file} question ${i + 1}`, errors);
      if (!q) return;
      if (seen.has(q.id)) errors.push(`${file}: duplicate question id "${q.id}"`);
      else {
        seen.add(q.id);
        questions.push(q);
      }
    });
  }

  if (errors.length) throw new BankValidationError(errors);
  return questions;
}

function validateQuestion(raw: unknown, where: string, errors: string[]): BankQuestion | null {
  if (typeof raw !== "object" || raw === null) {
    errors.push(`${where}: not an object`);
    return null;
  }
  const q = raw as Record<string, unknown>;
  const label = typeof q.id === "string" && q.id ? `${where} (id "${q.id}")` : where;
  const before = errors.length;

  const need = (field: string): string | null => {
    const v = q[field];
    if (typeof v !== "string" || v.trim() === "") {
      errors.push(`${label}: "${field}" must be a non-empty string`);
      return null;
    }
    return v;
  };

  const id = need("id");
  const topic = need("topic");
  const stem = need("stem");
  const source = typeof q.source === "string" && q.source !== "" ? q.source : null;
  const explanation = typeof q.explanation === "string" && q.explanation !== "" ? q.explanation : null;

  if (q.type === "mc") {
    const options = Array.isArray(q.options) && q.options.every((o) => typeof o === "string") ? q.options : null;
    if (!options || options.length < 2 || options.length > 6) {
      errors.push(`${label}: "options" must be an array of 2..6 strings`);
    }
    if (
      typeof q.correctIndex !== "number" ||
      !Number.isInteger(q.correctIndex) ||
      !options ||
      q.correctIndex < 0 ||
      q.correctIndex >= options.length
    ) {
      errors.push(`${label}: "correctIndex" must be an integer inside options' range`);
    }
    if (errors.length > before) return null;
    return { id: id!, type: "mc", topic: topic!, source, stem: stem!, options: options!, correctIndex: q.correctIndex as number, explanation };
  }

  if (q.type === "open") {
    const modelAnswer = need("modelAnswer");
    const criteria = Array.isArray(q.criteria) && q.criteria.every((c) => typeof c === "string" && c.trim() !== "") ? q.criteria : null;
    if (!criteria || criteria.length < 1 || criteria.length > 8) {
      errors.push(`${label}: "criteria" must be an array of 1..8 non-empty strings`);
    }
    if (errors.length > before) return null;
    return { id: id!, type: "open", topic: topic!, source, stem: stem!, modelAnswer: modelAnswer!, criteria: criteria!, explanation };
  }

  errors.push(`${label}: "type" must be "mc" or "open"`);
  return null;
}
