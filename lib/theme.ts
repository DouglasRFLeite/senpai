/**
 * Course visual identity is just a glyph on the Home shelf — colors come from
 * the platform theme (globals.css), same for every course.
 */
export type CourseIconId = "coffee" | "circuit" | "forest" | "ocean" | "sunset" | "slate";

const ICONS: CourseIconId[] = ["coffee", "circuit", "forest", "ocean", "sunset", "slate"];

/** Courses with a hand-picked glyph; anything else gets a deterministic pick by slug. */
const KNOWN: Record<string, CourseIconId> = {
  espresso: "coffee",
};

export function getCourseIcon(slug: string): CourseIconId {
  return KNOWN[slug] ?? ICONS[hash(slug) % ICONS.length] ?? "coffee";
}

function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}
