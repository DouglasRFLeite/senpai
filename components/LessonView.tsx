"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import type { LessonDoc } from "teachdown";
import { Ordering, Quiz, renderMdast } from "teachdown/react";
import type { Lesson } from "@/lib/courses";
import { StaticBlock } from "@/components/TeachdownBlocks";
import { Stamp } from "@/components/Stamp";
import { useProgress } from "@/components/useProgress";
import { emitEvent } from "@/lib/emit-event";
import { useUser } from "@/lib/use-user";
import styles from "@/styles/Lesson.module.css";

export interface NavLink {
  href: string;
  label: string;
}

const TOC_STORAGE_KEY = "senpai-toc-open";

/**
 * One Teachdown lesson: a paper sheet full-bleed on the desk — a
 * collapsible TOC spine, the reading column, and a floating dark control pill
 * (position, prev, mark done). Event semantics are the exercise.js contract:
 * `lesson_viewed` on load, `quiz_answered` per click, `lesson_completed` once
 * every quiz question is resolved OR on "Mark done" — all keyed by the Learner
 * in localStorage; no Learner, no events.
 */
export function LessonView({
  courseSlug,
  stem,
  courseTitle,
  lessonNumber,
  lessons,
  doc,
  prev,
  next,
  related,
}: {
  courseSlug: string;
  stem: string;
  courseTitle: string;
  lessonNumber: number;
  lessons: Lesson[];
  doc: LessonDoc;
  prev: NavLink | null;
  next: NavLink | null;
  related: NavLink[];
}) {
  const t = useTranslations("lesson");
  const locale = useLocale();
  const { user, ready } = useUser();
  const progress = useProgress();
  const cp = progress?.courses[courseSlug];

  const emit = (kind: string, extra: Record<string, unknown> = {}) => {
    if (!user) return;
    emitEvent({ userId: user, courseSlug, lessonFile: stem, kind, ...extra });
  };

  const viewedFor = useRef<string | null>(null);
  useEffect(() => {
    if (!ready || !user || viewedFor.current === user) return;
    viewedFor.current = user;
    emitEvent({ userId: user, courseSlug, lessonFile: stem, kind: "lesson_viewed" });
  }, [ready, user, courseSlug, stem]);

  const quizTotal = useMemo(() => doc.blocks.filter((b) => b.type === "quiz").length, [doc]);
  const [resolved, setResolved] = useState<ReadonlySet<string>>(new Set());
  const [markedDone, setMarkedDone] = useState(false);
  const completedNow = quizTotal > 0 && resolved.size === quizTotal;
  const completionSent = useRef(false);
  useEffect(() => {
    if (!completedNow || completionSent.current || !user) return;
    completionSent.current = true;
    emitEvent({ userId: user, courseSlug, lessonFile: stem, kind: "lesson_completed" });
  }, [completedNow, user, courseSlug, stem]);

  const lessonState = cp?.lessons[stem];
  const completed = completedNow || markedDone || lessonState?.completed === true;

  const markDone = () => {
    if (!user || completed) return;
    setMarkedDone(true);
    if (!completionSent.current) {
      completionSent.current = true;
      emitEvent({ userId: user, courseSlug, lessonFile: stem, kind: "lesson_completed" });
    }
  };

  // TOC spine, persisted per session. SSR renders it open; the stored state
  // applies after mount.
  const [tocOpen, setTocOpen] = useState(true);
  useEffect(() => {
    try {
      setTocOpen(sessionStorage.getItem(TOC_STORAGE_KEY) !== "0");
    } catch {}
  }, []);
  const toggleToc = () => {
    setTocOpen((open) => {
      try {
        sessionStorage.setItem(TOC_STORAGE_KEY, open ? "0" : "1");
      } catch {}
      return !open;
    });
  };

  const donePct =
    cp && cp.lessonsTotal > 0
      ? cp.completionPct
      : Math.round((100 * (lessonNumber - 1)) / Math.max(1, lessons.length));

  const completedDate =
    completed && lessonState?.completedAt
      ? new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(
          new Date(lessonState.completedAt),
        )
      : null;

  const quizLabels = {
    correct: t("quizCorrect"),
    retry: t("quizRetry"),
    revealed: t("quizRevealed"),
  };
  const orderingLabels = {
    next: t("orderingNext"),
    done: t("orderingDone"),
    wrong: t("orderingWrong"),
  };
  const widgetClasses = {
    root: styles.quiz,
    prompt: styles.quizPrompt,
    option: styles.quizOption,
    rank: styles.rank,
    feedback: styles.feedback,
  };

  const nn = String(lessonNumber).padStart(2, "0");
  const kickerRest = [doc.frontmatter.unit, courseTitle].filter(Boolean).join(" · ");

  return (
    <div className={styles.desk}>
      <div className={styles.sheet}>
        {tocOpen ? (
          <aside className={styles.toc}>
            <div className={styles.tocTop}>
              <Link href={`/courses/${courseSlug}`} className={styles.tocBack}>
                ← {courseTitle}
              </Link>
              <button type="button" className={styles.tocBtn} onClick={toggleToc} title={t("collapseToc")}>
                ⇤
              </button>
            </div>
            <div className={styles.tocBar}>
              <span className={styles.tocBarFill} style={{ width: `${donePct}%` }} />
            </div>
            <div className={styles.tocMeta}>
              {cp
                ? t("tocProgress", { done: cp.lessonsCompleted, total: cp.lessonsTotal })
                : t("tocProgress", { done: lessonNumber, total: lessons.length })}
            </div>
            <nav className={styles.tocList}>
              {lessons.map((lesson, i) => {
                const isDone = cp?.lessons[lesson.file]?.completed === true;
                const isCurrent = lesson.file === stem;
                return (
                  <Link
                    key={lesson.file}
                    href={`/courses/${courseSlug}/lessons/${lesson.file}`}
                    className={`${styles.tocRow} ${isCurrent ? styles.tocRowCurrent : ""} ${isDone ? styles.tocRowDone : ""}`}
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    <span className={styles.tocN}>{String(i + 1).padStart(2, "0")}</span>
                    <span className={styles.tocRowTitle}>{lesson.title}</span>
                    {isDone && <span className={styles.tocCheck}>✓</span>}
                  </Link>
                );
              })}
            </nav>
          </aside>
        ) : (
          <aside className={styles.tocRail}>
            <button type="button" className={styles.tocBtn} onClick={toggleToc} title={t("expandToc")}>
              ⇥
            </button>
            <span className={styles.railDivider} aria-hidden="true" />
            {lessons.map((lesson, i) => {
              const isDone = cp?.lessons[lesson.file]?.completed === true;
              const isCurrent = lesson.file === stem;
              return (
                <Link
                  key={lesson.file}
                  href={`/courses/${courseSlug}/lessons/${lesson.file}`}
                  className={`${styles.dot} ${isDone ? styles.dotDone : ""} ${isCurrent ? styles.dotCurrent : ""}`}
                  title={`${String(i + 1).padStart(2, "0")} · ${lesson.title}`}
                  aria-current={isCurrent ? "page" : undefined}
                />
              );
            })}
            <span className={styles.railLabel}>
              {courseTitle} · {nn}
            </span>
          </aside>
        )}

        <div className={styles.reading}>
          <article className={styles.article}>
            <p className={styles.kicker}>
              <span className={styles.kickerN}>{t("lessonN", { n: nn })}</span>
              {kickerRest && <> · {kickerRest}</>}
            </p>
            <h1 className={styles.title}>{doc.frontmatter.title}</h1>
            <div className={styles.doc}>
              {doc.blocks.map((block, i) => {
                if (block.type === "quiz") {
                  return (
                    <Quiz
                      key={i}
                      questionId={block.id}
                      prompt={renderMdast(block.prompt)}
                      options={block.options.map((o) => ({ correct: o.correct, content: renderMdast(o.content) }))}
                      labels={quizLabels}
                      classes={widgetClasses}
                      onAnswered={({ questionId, correct, attempts }) =>
                        emit("quiz_answered", { questionId, correct, attempts })
                      }
                      onResolved={(id) => setResolved((prevSet) => new Set(prevSet).add(id))}
                    />
                  );
                }
                if (block.type === "ordering") {
                  return (
                    <Ordering
                      key={i}
                      prompt={renderMdast(block.prompt)}
                      items={block.items.map((item) => renderMdast(item))}
                      displayOrder={seededShuffle(block.items.length, `${stem}#${i}`)}
                      labels={orderingLabels}
                      classes={widgetClasses}
                    />
                  );
                }
                return <StaticBlock key={i} block={block} sourceTitle={t("sourceTitle")} />;
              })}
            </div>
            {completed && (
              <p className={styles.completed}>
                <Stamp seed={stem} size={30}>✓</Stamp>
                {t("completed")}
                {completedDate && ` · ${completedDate}`}
              </p>
            )}
            <p className={styles.teacherNudge}>{t("teacherNudge")}</p>
            {related.length > 0 && (
              <nav className={styles.related}>
                <span className={styles.relatedTitle}>{t("related")}</span>
                {related.map((link) => (
                  <Link key={link.href} href={link.href}>
                    {link.label} ↗
                  </Link>
                ))}
              </nav>
            )}
            {(prev || next) && (
              <nav className={styles.lessonLinks}>
                <span>{prev && <>{t("prev")}: <Link href={prev.href}>{prev.label}</Link></>}</span>
                <span>{next && <>{t("next")}: <Link href={next.href}>{next.label}</Link></>}</span>
              </nav>
            )}
          </article>
        </div>

        {/* Floating control — always dark for contrast, brass hardware. */}
        <div className={styles.pill}>
          <span className={styles.pillPos}>
            {nn} / {lessons.length}
          </span>
          <span className={styles.pillBar}>
            <span className={styles.pillBarFill} style={{ width: `${donePct}%` }} />
          </span>
          <Link href={prev ? prev.href : `/courses/${courseSlug}`} className={styles.pillPrev}>
            ← {t("prev")}
          </Link>
          <button
            type="button"
            className={styles.pillDone}
            onClick={markDone}
            disabled={completed || !user}
          >
            {completed ? "✓" : t("markDone")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Deterministic presentation shuffle — stable across server render and hydration. */
function seededShuffle(n: number, seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) | 0;
  h = h >>> 0;
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    h = (h * 1664525 + 1013904223) >>> 0;
    const j = h % (i + 1);
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
