import type { ReactNode } from "react";
import type { CourseIconId } from "@/lib/theme";

const PATHS: Record<CourseIconId, ReactNode> = {
  coffee: (
    <>
      <path d="M4 8h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z" />
      <path d="M16 10h1.8a2.3 2.3 0 1 1 0 4.6H16" />
      <path d="M8 3.5c.6.9-.5 1.4 0 2.3M12 3.5c.6.9-.5 1.4 0 2.3" />
    </>
  ),
  circuit: (
    <>
      <rect x="2.5" y="9.5" width="5" height="5" />
      <rect x="9.5" y="3.5" width="5" height="5" />
      <rect x="16.5" y="9.5" width="5" height="5" />
      <path d="M7.5 10.5 9.5 7M14.5 7 16.5 10.5" />
    </>
  ),
  forest: <path d="M12 3 7.5 9.5h2L6.5 15h4.3v4.5h2.4V15h4.3l-3-5.5h2Z" />,
  ocean: (
    <>
      <path d="M2 9c1.8-1.3 3.6-1.3 5.4 0s3.6 1.3 5.4 0 3.6-1.3 5.4 0" />
      <path d="M2 14.2c1.8-1.3 3.6-1.3 5.4 0s3.6 1.3 5.4 0 3.6-1.3 5.4 0" />
      <path d="M2 19.4c1.8-1.3 3.6-1.3 5.4 0s3.6 1.3 5.4 0 3.6-1.3 5.4 0" />
    </>
  ),
  sunset: (
    <>
      <path d="M12 3v3M4.5 12H2M22 12h-2.5M5.8 5.8l1.8 1.8M16.4 7.6l1.8-1.8" />
      <path d="M6 15.5a6 6 0 0 1 12 0" />
      <path d="M2 19.5h20" />
    </>
  ),
  slate: (
    <>
      <path d="M4 5.5c2.2-1 5-1 8 .3v13c-3-1.3-5.8-1.3-8-.3Z" />
      <path d="M20 5.5c-2.2-1-5-1-8 .3v13c3-1.3 5.8-1.3 8-.3Z" />
    </>
  ),
};

export function CourseIcon({ id, size = 22 }: { id: CourseIconId; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[id]}
    </svg>
  );
}
