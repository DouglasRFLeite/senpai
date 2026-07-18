/**
 * Learner identity normalization — THE single definition, imported by both the
 * client (name picker) and every API route, so the two can never drift.
 * Also the injection/path-traversal guard: the id is safe as a SQL parameter,
 * a filename fragment, and a URL component.
 */

const MAX_LENGTH = 64;

/** Normalize a raw name into a Learner id, or null if nothing survives. */
export function normalizeUserId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const id = raw
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip accents (combining marks)
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, MAX_LENGTH);
  return id === "" ? null : id;
}
