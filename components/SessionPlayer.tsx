"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { BankQuestion, McQuestion, OpenQuestion } from "@/lib/bank-core";
import {
  answerMc,
  answerOpen,
  current,
  results,
  type Outcome,
  type OpenOutcome,
  type SessionState,
} from "@/lib/session";
import type { CriterionMark } from "@/lib/progress";
import { useUser } from "@/lib/use-user";
import { emitEvent } from "@/lib/emit-event";
import styles from "@/styles/Session.module.css";

type Phase = "asking" | "grading" | "selfassess" | "feedback";

/**
 * The Session player: one Question per card, mobile-first. MC is
 * single-attempt with immediate reveal; Open goes through the Grader and falls
 * back to Self-Assessment when it's down. Every answer is emitted
 * before the next card, so abandoning loses nothing.
 */
export function SessionPlayer({
  courseSlug,
  initial,
  onExit,
}: {
  courseSlug: string;
  initial: SessionState;
  onExit: () => void;
}) {
  const t = useTranslations("session");
  const { user } = useUser();
  const [s, setS] = useState(initial);
  const [phase, setPhase] = useState<Phase>("asking");
  const [draft, setDraft] = useState("");
  const [ticks, setTicks] = useState<boolean[]>([]);
  const [justification, setJustification] = useState("");
  const [finishedEmitted, setFinishedEmitted] = useState(false);

  const q = current(s);
  const last = s.outcomes[s.outcomes.length - 1];

  const base = { userId: user, courseSlug, sessionId: s.sessionId, sessionKind: s.kind };

  const chooseMc = (i: number) => {
    if (phase !== "asking" || !q || q.type !== "mc") return;
    const next = answerMc(s, i);
    const o = next.outcomes[next.outcomes.length - 1];
    emitEvent({ ...base, kind: "question_answered", questionId: q.id, correct: (o as { correct: boolean }).correct });
    setS(next);
    setPhase("feedback");
  };

  const settleOpen = (answerText: string, score: number, marks: CriterionMark[], selfAssessed: boolean) => {
    const next = answerOpen(s, { answerText, score, criteriaMarks: marks, selfAssessed });
    const o = next.outcomes[next.outcomes.length - 1] as OpenOutcome;
    emitEvent({ ...base, kind: "question_answered", questionId: o.questionId, correct: o.passed, answerText });
    emitEvent({
      ...base,
      kind: "question_graded",
      questionId: o.questionId,
      score,
      criteria: { marks, selfAssessed },
    });
    setS(next);
    setPhase("feedback");
    setDraft("");
    setTicks([]);
  };

  const submitOpen = async () => {
    if (!q || q.type !== "open" || draft.trim() === "") return;
    const oq = q as OpenQuestion;
    setPhase("grading");
    try {
      const r = await fetch("/api/grade", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stem: oq.stem, modelAnswer: oq.modelAnswer, criteria: oq.criteria, answer: draft }),
      });
      if (!r.ok) throw new Error(`grade ${r.status}`);
      const g = (await r.json()) as { score: number; criteria: CriterionMark[]; justification: string };
      setJustification(g.justification);
      settleOpen(draft, Math.min(1, Math.max(0, g.score)), g.criteria, false);
    } catch {
      // Grader down → Self-Assessment: the Learner marks the Criteria they hit.
      setTicks(oq.criteria.map(() => false));
      setPhase("selfassess");
    }
  };

  const confirmSelfAssess = () => {
    if (!q || q.type !== "open") return;
    const oq = q as OpenQuestion;
    const score = Math.round((10 * ticks.filter(Boolean).length) / oq.criteria.length) / 10;
    setJustification("");
    settleOpen(draft, score, oq.criteria.map((c, i) => ({ criterion: c, met: ticks[i] })), true);
  };

  const nextCard = () => {
    setPhase("asking");
    setJustification("");
    if (!current(s) && !finishedEmitted) {
      emitEvent({ ...base, kind: "session_finished" });
      setFinishedEmitted(true);
    }
  };

  /* ---------------- Results Panel ---------------- */
  if (!q && phase === "asking") {
    return <ResultsPanel s={s} onExit={onExit} />;
  }

  const idx = s.outcomes.length + (phase === "feedback" ? 0 : 1);

  return (
    <div className={styles.player}>
      <header className={styles.playerBar}>
        <button className={styles.abandon} onClick={onExit} aria-label={t("abandon")}>✕</button>
        <span className={styles.counter}>{Math.min(idx, s.deck.length)}/{s.deck.length}</span>
        <span className={styles.kindTag}>{t(s.kind)}</span>
      </header>

      {phase === "feedback" && last ? (
        <FeedbackCard
          outcome={last}
          question={s.deck[s.outcomes.length - 1]}
          justification={justification}
          isLast={current(s) === null}
          onNext={nextCard}
        />
      ) : q!.type === "mc" ? (
        <div className={styles.card}>
          <p className={styles.stem}>{q!.stem}</p>
          <div className={styles.options}>
            {(q as McQuestion).options.map((opt, i) => (
              <button key={i} className={styles.option} onClick={() => chooseMc(i)}>
                {opt}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          <p className={styles.stem}>{q!.stem}</p>
          {phase === "asking" && (
            <>
              <textarea
                className={styles.answerBox}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={t("openPlaceholder")}
                rows={6}
              />
              <button className={styles.primary} onClick={submitOpen} disabled={draft.trim() === ""}>
                {t("submit")}
              </button>
            </>
          )}
          {phase === "grading" && <p className={styles.grading}>{t("grading")}</p>}
          {phase === "selfassess" && (
            <div className={styles.selfAssess}>
              <p className={styles.selfAssessNote}>{t("graderDown")}</p>
              <div className={styles.modelAnswer}>
                <h3>{t("modelAnswer")}</h3>
                <p>{(q as OpenQuestion).modelAnswer}</p>
              </div>
              <p className={styles.selfAssessAsk}>{t("selfAssessAsk")}</p>
              {(q as OpenQuestion).criteria.map((c, i) => (
                <label key={i} className={styles.tick}>
                  <input
                    type="checkbox"
                    checked={ticks[i] ?? false}
                    onChange={(e) => setTicks(ticks.map((v, k) => (k === i ? e.target.checked : v)))}
                  />
                  <span>{c}</span>
                </label>
              ))}
              <button className={styles.primary} onClick={confirmSelfAssess}>
                {t("confirm")}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FeedbackCard({
  outcome,
  question,
  justification,
  isLast,
  onNext,
}: {
  outcome: Outcome;
  question: BankQuestion;
  justification: string;
  isLast: boolean;
  onNext: () => void;
}) {
  const t = useTranslations("session");

  if (outcome.type === "mc" && question.type === "mc") {
    return (
      <div className={styles.card}>
        <p className={styles.stem}>{question.stem}</p>
        <div className={styles.options}>
          {question.options.map((opt, i) => (
            <span
              key={i}
              className={[
                styles.option,
                styles.optionRevealed,
                i === question.correctIndex ? styles.optionCorrect : "",
                i === outcome.chosenIndex && !outcome.correct ? styles.optionWrong : "",
              ].join(" ")}
            >
              {opt}
            </span>
          ))}
        </div>
        <p className={outcome.correct ? styles.verdictOk : styles.verdictNo}>
          {outcome.correct ? t("correct") : t("incorrect")}
        </p>
        {question.explanation && <p className={styles.explanation}>{question.explanation}</p>}
        <button className={styles.primary} onClick={onNext}>
          {isLast ? t("seeResults") : t("next")}
        </button>
      </div>
    );
  }

  const o = outcome as OpenOutcome;
  return (
    <div className={styles.card}>
      <p className={styles.stem}>{question.stem}</p>
      <p className={o.passed ? styles.verdictOk : styles.verdictNo}>
        {t("openScore", { score: Math.round(o.score * 100) })} — {o.passed ? t("passed") : t("failed")}
        {o.selfAssessed ? ` (${t("selfAssessed")})` : ""}
      </p>
      <ul className={styles.criteriaList}>
        {o.criteriaMarks.map((m, i) => (
          <li key={i} className={m.met ? styles.criterionMet : styles.criterionMissed}>
            {m.met ? "✔" : "✘"} {m.criterion}
          </li>
        ))}
      </ul>
      {justification && <p className={styles.explanation}>{justification}</p>}
      {question.type === "open" && (
        <details className={styles.modelAnswerDetails}>
          <summary>{t("modelAnswer")}</summary>
          <p>{question.modelAnswer}</p>
        </details>
      )}
      <button className={styles.primary} onClick={onNext}>
        {isLast ? t("seeResults") : t("next")}
      </button>
    </div>
  );
}

function ResultsPanel({ s, onExit }: { s: SessionState; onExit: () => void }) {
  const t = useTranslations("session");
  const r = results(s);
  const byId = new Map(s.deck.map((q) => [q.id, q]));

  return (
    <div className={styles.player}>
      <div className={styles.card}>
        <h2 className={styles.resultsTitle}>{t("resultsTitle")}</h2>
        <p className={styles.resultsScore}>{r.scorePct}%</p>
        <p className={styles.resultsTotals}>
          {r.mc.total > 0 && t("mcTotals", { correct: r.mc.correct, total: r.mc.total })}
          {r.mc.total > 0 && r.open.total > 0 && " · "}
          {r.open.total > 0 && t("openTotals", { passed: r.open.passed, total: r.open.total })}
        </p>

        {r.struggles.length > 0 && (
          <div className={styles.struggles}>
            <h3>{t("struggleSpots")}</h3>
            <ul>
              {r.struggles.map((o) => (
                <li key={o.questionId}>{byId.get(o.questionId)?.topic} — {o.questionId}</li>
              ))}
            </ul>
          </div>
        )}

        <ul className={styles.reviewList}>
          {r.outcomes.map((o) => {
            const q = byId.get(o.questionId);
            if (!q) return null;
            const ok = o.type === "mc" ? o.correct : o.passed;
            return (
              <li key={o.questionId}>
                <details>
                  <summary className={ok ? styles.reviewOk : styles.reviewNo}>
                    {ok ? "✔" : "✘"} {o.questionId} · {q.topic}
                  </summary>
                  <p className={styles.stem}>{q.stem}</p>
                  {o.type === "mc" && q.type === "mc" && (
                    <p>
                      {t("yourAnswer")}: {q.options[o.chosenIndex]}
                      {!o.correct && <><br />{t("correctAnswer")}: {q.options[q.correctIndex]}</>}
                    </p>
                  )}
                  {o.type === "open" && (
                    <>
                      <p className={styles.reviewAnswer}>{o.answerText}</p>
                      <ul className={styles.criteriaList}>
                        {o.criteriaMarks.map((m, i) => (
                          <li key={i} className={m.met ? styles.criterionMet : styles.criterionMissed}>
                            {m.met ? "✔" : "✘"} {m.criterion}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </details>
              </li>
            );
          })}
        </ul>

        <button className={styles.primary} onClick={onExit}>
          {t("done")}
        </button>
      </div>
    </div>
  );
}
