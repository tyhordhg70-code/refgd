"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useInView } from "framer-motion";
import { useEntranceReady } from "@/lib/loading-screen-gate";

/**
 * PathCardCameraFly
 * ─────────────────────────────────────────────────────────────────
 * Wraps a single PathCard with a one-shot 3D "camera fly-by" that
 * triggers the moment the card's GRID SLOT enters the viewport.
 *
 * IMPORTANT: detection is done on the OUTER wrapper (which always
 * sits in its grid slot), NOT the inner transformed motion.div.
 * Previously `whileInView` watched the inner element, but several
 * cards started so far off-screen (x: -420, y: -260, z: -640) that
 * IntersectionObserver never reported them as visible — so the
 * left-most and right-most cards (anchors 0 and 4) silently never
 * flew in. That's why two of the five cards looked "missing".
 *
 * Each card uses a distinct anchor (5 anchors for 5 cards), so the
 * group reveal feels like a coordinated camera move rather than
 * five independent fades.
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
  { x: -160, y:  20, z: -220, ry:  14, rx:  -4, s: 0.7 },
  // Card 2 — flies down from above-left, mid-depth
  { x:  -80, y: -100, z: -160, ry:   8, rx:  10, s: 0.75 },
  // Card 3 — center punch-in from far back
  { x:    0, y:  50, z: -280, ry:  -3, rx:  -6, s: 0.65 },
  // Card 4 — drops in from above-right
  { x:   90, y: -100, z: -140, ry:  -9, rx:  12, s: 0.75 },
  // Card 5 — wide swing from far right
  { x:  170, y:  30, z: -230, ry: -16, rx:  -3, s: 0.7 },
];

type Props = {
  index: number;
  children: ReactNode;
};

export default function PathCardCameraFly({ index, children }: Props) {
  const reduce = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  // Track viewport entry on the OUTER wrapper (which sits in its
  // grid slot and is reliably observable by IntersectionObserver),
  // not on the inner transformed element.
  const inView = useInView(wrapRef, {
    once: true,
    margin: "-15% 0px -15% 0px",
  });
  const [shouldAnimate, setShouldAnimate] = useState(false);
  // Defer the camera-fly trigger until the loading splash has lifted
  // so the cards do not silently land in their final pose behind the
  // splash overlay (the user reported "page load animation for home
  // page is not visible after loading screen but when coming back to
  // it from another page it shows" — that's exactly this).
  const entranceReady = useEntranceReady();

  useEffect(() => {
    if (inView && entranceReady) setShouldAnimate(true);
  }, [inView, entranceReady]);

  const a = ANCHORS[index % ANCHORS.length];

  if (reduce) {
    // Reduced motion: skip the cinematic fly entirely.
    return <div ref={wrapRef} className="h-full">{children}</div>;
  }

  return (
    <div
      ref={wrapRef}
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
        animate={
          shouldAnimate
            ? {
                x: 0, y: 0, z: 0,
                rotateY: 0, rotateX: 0,
                scale: 1, opacity: 1,
              }
            : undefined
        }
        transition={{
          duration: 0.38,
          delay: 0,
          ease: [0.16, 1, 0.3, 1], // smooth-out cubic — lands like a camera settle
          opacity: { duration: 0.22, delay: 0 },
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
