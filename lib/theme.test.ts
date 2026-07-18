import { describe, it, expect } from "vitest";
import { getCourseIcon } from "./theme";

describe("getCourseIcon", () => {
  it("gives espresso its hand-picked coffee glyph", () => {
    expect(getCourseIcon("espresso")).toBe("coffee");
  });

  it("deterministically assigns the same glyph to an unknown slug on every call", () => {
    expect(getCourseIcon("future-course")).toBe(getCourseIcon("future-course"));
  });

  it("assigns different glyphs to different unknown slugs", () => {
    expect(getCourseIcon("alpha-topic")).not.toBe(getCourseIcon("bee-topic"));
  });
});
