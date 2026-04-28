"use client";

import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * PathCardCameraFly
 * ─────────────────────────────────────────────────────────────────
 * Wraps a single PathCard with a one-shot 3D "camera fly-by" that
 * triggers the moment the card enters the viewport. The card flies
 * in from a different off-screen anchor along a diagonal trajectory
 * (sideways + depth + slight rotation) and lands at its grid slot.
 *
 * Each card uses a distinct anchor (5 anchors for 5 cards), so the
 * group reveal feels like a coordinated camera move rather than
 * five independent fades.
 *
 * NOTE: This used to be scroll-driven (useScroll + useTransform),
 * which meant the user had to keep scrolling for the cards to
 * finish landing. That's been replaced with a viewport-triggered
 * spring transition so the entire fly-by completes in one motion.
 */
const ANCHORS: Array<{
  /** Initial X offset (px) when the card is off-screen. */
  x: number;
  /** Initial Y offset (px). */
  y: number;
  /** Initial Z translation (px). Negative = farther away. */
  z: number;
  /** Initial rotation around Y (deg). */
  ry: number;
  /** Initial rotation around X (deg). */
  rx: number;
  /** Initial scale. */
  s: number;
}> = [
  // Card 1 — flies in from far left, deep
  { x: -420, y:  60, z: -520, ry:  28, rx:  -8, s: 0.55 },
  // Card 2 — flies down from above-left, mid-depth
  { x: -180, y: -260, z: -340, ry:  14, rx:  18, s: 0.62 },
  // Card 3 — center punch-in from far back
  { x:    0, y: 120, z: -640, ry:  -6, rx: -10, s: 0.48 },
  // Card 4 — drops in from above-right
  { x:  220, y: -240, z: -300, ry: -16, rx:  20, s: 0.62 },
  // Card 5 — wide swing from far right
  { x:  460, y:  90, z: -540, ry: -30, rx:  -6, s: 0.55 },
];

type Props = {
  index: number;
  children: ReactNode;
};

export default function PathCardCameraFly({ index, children }: Props) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const a = ANCHORS[index % ANCHORS.length];

  if (reduce) {
    // Reduced motion: skip the cinematic fly entirely.
    return <div ref={ref} className="h-full">{children}</div>;
  }

  return (
    <div
      ref={ref}
      className="h-full"
      style={{ perspective: 1600, transformStyle: "preserve-3d" }}
    >
      <motion.div
        className="h-full"
        initial={{
          x: a.x, y: a.y, z: a.z,
          rotateY: a.ry, rotateX: a.rx,
          scale: a.s, opacity: 0,
        }}
        whileInView={{
          x: 0, y: 0, z: 0,
          rotateY: 0, rotateX: 0,
          scale: 1, opacity: 1,
        }}
        viewport={{ once: true, margin: "-15% 0px -15% 0px" }}
        transition={{
          duration: 1.4,
          delay: index * 0.12,
          ease: [0.16, 1, 0.3, 1], // smooth-out cubic — lands like a camera settle
          opacity: { duration: 0.6, delay: index * 0.12 },
        }}
        style={{
          transformStyle: "preserve-3d",
          transformOrigin: "50% 50%",
          willChange: "transform, opacity",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
