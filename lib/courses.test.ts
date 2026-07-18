import { describe, it, expect } from "vitest";
import { listCourses, getCourse, readResources } from "./courses";

const COURSES = "public/courses";
const FIXTURES = "test/fixtures/courses";

describe("listCourses", () => {
  it("discovers each course directory by slug", () => {
    const courses = listCourses(COURSES);
    expect(courses.map((c) => c.slug)).toContain("espresso");
  });

  it("reads the course title from the mission topic", () => {
    const espresso = listCourses(COURSES).find((c) => c.slug === "espresso");
    expect(espresso?.title).toBe("Brewing Better Espresso");
  });

  it("reads the course description from the Why section", () => {
    const espresso = listCourses(COURSES).find((c) => c.slug === "espresso");
    expect(espresso?.description).toBe(
      "I want to pull café-quality espresso at home every morning without wasting beans on guesswork.",
    );
  });

  it("ignores shared-asset directories prefixed with an underscore", () => {
    expect(listCourses(COURSES).map((c) => c.slug)).not.toContain("_shared");
  });

  it("falls back to the slug as title when a course has no MISSION.md", () => {
    const entities = listCourses(FIXTURES).find((c) => c.slug === "entities");
    expect(entities?.title).toBe("entities");
  });

  it("returns an empty list when the root does not exist", () => {
    expect(listCourses("does/not/exist")).toEqual([]);
  });
});

describe("getCourse", () => {
  it("lists lessons in filename order, keyed by extension-less stem", () => {
    const course = getCourse("minimal", FIXTURES);
    expect(course?.lessons.map((l) => l.file)).toEqual([
      "0001-bare",
      "0002-second",
      "0003-untitled",
    ]);
  });

  it("titles each lesson from its frontmatter title", () => {
    const course = getCourse("minimal", FIXTURES);
    expect(course?.lessons[0]?.title).toBe("Bare Lesson Heading");
    expect(course?.lessons[1]?.title).toBe("Second Lesson");
  });

  it("falls back to the stem when a lesson has no frontmatter title", () => {
    const course = getCourse("minimal", FIXTURES);
    expect(course?.lessons[2]?.title).toBe("0003-untitled");
  });

  it("needs no entity decoding for frontmatter titles", () => {
    const course = getCourse("entities", FIXTURES);
    expect(course?.lessons[0]?.title).toBe("Keys, Accounts & Addresses");
  });

  it("ignores non-md files in the lessons directory", () => {
    const course = getCourse("minimal", FIXTURES);
    expect(course?.lessons.map((l) => l.file)).not.toContain("stray");
  });

  it("returns null for an unknown course", () => {
    expect(getCourse("does-not-exist", COURSES)).toBeNull();
  });
});

describe("readResources", () => {
  it("returns the raw RESOURCES.md for a course that has one", () => {
    expect(readResources("entities", FIXTURES)).toContain("# Resources");
  });

  it("returns null for a course without a RESOURCES.md", () => {
    expect(readResources("espresso", COURSES)).toBeNull();
  });

  it("returns null for an unknown course", () => {
    expect(readResources("does-not-exist", COURSES)).toBeNull();
  });
});
