"use client";

import { useEffect, useState } from "react";
import type { ProgressSummary } from "@/lib/progress";
import { useUser } from "@/lib/use-user";

/**
 * Client-side progress fetch for the current Learner. Content pages are static;
 * progress is per-Learner runtime state, so it hydrates after mount. Returns
 * null until loaded (or while no Learner is picked) — callers render nothing.
 */
export function useProgress(): ProgressSummary | null {
  const { user } = useUser();
  const [data, setData] = useState<ProgressSummary | null>(null);

  useEffect(() => {
    if (!user) {
      setData(null);
      return;
    }
    let alive = true;
    fetch(`/api/progress?u=${encodeURIComponent(user)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive) setData(d);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [user]);

  return data;
}
