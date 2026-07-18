"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";

export const THEME_STORAGE_KEY = "senpai-theme";

/**
 * Desk light switch: swaps `data-theme` on <html> and persists the choice.
 * The blocking script in layout.tsx applies the stored theme before paint;
 * this component only reads it back after mount, so SSR always renders the
 * dark-default label and corrects itself on hydration.
 */
export function ThemeToggle() {
  const t = useTranslations("nav");
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // localStorage unavailable — the toggle still works for this visit
    }
    setTheme(next);
  };

  return (
    <button type="button" className="theme-toggle" onClick={toggle} title={t("themeToggle")}>
      {theme === "dark" ? <>☀ {t("themeLight")}</> : <>☾ {t("themeDark")}</>}
    </button>
  );
}
