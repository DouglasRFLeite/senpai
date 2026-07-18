import type { CSSProperties, ReactNode } from "react";
import styles from "@/styles/Stamp.module.css";

/** Deterministic per-seed jitter so repeat stamps don't look identically pressed. */
function hash(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * The one signature flourish (see frontend redesign notes): a hand-stamped ink
 * mark for completed lessons and earned badges. `seed` drives a small unique
 * rotation + edge irregularity per instance so a row of stamps reads as
 * pressed by hand, not copy-pasted. `dim` renders the unearned/locked state.
 */
export function Stamp({
  seed,
  children,
  size = 40,
  dim = false,
  className,
}: {
  seed: string;
  children: ReactNode;
  size?: number;
  dim?: boolean;
  className?: string;
}) {
  const h = hash(seed);
  const rotation = (h % 17) - 8; // -8..8deg
  const r1 = 47 + (h % 6);
  const r2 = 47 + ((h >> 3) % 6);
  const r3 = 47 + ((h >> 6) % 6);
  const r4 = 47 + ((h >> 9) % 6);

  const style = {
    width: size,
    height: size,
    fontSize: size * 0.42,
    "--stamp-rot": `${rotation}deg`,
    "--stamp-radius": `${r1}% ${100 - r1}% ${r3}% ${100 - r3}% / ${r2}% ${r4}% ${100 - r4}% ${100 - r2}%`,
  } as CSSProperties;

  return (
    <span className={`${styles.stamp} ${dim ? styles.dim : ""} ${className ?? ""}`} style={style} aria-hidden="true">
      <span className={styles.mark}>{children}</span>
    </span>
  );
}
