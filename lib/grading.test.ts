import { describe, it, expect, afterEach, vi } from "vitest";
import { buildMessages, extractJSON, repairJSON, computeScore, grade, GraderError } from "./grading";

const REQ = {
  stem: "Explique a desistência voluntária.",
  modelAnswer: "O agente interrompe voluntariamente a execução; responde só pelos atos praticados (art. 15).",
  criteria: ["Identifica desistência voluntária (art. 15)", "Reconhece a voluntariedade", "Limita a responsabilidade aos atos praticados"],
  answer: "Ele parou porque quis, então responde apenas pelas lesões.",
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("buildMessages", () => {
  const msgs = buildMessages(REQ);
  const system = msgs[0].content;
  const user = msgs[1].content;

  it("is a system+user pair", () => {
    expect(msgs.map((m) => m.role)).toEqual(["system", "user"]);
  });

  it("forbids the model's own domain knowledge — the rule that IS the product", () => {
    expect(system).toMatch(/ONLY|EXCLUSIVELY/i);
    expect(system).toMatch(/own .*knowledge/i);
  });

  it("carries stem, model answer, learner answer and numbered criteria", () => {
    expect(user).toContain(REQ.stem);
    expect(user).toContain(REQ.modelAnswer);
    expect(user).toContain(REQ.answer);
    expect(user).toContain("1. " + REQ.criteria[0]);
    expect(user).toContain("3. " + REQ.criteria[2]);
  });

  it("keeps the justification in the Learner's language", () => {
    expect(system + user).toMatch(/same language/i);
  });
});

describe("extractJSON (real small-model failure shapes)", () => {
  const good = { score: 0.7, criteria: [{ criterion: "c", met: true }], justification: "ok" };

  it("parses clean JSON directly", () => {
    expect(extractJSON(JSON.stringify(good))).toEqual(good);
  });

  it("strips markdown fences", () => {
    expect(extractJSON("```json\n" + JSON.stringify(good) + "\n```")).toEqual(good);
  });

  it("slices leading prose and trailing junk", () => {
    expect(extractJSON("Here is my grading:\n" + JSON.stringify(good) + "\nHope this helps!")).toEqual(good);
  });

  it("repairs escaped string delimiters (the qwen \\\" bug)", () => {
    const broken = '{"score": 0.7, "criteria": [], "justification": \\"muito bem\\"}';
    expect(extractJSON(broken)).toMatchObject({ justification: "muito bem" });
  });

  it("repairs the doubled-key shape (\"Justification: text\")", () => {
    const broken = '{"score": 1, "criteria": [], "Justification: correta e completa."}';
    const parsed = extractJSON(repairJSON(broken)) ?? extractJSON(broken);
    expect(parsed).toMatchObject({ justification: "correta e completa." });
  });

  it("returns null for hopeless output", () => {
    expect(extractJSON("the answer is good, score high")).toBeNull();
    expect(extractJSON("")).toBeNull();
  });
});

describe("computeScore", () => {
  it("scores the fraction of expected criteria marked met", () => {
    const parsed = { criteria: [{ criterion: "a", met: true }, { criterion: "b", met: false }, { criterion: "c", met: true }] };
    expect(computeScore(parsed, REQ.criteria)).toBeCloseTo(0.7); // 2/3 rounded to 1 decimal
  });

  it("divides by EXPECTED count: empty marks on a criteria question = 0, not 1", () => {
    expect(computeScore({ criteria: [] }, REQ.criteria)).toBe(0);
  });

  it("falls back to the model's score when no criteria exist, fixing 0-10 scale", () => {
    expect(computeScore({ criteria: [], score: 8 }, [])).toBe(0.8);
    expect(computeScore({ criteria: [], score: 0.5 }, [])).toBe(0.5);
  });

  it("clamps into [0,1]", () => {
    expect(computeScore({ criteria: [], score: 42 }, [])).toBe(1);
    expect(computeScore({ criteria: [], score: -3 }, [])).toBe(0);
    expect(computeScore({ criteria: [], score: NaN }, [])).toBe(0);
  });
});

function ollamaReply(content: unknown) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ message: { content: typeof content === "string" ? content : JSON.stringify(content) } }),
  };
}

describe("grade", () => {
  it("returns marks aligned to OUR criteria texts with the model's met flags", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        ollamaReply({
          score: 1,
          criteria: [
            { criterion: "echoed text may differ", met: true },
            { criterion: "b", met: false },
            { criterion: "c", met: true },
          ],
          justification: "Muito bem.",
        }),
      ),
    );
    const r = await grade(REQ);
    expect(r.criteria.map((c) => c.criterion)).toEqual(REQ.criteria);
    expect(r.criteria.map((c) => c.met)).toEqual([true, false, true]);
    expect(r.score).toBeCloseTo(0.7);
    expect(r.justification).toBe("Muito bem.");
  });

  it("treats missing marks as not met", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(ollamaReply({ score: 1, criteria: [{ criterion: "a", met: true }], justification: "x" })),
    );
    const r = await grade(REQ);
    expect(r.criteria.map((c) => c.met)).toEqual([true, false, false]);
  });

  it("throws GraderError when Ollama is unreachable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(grade(REQ)).rejects.toBeInstanceOf(GraderError);
  });

  it("throws GraderError on Ollama HTTP errors and unparseable output", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500, json: async () => ({}) }));
    await expect(grade(REQ)).rejects.toBeInstanceOf(GraderError);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(ollamaReply("no json at all")));
    await expect(grade(REQ)).rejects.toBeInstanceOf(GraderError);
  });

  it("GRADER_BEST_OF=2 grades twice and unions the met criteria", async () => {
    vi.stubEnv("GRADER_BEST_OF", "2");
    const first = ollamaReply({ score: 0, criteria: [{ criterion: "a", met: true }, { criterion: "b", met: false }, { criterion: "c", met: false }], justification: "run1" });
    const second = ollamaReply({ score: 0, criteria: [{ criterion: "a", met: false }, { criterion: "b", met: false }, { criterion: "c", met: true }], justification: "run2" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second));
    const r = await grade(REQ);
    expect(r.criteria.map((c) => c.met)).toEqual([true, false, true]);
    expect(r.score).toBeCloseTo(0.7);
    expect(r.justification).toBe("run1");
    expect((fetch as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(2);
  });

  it("sends format schema, low temperature and the configured model", async () => {
    vi.stubEnv("MODEL", "test-model:1b");
    const spy = vi.fn().mockResolvedValue(ollamaReply({ score: 1, criteria: [], justification: "x" }));
    vi.stubGlobal("fetch", spy);
    await grade(REQ);
    const body = JSON.parse(spy.mock.calls[0][1].body);
    expect(body.model).toBe("test-model:1b");
    expect(body.options.temperature).toBe(0.2);
    expect(body.format).toMatchObject({ type: "object", required: ["score", "criteria", "justification"] });
    expect(body.stream).toBe(false);
  });
});
