import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseLesson } from "../src/index.ts";

/**
 * Migration guard: every committed course doc must parse, and the converted
 * lessons must keep their historical quiz-question identity (1-based order)
 * so Learner struggle-spot history keys keep matching (lib/progress.ts).
 */
const ROOT = path.join(__dirname, "..", "..", "..", "public", "courses");

function docsUnder(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => f.endsWith(".md")).map((f) => path.join(dir, f));
}

const files = fs
  .readdirSync(ROOT, { withFileTypes: true })
  .filter((e) => e.isDirectory() && !/^[._]/.test(e.name))
  .flatMap((e) => [
    ...docsUnder(path.join(ROOT, e.name, "lessons")),
    ...docsUnder(path.join(ROOT, e.name, "reference")),
  ]);

describe("committed course docs", () => {
  it("found the migrated docs", () => {
    expect(files.length).toBeGreaterThanOrEqual(2);
  });

  it.each(files)("%s parses as valid Teachdown", (file) => {
    expect(() => parseLesson(fs.readFileSync(file, "utf8"))).not.toThrow();
  });
});

describe("quiz identity survives the migration", () => {
  const quizCounts: Record<string, number> = {
    "espresso/lessons/0001-the-ratio.md": 2,
    "espresso/lessons/0002-dialing-in.md": 0,
  };

  it.each(Object.entries(quizCounts))("%s has %d quiz questions with positional ids", (rel, count) => {
    const doc = parseLesson(fs.readFileSync(path.join(ROOT, rel), "utf8"));
    const quizzes = doc.blocks.filter((b) => b.type === "quiz");
    expect(quizzes).toHaveLength(count);
    expect(quizzes.map((q) => q.id)).toEqual(quizzes.map((_, i) => String(i + 1)));
  });
});
