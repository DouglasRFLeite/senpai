/**
 * Client-safe half of the Question Bank: types and pure selection helpers.
 * Loading/validation (fs-bound) lives in lib/bank.ts, which re-exports these —
 * client components must import from HERE or they drag node:fs into the bundle.
 */

export interface McQuestion {
  id: string;
  type: "mc";
  topic: string;
  source: string | null;
  stem: string;
  options: string[]; // 2..6
  correctIndex: number;
  explanation: string | null;
}

export interface OpenQuestion {
  id: string;
  type: "open";
  topic: string;
  source: string | null;
  stem: string;
  modelAnswer: string;
  criteria: string[]; // 1..8 individually-creditable points
  explanation: string | null;
}

export type BankQuestion = McQuestion | OpenQuestion;

/** Distinct topics in first-seen order — drives the Topic Drill picker. */
export function listTopics(bank: BankQuestion[]): string[] {
  return [...new Set(bank.map((q) => q.topic))];
}

export type Selection =
  | { mode: "all" }
  | { mode: "random"; n: number; rng?: () => number }
  | { mode: "topic"; topic: string };

/** The Session engine's question picker (deck ORDER is the engine's job, not ours). */
export function selectQuestions(bank: BankQuestion[], sel: Selection): BankQuestion[] {
  switch (sel.mode) {
    case "all":
      return [...bank];
    case "random": {
      const rng = sel.rng ?? Math.random;
      const pool = [...bank];
      // Fisher–Yates, then take the first n.
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      return pool.slice(0, Math.min(sel.n, pool.length));
    }
    case "topic":
      return bank.filter((q) => q.topic === sel.topic);
  }
}
