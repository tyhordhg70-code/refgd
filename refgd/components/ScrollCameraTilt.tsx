"use client";

import { type ReactNode } from "react";

/**
 * ScrollCameraTilt
 * ─────────────────────────────────────────────────────────────────
 * Historically wrapped a subtree and applied a constant 3D camera
 * yaw following the cursor. That made the entire page look subtly
 * sideways at all times, which the user explicitly disliked.
 *
 * Now: pass-through wrapper that keeps the API stable for callers
 * but applies *no* transform. Removed the mousemove rAF loop too.
 */

type Props = {
  children: ReactNode;
  className?: string;
  /** Kept for API compatibility — unused. */
  tilt?: number;
  /** Kept for API compatibility — unused. */
  yaw?: number;
  /** Kept for API compatibility — unused. */
  zoom?: number;
};

export default function ScrollCameraTilt({ children, className = "" }: Props) {
  return <div className={className}>{children}</div>;
}
