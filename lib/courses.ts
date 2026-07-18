import fs from "node:fs";
import path from "node:path";
import { readTitle } from "teachdown";

const DEFAULT_ROOT = path.join(process.cwd(), "public", "courses");

export interface CourseSummary {
  slug: string;
  title: string;
  description: string;
}

export interface Lesson {
  /** The extension-less stem — also the route segment and the events.lesson_file key. */
  file: string;
  title: string;
}

export interface Course extends CourseSummary {
  lessons: Lesson[];
}

/** Discover every course directory under `root`, one entry per slug. */
export function listCourses(root: string = DEFAULT_ROOT): CourseSummary[] {
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    // Skip dot/underscore dirs: reserved for shared machinery, never courses.
    .filter((entry) => entry.isDirectory() && !/^[._]/.test(entry.name))
    .map((entry) => {
      const mission = readMission(path.join(root, entry.name));
      return {
        slug: entry.name,
        title: missionTitle(mission, entry.name),
        description: missionWhy(mission),
      };
    });
}

/** A single course with its lessons in reading order, or null if absent. */
export function getCourse(slug: string, root: string = DEFAULT_ROOT): Course | null {
  const courseDir = path.join(root, slug);
  if (!fs.existsSync(courseDir)) return null;
  const mission = readMission(courseDir);
  return {
    slug,
    title: missionTitle(mission, slug),
    description: missionWhy(mission),
    lessons: listLessons(courseDir),
  };
}

/** A course's learner-facing reference list (RESOURCES.md), raw, or null if it has none. */
export function readResources(slug: string, root: string = DEFAULT_ROOT): string | null {
  const file = path.join(root, slug, "RESOURCES.md");
  if (!fs.existsSync(file)) return null;
  const content = fs.readFileSync(file, "utf8").trim();
  return content === "" ? null : content;
}

function listLessons(courseDir: string): Lesson[] {
  const lessonsDir = path.join(courseDir, "lessons");
  if (!fs.existsSync(lessonsDir)) return [];
  return fs
    .readdirSync(lessonsDir)
    .filter((file) => file.endsWith(".md"))
    .sort()
    .map((file) => {
      const stem = file.slice(0, -".md".length);
      const md = fs.readFileSync(path.join(lessonsDir, file), "utf8");
      // Tolerant on purpose: a lesson broken elsewhere must not vanish from the list.
      return { file: stem, title: readTitle(md) ?? stem };
    });
}

function readMission(courseDir: string): string {
  const file = path.join(courseDir, "MISSION.md");
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
}

/** The topic from `# Mission: {Topic}`; falls back to the slug. */
function missionTitle(mission: string, slug: string): string {
  const match = mission.match(/^#\s*Mission:\s*(.+)$/m);
  return match ? match[1].trim() : slug;
}

/** The prose under the `## Why` heading, collapsed to a single line. */
function missionWhy(mission: string): string {
  const lines = mission.split("\n");
  const start = lines.findIndex((l) => /^##\s*Why\s*$/.test(l));
  if (start === -1) return "";
  const body: string[] = [];
  for (const line of lines.slice(start + 1)) {
    if (/^##\s/.test(line)) break; // next section
    body.push(line);
  }
  return body.join(" ").trim().replace(/\s+/g, " ");
}
