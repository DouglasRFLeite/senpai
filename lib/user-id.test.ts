import { describe, it, expect } from "vitest";
import { normalizeUserId } from "./user-id";

describe("normalizeUserId", () => {
  it("lowercases and trims", () => {
    expect(normalizeUserId("  Maya ")).toBe("maya");
  });

  it("strips accents", () => {
    expect(normalizeUserId("José Antônio")).toBe("joseantonio");
  });

  it("keeps only [a-z0-9_-]", () => {
    expect(normalizeUserId("ma.ya! (2)")).toBe("maya2");
    expect(normalizeUserId("user_name-9")).toBe("user_name-9");
  });

  it("clamps to 64 chars", () => {
    expect(normalizeUserId("a".repeat(200))).toBe("a".repeat(64));
  });

  it("returns null when nothing survives", () => {
    expect(normalizeUserId("")).toBeNull();
    expect(normalizeUserId("   ")).toBeNull();
    expect(normalizeUserId("!!!???")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(normalizeUserId(null)).toBeNull();
    expect(normalizeUserId(undefined)).toBeNull();
    expect(normalizeUserId(42)).toBeNull();
  });

  it("blocks path traversal and injection characters", () => {
    expect(normalizeUserId("../../etc/passwd")).toBe("etcpasswd");
    expect(normalizeUserId("a'; DROP TABLE event;--")).toBe("adroptableevent--");
  });
});
