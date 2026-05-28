"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { isMobileLike } from "@/lib/iosCheck";

type Props = {
  children: React.ReactNode;
  /** Translation axis — kept for API compat, no longer used. */
  axis?: "x" | "y" | "both";
  /** Pixel amount of entrance drift. */
  amount?: number;
  /** Degrees of 3D rotation on entrance. */
  rotate?: number;
  /** Z-depth shift in pixels on entrance. */
  depth?: number;
  className?: string;
};

/**
 * Section wrapper that wraps its content in a one-shot 3D parallax
 * entrance — translate + rotate + Z-depth, all completing once on
 * viewport entry. No scroll-linked transforms (which were laggy and
 * froze mid-scroll).
 *
 * v41 — RE-APPLY THE MOBILE 3D BYPASS (was v25, lost in the v31
 * rollback). On mobile-like devices we DO NOT build a 3D context at
 * all: no `perspective`, no `preserve-3d`, no rotateX/rotateY/z, no
 * 3D `willChange`. Instead the content gets a lightweight 2D fade +
 * rise that still feels lively, latches once, and never re-fires.
 *
 * Why: on Chrome Android / mobile WebKit, the 3D compositing layer
 * (perspective + preserve-3d + rotateX/rotateY/z) gets evicted and
 * fails to re-rasterize when the section is scrolled away and back.
 * The un-painted 3D layer surfaces as a BLACK BAR across the parallax
 * section on scroll-back — the exact bug the user reported. Removing
 * the 3D context on mobile removes the layer that can be evicted, so
 * there is nothing left to flash black. Desktop keeps the full 3D
 * entrance (hover/pointer devices + wide viewports don't hit the bug).
 *
 * HARDCODED RULE (re-affirmed from v36): viewport.once = true.
 *
 * Earlier versions had `once: false`, which meant every time the
 * user scrolled an already-revealed section BACK into view (e.g. on
 * upward scroll past a section they'd already passed), framer-motion
 * re-fired the `initial` state (opacity:0, translated, rotated,
 * pushed back in Z) before re-animating to `whileInView`. That is
 * the "text vanishes on backscroll" bug the user reported across
 * every page of refgd.onrender.com.
 *
 * Setting `once: true` makes the entrance animation fire EXACTLY
 * once per element per page load. The animation itself is fully
 * preserved — the section still flies in the first time it enters
 * the viewport. It just never vanishes again afterward.
 *
 * Do NOT change `once` back to `false`, and do NOT re-introduce a 3D
 * context on mobile.
 */
export default function CubicParallax({
  children,
  axis = "y",
  amount = 40,
  rotate = 4,
  depth = 60,
  className = "",
}: Props) {
  const reduce = useReducedMotion();
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(isMobileLike());
  }, []);

  if (reduce) {
    return (
      <div className={className} data-testid="cubic-parallax">
        {children}
      </div>
    );
  }

  // MOBILE — no 3D context. Lightweight 2D fade + rise, one-shot.
  if (mobile) {
    return (
      <div className={className} data-testid="cubic-parallax">
        <motion.div
          initial={{ y: 28, opacity: 0 }}
          whileInView={{ y: 0, opacity: 1 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          style={{ willChange: "transform, opacity" }}
          suppressHydrationWarning
        >
          {children}
        </motion.div>
      </div>
    );
  }

  // DESKTOP — full one-shot 3D parallax entrance.
  return (
    <div
      className={className}
      style={{ perspective: 1600 }}
      data-testid="cubic-parallax"
    >
      <motion.div
        initial={{
          x: axis === "x" || axis === "both" ? amount : 0,
          y: axis === "y" || axis === "both" ? amount : 0,
          rotateX: rotate,
          rotateY: -rotate,
          z: -depth,
          opacity: 0,
        }}
        whileInView={{
          x: 0,
          y: 0,
          rotateX: 0,
          rotateY: 0,
          z: 0,
          opacity: 1,
        }}
        viewport={{ once: true, margin: "-80px" }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
        style={{
          transformStyle: "preserve-3d",
          willChange: "transform, opacity",
        }}
        suppressHydrationWarning
      >
        {children}
      </motion.div>
    </div>
  );
}
