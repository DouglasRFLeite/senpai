"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useUser } from "@/lib/use-user";
import { useProgress } from "@/components/useProgress";
import { Stamp } from "@/components/Stamp";
import type { CourseSummary } from "@/lib/courses";
import type { Badge } from "@/lib/badges";
import type { Heatmap } from "@/lib/heatmap";
import type { Goal, GoalKind } from "@/lib/goals";
import styles from "@/styles/Dashboard.module.css";

interface DashboardData {
  badges: Badge[];
  heatmap: Heatmap;
  longestStreak: number;
}

/** The motivation dashboard: stat tiles, heatmap, accuracy, seals, goal. */
export function DashboardView({ courses = [] }: { courses?: CourseSummary[] }) {
  const t = useTranslations("dashboard");
  const { user } = useUser();
  const progress = useProgress();
  const [data, setData] = useState<DashboardData | null>(null);
  const [goal, setGoal] = useState<Goal | null>(null);
  const [goalProgress, setGoalProgress] = useState(0);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    fetch(`/api/dashboard?u=${encodeURIComponent(user)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => alive && setData(d))
      .catch(() => {});
    fetch(`/api/goals?u=${encodeURIComponent(user)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d) {
          setGoal(d.goal);
          setGoalProgress(d.progress);
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  if (!user || !progress || !data) return <p className={styles.loading}>{t("loading")}</p>;

  // Session-layer totals: every Bank answer across courses.
  const perCourse = Object.values(progress.courses).map((c) => {
    let answered = 0;
    let correct = 0;
    for (const s of c.sessions) {
      answered += s.answered;
      correct += s.correct;
    }
    return { slug: c.slug, answered, correct };
  });
  const answered = perCourse.reduce((n, c) => n + c.answered, 0);
  const correct = perCourse.reduce((n, c) => n + c.correct, 0);
  const accuracy = answered > 0 ? Math.round((100 * correct) / answered) : null;

  const courseTitle = (slug: string) => courses.find((c) => c.slug === slug)?.title ?? slug;
  const accuracyRows = perCourse
    .filter((c) => c.answered > 0)
    .map((c) => ({ slug: c.slug, title: courseTitle(c.slug), pct: Math.round((100 * c.correct) / c.answered) }))
    .sort((a, b) => b.pct - a.pct);

  const sessions = Object.values(progress.courses)
    .flatMap((c) => c.sessions.map((s) => ({ ...s, courseSlug: c.slug })))
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, 5);

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>{t("title")}</h1>

      <dl className={styles.stats}>
        <div className={styles.stat}>
          <dd>{progress.streakDays}</dd>
          <dt>{t("dayStreak")}</dt>
        </div>
        <div className={styles.stat}>
          <dd>{accuracy === null ? "—" : `${accuracy}%`}</dd>
          <dt>{t("accuracy")}</dt>
        </div>
        <div className={styles.stat}>
          <dd>{answered}</dd>
          <dt>{t("questions")}</dt>
        </div>
        <div className={styles.stat}>
          <dd>{goal ? `${goalProgress}/${goal.target}` : "—"}</dd>
          <dt>{t("weeklyGoalTile")}</dt>
        </div>
      </dl>

      <div className={styles.columns}>
        <section className={styles.card}>
          <h2 className={styles.cardLabel}>{t("activity")}</h2>
          <HeatmapGrid heatmap={data.heatmap} />
          <div className={styles.legend}>
            {t("less")}
            <span className={styles.legendCell} data-level="0" />
            <span className={styles.legendCell} data-level="1" />
            <span className={styles.legendCell} data-level="2" />
            <span className={styles.legendCell} data-level="4" />
            {t("more")}
          </div>
        </section>
        <section className={styles.card}>
          <h2 className={styles.cardLabel}>{t("accuracyByCourse")}</h2>
          {accuracyRows.length === 0 ? (
            <p className={styles.emptyNote}>—</p>
          ) : (
            <div className={styles.accuracyList}>
              {accuracyRows.map((row) => (
                <div key={row.slug}>
                  <div className={styles.accuracyHead}>
                    {row.title}
                    <span>{row.pct}%</span>
                  </div>
                  <div className={styles.accuracyBar}>
                    <span style={{ width: `${row.pct}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section>
        <h2 className={styles.sectionTitle}>{t("badges")}</h2>
        <ul className={styles.badges}>
          {data.badges.map((b) => (
            <li
              key={b.id}
              className={b.earnedAt ? styles.badge : `${styles.badge} ${styles.badgeLocked}`}
              title={b.earnedAt ? t("earnedOn", { date: b.earnedAt.slice(0, 10) }) : t(`badge.${b.id}.description`)}
            >
              <Stamp seed={b.id} size={56} dim={!b.earnedAt}>{b.emoji}</Stamp>
              <span className={styles.badgeName}>{t(`badge.${b.id}.name`)}</span>
            </li>
          ))}
        </ul>
      </section>

      <GoalRing
        user={user}
        goal={goal}
        progress={goalProgress}
        onSaved={(g, p) => {
          setGoal(g);
          setGoalProgress(p);
        }}
      />

      {sessions.length > 0 && (
        <section>
          <h2 className={styles.sectionTitle}>{t("recentSessions")}</h2>
          <ul className={styles.sessions}>
            {sessions.map((s) => (
              <li key={s.sessionId}>
                <Link href={`/courses/${s.courseSlug}`}>
                  <span className={styles.sessionKind}>{s.kind ? t(`kind.${s.kind}`) : "—"}</span>
                  <span>{courseTitle(s.courseSlug)}</span>
                  <span className={styles.sessionScore}>
                    {s.answered > 0 ? `${s.scorePct}%` : "—"}
                    {!s.finishedAt && ` · ${t("abandoned")}`}
                  </span>
                  <span className={styles.sessionDate}>{s.startedAt.slice(0, 10)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function HeatmapGrid({ heatmap }: { heatmap: Heatmap }) {
  const t = useTranslations("dashboard");
  return (
    <div className={styles.heatmapScroll}>
      <div className={styles.heatmap}>
        {heatmap.weeks.map((week, wi) => (
          <div key={wi} className={styles.heatWeek}>
            {week.map((day, di) =>
              day === null ? (
                <span key={di} className={styles.heatPad} />
              ) : (
                <span
                  key={di}
                  className={styles.heatCell}
                  data-level={day.level}
                  title={`${day.date} — ${t("activityCount", { count: day.count })}`}
                />
              ),
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function GoalRing({
  user,
  goal,
  progress,
  onSaved,
}: {
  user: string;
  goal: Goal | null;
  progress: number;
  onSaved: (g: Goal, progress: number) => void;
}) {
  const t = useTranslations("dashboard");
  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState<GoalKind>(goal?.kind ?? "questions");
  const [target, setTarget] = useState(goal?.target ?? 20);

  const save = async () => {
    const r = await fetch("/api/goals", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user, kind, target }),
    }).catch(() => null);
    if (r?.ok) {
      const d = await r.json();
      setEditing(false);
      // Re-read progress for the (possibly changed) kind.
      const g = await fetch(`/api/goals?u=${encodeURIComponent(user)}`).then((x) => (x.ok ? x.json() : null)).catch(() => null);
      onSaved(d.goal, g?.progress ?? 0);
    }
  };

  const pct = goal ? Math.min(1, progress / goal.target) : 0;
  const R = 44;
  const C = 2 * Math.PI * R;

  return (
    <section>
      <h2 className={styles.sectionTitle}>{t("weeklyGoal")}</h2>
      <div className={styles.goalRow}>
        {goal ? (
          <div className={styles.ringWrap}>
            <svg viewBox="0 0 100 100" className={styles.ring} role="img" aria-label={t("goalLabel", { progress, target: goal.target })}>
              <circle cx="50" cy="50" r={R} className={styles.ringTrack} />
              <circle
                cx="50"
                cy="50"
                r={R}
                className={styles.ringFill}
                strokeDasharray={C}
                strokeDashoffset={C * (1 - pct)}
              />
              <text x="50" y="47" textAnchor="middle" className={styles.ringBig}>
                {progress}/{goal.target}
              </text>
              <text x="50" y="63" textAnchor="middle" className={styles.ringSmall}>
                {t(`goalKind.${goal.kind}`)}
              </text>
            </svg>
          </div>
        ) : (
          <p className={styles.noGoal}>{t("noGoal")}</p>
        )}

        {editing ? (
          <div className={styles.goalForm}>
            <select value={kind} onChange={(e) => setKind(e.target.value as GoalKind)}>
              <option value="questions">{t("goalKind.questions")}</option>
              <option value="lessons">{t("goalKind.lessons")}</option>
            </select>
            <input
              type="number"
              min={1}
              max={10000}
              value={target}
              onChange={(e) => setTarget(parseInt(e.target.value || "0", 10))}
            />
            <button className={styles.goalSave} onClick={save} disabled={!Number.isInteger(target) || target < 1}>
              {t("save")}
            </button>
          </div>
        ) : (
          <button className={styles.goalEdit} onClick={() => setEditing(true)}>
            {goal ? t("editGoal") : t("setGoal")}
          </button>
        )}
      </div>
    </section>
  );
}
