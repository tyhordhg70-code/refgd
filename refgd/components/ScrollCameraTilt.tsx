"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useEditContext } from "@/lib/edit-context";

/**
 * ScrollCameraTilt
 * ─────────────────────────────────────────────────────────────────
 * A whole-page lazy-scroll 3D camera. Wraps any subtree and applies
 * a continuously-updated CSS transform that:
 *
 *   – tilts forward/back (rotateX)  as the page is scrolled,
 *   – yaws left/right (rotateY)     based on horizontal mouse position,
 *   – zooms (scale)                 in/out around scroll progress,
 *
 * producing the "lazy-scroll camera" feel of high-end editorial sites
 * without needing per-section motion components. Updates are throttled
 * to one rAF per scroll/mouse move so it stays cheap on phones.
 *
 * Accessibility: respects `prefers-reduced-motion` (disabled), and
 * never moves more than a few degrees so the page stays readable.
 */

type Props = {
  children: ReactNode;
  className?: string;
  /** Max forward/back tilt, deg. Default 4. */
  tilt?: number;
  /** Max left/right yaw, deg. Default 3. */
  yaw?: number;
  /** Max zoom delta. Default 0.04 (i.e. 0.96 → 1.00 → 1.04). */
  zoom?: number;
};

export default function ScrollCameraTilt({
  children,
  className = "",
  tilt = 4,
  yaw = 3,
  zoom = 0.04,
}: Props) {
  const stageRef = useRef<HTMLDivElement | null>(null);
  // Disable the 3D camera while an admin is editing. The CSS
  // transform creates a containing block + 3D context that breaks
  // contentEditable focus and caret rendering inside motion-wrapped
  // text on Chromium/WebKit. Editing comes first.
  const { isAdmin, editMode } = useEditContext();
  const editing = isAdmin && editMode;

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || editing) {
      // Reset transform to a neutral state so previously-applied tilt
      // doesn't get stuck when the admin enters edit mode mid-scroll.
      stage.style.transform = "none";
      stage.style.transformStyle = "flat";
      return;
    }

    let scrollY = window.scrollY;
    let mouseX = 0; // -1..1
    let raf: number | null = null;

    function apply() {
      raf = null;
      const vh = window.innerHeight || 1;
      const docH = Math.max(1, document.documentElement.scrollHeight - vh);
      // Page progress: 0 (top) → 1 (bottom), clamped.
      const p = Math.min(1, Math.max(0, scrollY / docH));
      // Tilt: gently leans the page forward as you read down, then
      // levels back out near the bottom.
      const rx = (Math.sin(p * Math.PI) * tilt).toFixed(3);
      const ry = (mouseX * yaw).toFixed(3);
      // Zoom: subtle in-and-out breathing tied to scroll, so the
      // viewport feels like a camera dollying through the layout.
      const s = (1 - zoom * 0.5 + Math.sin(p * Math.PI) * zoom).toFixed(4);
      stage!.style.transform = `perspective(1600px) rotateX(${rx}deg) rotateY(${ry}deg) scale(${s})`;
    }

    function onScroll() {
      scrollY = window.scrollY;
      if (raf == null) raf = requestAnimationFrame(apply);
    }
    function onMouse(e: MouseEvent) {
      // Map cursor X (0..vw) to -1..1
      const w = window.innerWidth || 1;
      mouseX = (e.clientX / w) * 2 - 1;
      if (raf == null) raf = requestAnimationFrame(apply);
    }

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mousemove", onMouse, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("mousemove", onMouse);
      if (raf != null) cancelAnimationFrame(raf);
    };
  }, [tilt, yaw, zoom, editing]);

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
              // Match the first applied frame so there's no first-paint snap.
              transform: `perspective(1600px) rotateX(0deg) rotateY(0deg) scale(${(
                1 - zoom * 0.5
              ).toFixed(4)})`,
            }
      }
    >
      {children}
    </div>
  );
}
