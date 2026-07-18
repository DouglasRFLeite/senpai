"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Course } from "@/lib/courses";
import type { BankQuestion } from "@/lib/bank-core";
import { PracticeSection } from "@/components/PracticeSection";
import { ExportReport } from "@/components/ExportReport";
import { Stamp } from "@/components/Stamp";
import { useProgress } from "@/components/useProgress";
import styles from "@/styles/Course.module.css";

/** One course: a paper sheet on the desk — header, lesson rows, practice, export. */
export function CourseView({
  course,
  hasResources,
  bank = [],
  openPass = 0.6,
}: {
  course: Course;
  hasResources: boolean;
  bank?: BankQuestion[];
  openPass?: number;
}) {
  const t = useTranslations("course");
  const progress = useProgress();
  const cp = progress?.courses[course.slug];
  const currentIndex = cp ? course.lessons.findIndex((l) => !cp.lessons[l.file]?.completed) : -1;

  return (
    <div className={styles.page}>
      <Link href="/" className={styles.back}>
        ← {t("back")}
      </Link>
      <div className={styles.paper}>
        <header className={styles.header}>
          <div className={styles.kickerRow}>
            <span className={styles.kickerChip} aria-hidden="true" />
            <span className={styles.kicker}>{t("kicker")}</span>
          </div>
          <h1 className={styles.title}>{course.title}</h1>
          <p className={styles.description}>{course.description}</p>
          {cp && cp.lessonsTotal > 0 && (
            <div className={styles.progressRow}>
              <span className={styles.bar}>
                <span className={styles.barFill} style={{ width: `${cp.completionPct}%` }} />
              </span>
              <span className={styles.progressLabel}>
                {t("lessonsOf", { done: cp.lessonsCompleted, total: cp.lessonsTotal })}
              </span>
            </div>
          )}
        </header>
        <div className={styles.body}>
          <div className={styles.sectionLabel}>{t("lessonsLabel")}</div>
          <ol className={styles.lessons}>
            {course.lessons.map((lesson, i) => {
              const done = cp?.lessons[lesson.file]?.completed === true;
              const current = i === currentIndex;
              return (
                <li key={lesson.file}>
                  <Link
                    href={`/courses/${course.slug}/lessons/${lesson.file}`}
                    className={`${styles.lesson} ${current ? styles.lessonCurrent : ""}`}
                  >
                    <span className={styles.n}>{String(i + 1).padStart(2, "0")}</span>
                    <span className={styles.lessonTitle}>{lesson.title}</span>
                    {done && <Stamp seed={lesson.file} size={26}>✓</Stamp>}
                    {current && <span className={styles.continuePill}>{t("continue")}</span>}
                  </Link>
                </li>
              );
            })}
          </ol>
          {hasResources && (
            <Link href={`/courses/${course.slug}/resources`} className={styles.references}>
              {t("references")}
            </Link>
          )}
          <PracticeSection courseSlug={course.slug} bank={bank} openPass={openPass} />
          <ExportReport
            courseTitle={course.title}
            courseSlug={course.slug}
            lessons={course.lessons.map((l) => ({ file: l.file, title: l.title }))}
            progress={progress}
          />
        </div>
      </div>
    </div>
  );
}
