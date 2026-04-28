"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useEditContext } from "@/lib/edit-context";

/**
 * ScrollCameraTilt
 * ─────────────────────────────────────────────────────────────────
 * Wraps any subtree and applies a constant subtle 3D camera depth
 * (perspective + slight scale) plus a yaw that follows mouse X. This
 * USED to also tilt + zoom continuously with scroll, but that drove
 * the "have to keep scrolling for the camera to move" feel the user
 * wanted gone — and pinned a cheap-but-constant rAF loop the entire
 * time the page was scrolled. Removed.
 *
 * What remains:
 *   – constant perspective scaffold,
 *   – mouse-driven yaw (rotateY) on desktop,
 *   – static neutral state on mobile / reduced-motion / edit mode.
 */

type Props = {
  children: ReactNode;
  className?: string;
  /** Max forward/back tilt, deg. Kept for API compatibility (unused). */
  tilt?: number;
  /** Max left/right yaw, deg. Default 3. */
  yaw?: number;
  /** Max zoom delta. Kept for API compatibility (unused). */
  zoom?: number;
};

export default function ScrollCameraTilt({
  children,
  className = "",
  yaw = 3,
}: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  // Disable the 3D camera while an admin is editing.
  const { isAdmin, editMode } = useEditContext();
  const editing = isAdmin && editMode;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const isMobile = window.matchMedia("(max-width: 768px)").matches;
    if (reduce || editing || isMobile) {
      stage.style.transform = "none";
      stage.style.transformStyle = "flat";
      return;
    }

    let mouseX = 0; // -1..1
    let raf: number | null = null;

    function apply() {
      raf = null;
      const ry = (mouseX * yaw).toFixed(3);
      stage!.style.transform = `perspective(1600px) rotateY(${ry}deg)`;
    }

    function onMouse(e: MouseEvent) {
      const w = window.innerWidth || 1;
      mouseX = (e.clientX / w) * 2 - 1;
      if (raf == null) raf = requestAnimationFrame(apply);
    }

    apply();
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouse);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [yaw, editing]);

  return (
    <div
      ref={stageRef}
      className={className}
      style={
        editing
          ? { transform: "none", transformStyle: "flat" }
          : {
              transformOrigin: "50% 30%",
              transformStyle: "preserve-3d",
              willChange: "transform",
              transform: "perspective(1600px) rotateY(0deg)",
            }
      }
    >
      {children}
    </div>
  );
}
