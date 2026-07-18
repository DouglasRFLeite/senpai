"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { Course, Lesson } from "@/lib/courses";
import type { CourseProgress, ProgressSummary } from "@/lib/progress";
import type { Goal } from "@/lib/goals";
import { getCourseIcon } from "@/lib/theme";
import { CourseIcon } from "@/components/CourseIcon";
import { useProgress } from "@/components/useProgress";
import { useUser } from "@/lib/use-user";
import styles from "@/styles/Home.module.css";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

const nextLesson = (course: Course, cp: CourseProgress | undefined): { lesson: Lesson; index: number } | null => {
  const i = course.lessons.findIndex((l) => !cp?.lessons[l.file]?.completed);
  return i === -1 ? null : { lesson: course.lessons[i], index: i };
};

/** The most recently active unfinished course — what the resume band points at. */
function pickResume(courses: Course[], progress: ProgressSummary | null) {
  if (!progress) return null;
  const candidates = courses
    .map((course) => ({ course, cp: progress.courses[course.slug] }))
    .filter((c) => c.cp && c.cp.lessonsTotal > 0 && c.cp.completionPct < 100)
    .sort((a, b) => (b.cp.lastActive ?? "").localeCompare(a.cp.lastActive ?? ""));
  for (const { course, cp } of candidates) {
    const next = nextLesson(course, cp);
    if (next) return { course, cp, ...next };
  }
  return null;
}

/** Home: today's desk — resume band, streak/goal ribbon, and the course shelf. */
export function HomeView({ courses }: { courses: Course[] }) {
  const t = useTranslations("home");
  const td = useTranslations("dashboard");
  const locale = useLocale();
  const { user } = useUser();
  const progress = useProgress();

  const [goal, setGoal] = useState<Goal | null>(null);
  const [goalDone, setGoalDone] = useState(0);
  useEffect(() => {
    if (!user) {
      setGoal(null);
      return;
    }
    let alive = true;
    fetch(`/api/goals?u=${encodeURIComponent(user)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) {
          setGoal(d.goal);
          setGoalDone(d.progress);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  const now = new Date();
  const hour = now.getHours();
  const greeting = t(hour < 12 ? "greetingMorning" : hour < 18 ? "greetingAfternoon" : "greetingEvening");
  const dateKicker = `${new Intl.DateTimeFormat(locale, { weekday: "long" }).format(now)} · ${new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(now)}`;

  const resume = pickResume(courses, progress);
  const goalPct = goal ? Math.min(100, Math.round((100 * goalDone) / goal.target)) : 0;
  const RING = 2 * Math.PI * 42;

  return (
    <div className={styles.page}>
      {/* Server and client clocks can differ across the render boundary. */}
      <div className={styles.dateKicker} suppressHydrationWarning>{dateKicker}</div>
      <h1 className={styles.greeting} suppressHydrationWarning>
        {user ? `${greeting}, ${cap(user)}` : greeting}
      </h1>

      {resume && (
        <Link
          href={`/courses/${resume.course.slug}/lessons/${resume.lesson.file}`}
          className={styles.resume}
        >
          <span className={styles.resumeKicker}>
            {t("resumeKicker")} · {resume.course.title}
          </span>
          <span className={styles.resumeTitle}>
            {String(resume.index + 1).padStart(2, "0")} · {resume.lesson.title}
          </span>
          <span className={styles.resumeDesc}>{resume.course.description}</span>
          <span className={styles.resumeRow}>
            <span className={styles.bar}>
              <span className={styles.barFill} style={{ width: `${resume.cp.completionPct}%` }} />
            </span>
            <span className={styles.resumeButton}>{t("resume")}</span>
          </span>
        </Link>
      )}

      {progress && (
        <div className={styles.ribbon}>
          <div className={styles.streak}>
            <span className={styles.streakN}>{progress.streakDays}</span>
            <span className={styles.streakLabel}>{t("streak", { count: progress.streakDays })}</span>
          </div>
          <div className={styles.ribbonDivider} />
          {goal ? (
            <>
              <svg width="52" height="52" viewBox="0 0 100 100" className={styles.donut} aria-hidden="true">
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--track)" strokeWidth="11" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke="var(--accent)"
                  strokeWidth="11"
                  strokeLinecap="round"
                  strokeDasharray={RING}
                  strokeDashoffset={RING * (1 - goalPct / 100)}
                  transform="rotate(-90 50 50)"
                />
                <text x="50" y="57" textAnchor="middle" className={styles.donutText}>
                  {goalPct}
                </text>
              </svg>
              <div className={styles.goalText}>
                {t("weeklyGoal")}
                <br />
                <span>
                  {t("goalProgress", {
                    done: goalDone,
                    target: goal.target,
                    kind: td(`goalKind.${goal.kind}`),
                  })}
                </span>
              </div>
            </>
          ) : (
            <Link href="/dashboard" className={styles.setGoal}>
              {t("setGoal")}
            </Link>
          )}
          <MiniHeatmap activity={progress.dailyActivity} />
        </div>
      )}

      <div className={styles.shelfLabel}>{t("yourCourses")}</div>
      {courses.length === 0 ? (
        <p className={styles.empty}>{t("empty")}</p>
      ) : (
        <ul className={styles.shelf}>
          {courses.map((course) => {
            const cp = progress?.courses[course.slug];
            const next = nextLesson(course, cp);
            const pct = cp?.completionPct ?? 0;
            return (
              <li key={course.slug}>
                <Link href={`/courses/${course.slug}`} className={styles.card}>
                  <span className={styles.cardSpine} aria-hidden="true" />
                  <span className={styles.cardIcon}>
                    <CourseIcon id={getCourseIcon(course.slug)} size={24} />
                  </span>
                  <span className={styles.cardBody}>
                    <span className={styles.cardTitleRow}>
                      <span className={styles.cardTitle}>{course.title}</span>
                      {cp && <span className={styles.cardPct}>{pct}%</span>}
                    </span>
                    <span className={styles.cardMeta}>
                      {cp
                        ? `${cp.lessonsCompleted}/${cp.lessonsTotal}${next ? ` · ${t("next")}: ${next.lesson.title}` : ""}`
                        : course.description}
                    </span>
                    <span className={styles.cardBar}>
                      <span className={styles.barFill} style={{ width: `${pct}%` }} />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** The ribbon's 14-day activity strip, levels relative to the busiest day shown. */
function MiniHeatmap({ activity }: { activity: Record<string, number> }) {
  const [days, setDays] = useState<number[] | null>(null);
  useEffect(() => {
    const counts: number[] = [];
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - 13);
    for (let i = 0; i < 14; i++) {
      counts.push(activity[d.toISOString().slice(0, 10)] ?? 0);
      d.setUTCDate(d.getUTCDate() + 1);
    }
    setDays(counts);
  }, [activity]);

  if (!days) return <div className={styles.miniHeat} aria-hidden="true" />;
  const max = Math.max(...days);
  return (
    <div className={styles.miniHeat} aria-hidden="true">
      {days.map((count, i) => {
        const level = count === 0 || max === 0 ? 0 : Math.min(3, Math.max(1, Math.ceil((count / max) * 3)));
        return <span key={i} className={styles.miniCell} data-level={level} />;
      })}
    </div>
  );
}
