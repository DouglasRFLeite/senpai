"use client";

/**
 * Fire-and-forget event delivery from the browser. A DB hiccup must never
 * break a Session — the server logs failures loudly on its side.
 */
export function emitEvent(payload: Record<string, unknown>): void {
  try {
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* best-effort */
  }
}
