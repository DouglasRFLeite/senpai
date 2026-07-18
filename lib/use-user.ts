"use client";

import { useEffect, useState } from "react";
import { normalizeUserId } from "./user-id";

/**
 * The current Learner, shared across components. The id lives in localStorage
 * under `senpaiUser` (the exercise widget reads the same key); components stay
 * in sync via a window event, so picking or switching users never needs a reload.
 */

export const USER_STORAGE_KEY = "senpaiUser";
const USER_CHANGED_EVENT = "senpai:user";

function readStoredUser(): string | null {
  try {
    // Normalize on the way out too: a hand-edited value must not bypass the rule.
    return normalizeUserId(localStorage.getItem(USER_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStoredUser(id: string | null): void {
  try {
    if (id === null) localStorage.removeItem(USER_STORAGE_KEY);
    else localStorage.setItem(USER_STORAGE_KEY, id);
  } catch {
    // localStorage unavailable — the picker will simply reappear next visit
  }
  window.dispatchEvent(new Event(USER_CHANGED_EVENT));
}

export function useUser(): {
  user: string | null;
  ready: boolean;
  setUser: (name: string) => void;
  clearUser: () => void;
} {
  const [user, setUserState] = useState<string | null>(null);
  // `ready` flips after the first client read — SSR knows nothing about the Learner.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => setUserState(readStoredUser());
    sync();
    setReady(true);
    window.addEventListener(USER_CHANGED_EVENT, sync);
    window.addEventListener("storage", sync); // other tabs
    return () => {
      window.removeEventListener(USER_CHANGED_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return {
    user,
    ready,
    setUser: (name: string) => {
      const id = normalizeUserId(name);
      if (id) writeStoredUser(id);
    },
    clearUser: () => writeStoredUser(null),
  };
}
