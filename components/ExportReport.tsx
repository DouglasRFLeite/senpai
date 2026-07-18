"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { buildReport } from "@/lib/report";
import type { ProgressSummary } from "@/lib/progress";
import styles from "@/styles/Course.module.css";

interface Props {
  courseTitle: string;
  courseSlug: string;
  lessons: { file: string; title: string }[];
  progress: ProgressSummary | null;
}

/**
 * Exports the Markdown progress report the Learner pastes into Claude Code,
 * where /teach reads it (heading contract in lib/report.ts). Copy is primary;
 * a .md download is the fallback. An optional comment box rides along.
 */
export function ExportReport({ courseTitle, courseSlug, lessons, progress }: Props) {
  const t = useTranslations("export");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState<"" | "copied" | "downloaded">("");

  if (!progress) return null;

  const markdown = () =>
    buildReport({
      courseTitle,
      courseSlug,
      lessons,
      progress: progress.courses[courseSlug],
      streakDays: progress.streakDays,
      comment,
    });

  const download = () => {
    const blob = new Blob([markdown()], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `senpai-${courseSlug}-report.md`;
    a.click();
    URL.revokeObjectURL(url);
    setStatus("downloaded");
    setTimeout(() => setStatus(""), 2500);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown());
      setStatus("copied");
      setTimeout(() => setStatus(""), 2500);
    } catch {
      download(); // clipboard blocked — fall back to a file
    }
  };

  return (
    <section className={styles.export}>
      <p className={styles.exportKicker}>{t("kicker")}</p>
      <textarea
        className={styles.exportComment}
        placeholder={t("commentPlaceholder")}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={2}
      />
      <div className={styles.exportActions}>
        <button type="button" className={styles.exportPrimary} onClick={copy}>
          {status === "copied" ? t("copied") : t("copy")}
        </button>
        <button type="button" className={styles.exportSecondary} onClick={download}>
          {status === "downloaded" ? t("downloaded") : t("download")}
        </button>
      </div>
      <p className={styles.exportHint}>{t("hint")}</p>
    </section>
  );
}
