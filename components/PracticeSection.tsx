"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { BankQuestion } from "@/lib/bank-core";
import { listTopics } from "@/lib/bank-core";
import { buildDeck, newSession, type SessionState } from "@/lib/session";
import type { SessionKind } from "@/lib/progress";
import { useUser } from "@/lib/use-user";
import { emitEvent } from "@/lib/emit-event";
import { SessionPlayer } from "@/components/SessionPlayer";
import styles from "@/styles/Session.module.css";

const PRACTICE_SIZES = [5, 10, 20];

/**
 * The Session builder, on the course page: Exam (the whole Bank, MC before
 * Open), Quick Practice (N random), Topic Drill.
 */
export function PracticeSection({
  courseSlug,
  bank,
  openPass,
}: {
  courseSlug: string;
  bank: BankQuestion[];
  openPass: number;
}) {
  const t = useTranslations("session");
  const { user } = useUser();
  const [session, setSession] = useState<SessionState | null>(null);
  const [showTopics, setShowTopics] = useState(false);
  const [showSizes, setShowSizes] = useState(false);

  if (bank.length === 0) return null;

  const mcCount = bank.filter((q) => q.type === "mc").length;
  const openCount = bank.length - mcCount;
  const topics = listTopics(bank).map((topic) => ({
    topic,
    count: bank.filter((q) => q.topic === topic).length,
  }));

  const start = (kind: SessionKind, opts: { n?: number; topic?: string } = {}) => {
    const deck = buildDeck(bank, { mode: kind, ...opts });
    if (deck.length === 0) return;
    const s = newSession(crypto.randomUUID(), kind, deck, openPass);
    emitEvent({ userId: user, courseSlug, sessionId: s.sessionId, kind: "session_started", sessionKind: kind });
    setSession(s);
    setShowTopics(false);
    setShowSizes(false);
  };

  if (session) {
    return (
      <SessionPlayer
        courseSlug={courseSlug}
        initial={session}
        onExit={() => setSession(null)}
      />
    );
  }

  return (
    <section className={styles.builder}>
      <h2 className={styles.builderTitle}>{t("practiceTitle")}</h2>
      <div className={styles.modes}>
        <button className={styles.mode} onClick={() => start("exam")}>
          <span className={styles.modeName}>{t("exam")}</span>
          <span className={styles.modeHint}>{t("examHint", { mc: mcCount, open: openCount })}</span>
        </button>
        <button className={styles.mode} onClick={() => { setShowSizes((v) => !v); setShowTopics(false); }}>
          <span className={styles.modeName}>{t("practice")}</span>
          <span className={styles.modeHint}>{t("practiceHint")}</span>
        </button>
        <button className={styles.mode} onClick={() => { setShowTopics((v) => !v); setShowSizes(false); }}>
          <span className={styles.modeName}>{t("topic")}</span>
          <span className={styles.modeHint}>{t("topicHint", { count: topics.length })}</span>
        </button>
      </div>
      {showSizes && (
        <div className={styles.pickList}>
          {PRACTICE_SIZES.map((n) => (
            <button key={n} className={styles.pick} onClick={() => start("practice", { n })}>
              {t("questions", { count: Math.min(n, bank.length) })}
            </button>
          ))}
        </div>
      )}
      {showTopics && (
        <div className={styles.pickList}>
          {topics.map(({ topic, count }) => (
            <button key={topic} className={styles.pick} onClick={() => start("topic", { topic })}>
              {topic} <span className={styles.pickCount}>{count}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
