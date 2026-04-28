"use client";

import { useRef, type ReactNode } from "react";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";

/**
 * PathCardCameraFly
 * ─────────────────────────────────────────────────────────────────
 * Wraps a single PathCard with a scroll-driven 3D "camera fly-by".
 *
 * Each card flies in from a different off-screen anchor along a
 * diagonal trajectory (sideways + depth + slight rotation) and lands
 * at its grid slot as the section scrolls into view. The motion is
 * tied to the WRAPPER's own scroll progress (not the page), so:
 *
 *   – The cards animate continuously while the section is in view,
 *     not just at viewport entry.
 *   – Scrolling back UP reverses the camera (true scroll-driven fly,
 *     not a one-shot reveal).
 *
 * `index` selects the camera anchor (5 anchors for 5 cards), so each
 * card flies in from a distinct corner — left/right, near/far, top/
 * bottom — producing a richly layered, cinematic group reveal.
 */

const ANCHORS: Array<{
  /** Initial X offset (px) when the section is far below the viewport. */
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

  // Scroll progress where 0 ≈ wrapper just entered viewport from the
  // bottom, 1 ≈ wrapper just left the top. We use the wrapper's own
  // bounds so the fly-by stays scoped to this card's neighborhood.
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 95%", "end 5%"],
  });

  const a = ANCHORS[index % ANCHORS.length];

  // Gentle ease — most of the motion happens in the first ~55% of
  // the section's traversal (the camera lands the card), then it
  // settles & subtly drifts on the way out so scrolling back up
  // continues to feel alive rather than frozen.
  const ease = useTransform(scrollYProgress, [0, 0.55, 1], [0, 1, 1.08]);

  const x = useTransform(ease, [0, 1, 1.08], [a.x, 0,  -a.x * 0.06]);
  const y = useTransform(ease, [0, 1, 1.08], [a.y, 0,  -a.y * 0.04]);
  const z = useTransform(ease, [0, 1, 1.08], [a.z, 0,  60]);
  const ry = useTransform(ease, [0, 1, 1.08], [a.ry, 0, -a.ry * 0.08]);
  const rx = useTransform(ease, [0, 1, 1.08], [a.rx, 0, -a.rx * 0.08]);
  const scale = useTransform(ease, [0, 1, 1.08], [a.s, 1, 1.015]);
  // Soft fade-in over the first 12% of travel so cards do not pop
  // against the cosmic warp behind them.
  const opacity = useTransform(scrollYProgress, [0, 0.12, 1], [0, 1, 1]);

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
        style={{
          x, y, z, rotateY: ry, rotateX: rx, scale, opacity,
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
