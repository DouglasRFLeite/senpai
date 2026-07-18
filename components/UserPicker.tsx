"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useUser } from "@/lib/use-user";
import { normalizeUserId } from "@/lib/user-id";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * "Who is studying?" overlay. Blocks the app until a Learner is picked:
 * existing Learners from /api/users as one-tap buttons, plus free-text entry
 * for a new name. No auth by design.
 */
export function UserPicker() {
  const { user, ready, setUser } = useUser();
  const t = useTranslations("userPicker");
  const [users, setUsers] = useState<string[]>([]);
  const [name, setName] = useState("");

  const open = ready && !user;

  useEffect(() => {
    if (!open) return;
    let alive = true;
    fetch("/api/users", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        if (alive && Array.isArray(list)) setUsers(list);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [open]);

  if (!open) return null;

  const submit = () => {
    if (normalizeUserId(name)) setUser(name);
  };

  return (
    <div className="user-overlay" role="dialog" aria-modal="true" aria-label={t("title")}>
      <div className="user-modal">
        <h2>{t("title")}</h2>
        <p>{t("subtitle")}</p>
        {users.length > 0 && (
          <>
            <div className="user-list">
              {users.map((u) => (
                <button key={u} className="user-pick" onClick={() => setUser(u)}>
                  {cap(u)}
                </button>
              ))}
            </div>
            <div className="user-divider">{t("or")}</div>
          </>
        )}
        <div className="user-new">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            placeholder={t("placeholder")}
            maxLength={64}
            autoComplete="off"
            autoFocus
          />
          <button className="user-start" onClick={submit} disabled={!normalizeUserId(name)}>
            {t("start")}
          </button>
        </div>
      </div>
    </div>
  );
}
