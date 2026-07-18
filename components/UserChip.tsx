"use client";

import { useTranslations } from "next-intl";
import { useUser } from "@/lib/use-user";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** Header affordance: who is studying + one tap to switch (reopens the picker). */
export function UserChip() {
  const { user, ready, clearUser } = useUser();
  const t = useTranslations("userPicker");

  if (!ready || !user) return null;

  return (
    <button className="user-chip" onClick={clearUser} title={t("switch")}>
      {cap(user)} ↺
    </button>
  );
}
