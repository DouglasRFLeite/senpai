import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { loadBank, listTopics, selectQuestions, BankValidationError, type BankQuestion } from "./bank";

/** Write a throwaway course with the given bank files and return its root. */
function courseWith(files: Record<string, unknown>): { root: string; slug: string } {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "bank-test-"));
  const slug = "course";
  fs.mkdirSync(path.join(root, slug, "bank"), { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    fs.writeFileSync(
      path.join(root, slug, "bank", name),
      typeof content === "string" ? content : JSON.stringify(content),
    );
  }
  return { root, slug };
}

const mc = (id: string, topic = "Topic A") => ({
  id,
  type: "mc",
  topic,
  stem: `stem ${id}`,
  options: ["a", "b", "c"],
  correctIndex: 1,
  explanation: "because",
});

const open = (id: string, topic = "Topic B") => ({
  id,
  type: "open",
  topic,
  stem: `stem ${id}`,
  modelAnswer: "the expected answer",
  criteria: ["names the rule", "applies it"],
});

describe("loadBank", () => {
  it("merges every *.json in the bank dir and keeps file order stable", () => {
    const { root, slug } = courseWith({
      "mc.json": { questions: [mc("M01"), mc("M02")] },
      "open.json": { questions: [open("A01")] },
    });
    const bank = loadBank(slug, root);
    expect(bank.map((q) => q.id)).toEqual(["M01", "M02", "A01"]);
  });

  it("returns an empty bank for a course without a bank dir", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "bank-test-"));
    fs.mkdirSync(path.join(root, "bare"));
    expect(loadBank("bare", root)).toEqual([]);
  });

  it("keeps optional fields and fills absent ones with null", () => {
    const { root, slug } = courseWith({
      "q.json": { questions: [{ ...open("A01"), source: "prova 2", explanation: "note" }] },
    });
    const q = loadBank(slug, root)[0];
    expect(q).toMatchObject({ source: "prova 2", explanation: "note" });
    const { root: r2, slug: s2 } = courseWith({ "q.json": { questions: [open("A02")] } });
    expect(loadBank(s2, r2)[0]).toMatchObject({ source: null, explanation: null });
  });

  it("names the file and question in a validation error", () => {
    const { root, slug } = courseWith({
      "bad.json": { questions: [{ ...mc("M01"), correctIndex: 9 }] },
    });
    expect(() => loadBank(slug, root)).toThrow(BankValidationError);
    try {
      loadBank(slug, root);
    } catch (e) {
      const msg = (e as Error).message;
      expect(msg).toContain("bad.json");
      expect(msg).toContain("M01");
      expect(msg).toContain("correctIndex");
    }
  });

  it("rejects malformed JSON files loudly, naming the file", () => {
    const { root, slug } = courseWith({ "broken.json": "{ not json" });
    expect(() => loadBank(slug, root)).toThrow(/broken\.json/);
  });

  it("rejects duplicate ids across files", () => {
    const { root, slug } = courseWith({
      "a.json": { questions: [mc("M01")] },
      "b.json": { questions: [{ ...open("M01") }] },
    });
    expect(() => loadBank(slug, root)).toThrow(/duplicate.*M01/i);
  });

  it("enforces option and criteria count bounds", () => {
    const { root, slug } = courseWith({
      "a.json": { questions: [{ ...mc("M01"), options: ["only-one"] }] },
    });
    expect(() => loadBank(slug, root)).toThrow(/options/);

    const { root: r2, slug: s2 } = courseWith({
      "a.json": { questions: [{ ...open("A01"), criteria: [] }] },
    });
    expect(() => loadBank(s2, r2)).toThrow(/criteria/);

    const { root: r3, slug: s3 } = courseWith({
      "a.json": { questions: [{ ...open("A01"), criteria: Array(9).fill("c") }] },
    });
    expect(() => loadBank(s3, r3)).toThrow(/criteria/);
  });

  it("collects every error instead of stopping at the first", () => {
    const { root, slug } = courseWith({
      "a.json": { questions: [{ ...mc("M01"), correctIndex: -1 }, { ...open("A01"), modelAnswer: "" }] },
    });
    try {
      loadBank(slug, root);
      expect.unreachable();
    } catch (e) {
      expect((e as BankValidationError).errors).toHaveLength(2);
    }
  });
});

describe("listTopics", () => {
  it("returns distinct topics in first-seen order", () => {
    const bank = [mc("M01", "Erro"), open("A01", "Iter"), mc("M02", "Erro")] as unknown as BankQuestion[];
    expect(listTopics(bank)).toEqual(["Erro", "Iter"]);
  });
});

describe("selectQuestions", () => {
  const bank = [mc("M01", "Erro"), mc("M02", "Iter"), open("A01", "Erro"), open("A02", "Iter")] as unknown as BankQuestion[];

  it("all: returns the whole bank", () => {
    expect(selectQuestions(bank, { mode: "all" }).map((q) => q.id)).toEqual(["M01", "M02", "A01", "A02"]);
  });

  it("random: returns N distinct questions using the injected rng", () => {
    const picked = selectQuestions(bank, { mode: "random", n: 2, rng: () => 0 });
    expect(picked).toHaveLength(2);
    expect(new Set(picked.map((q) => q.id)).size).toBe(2);
  });

  it("random: caps N at the bank size", () => {
    expect(selectQuestions(bank, { mode: "random", n: 99, rng: () => 0.5 })).toHaveLength(4);
  });

  it("topic: returns every question of one topic", () => {
    expect(selectQuestions(bank, { mode: "topic", topic: "Erro" }).map((q) => q.id)).toEqual(["M01", "A01"]);
  });
});
