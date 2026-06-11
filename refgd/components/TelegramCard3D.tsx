"use client";
/**
 * TelegramCard3D — cinematic 3D fly-in for the entire Telegram CTA card.
 *
 * DESKTOP: the card starts deep in 3D space (tilted, far, below the viewport)
 * and flies to its natural flat position when it enters view. Perspective is on
 * the PARENT div (not the animated element) so the 3D distortion is correct.
 *   • rotateX  30 → 0 deg   • rotateY -16 → 0 deg
 *   • y        90 → 0 px    • scale  0.86 → 1     • opacity 0 → 1
 *   duration 1.4 s, ease [0.16, 1, 0.3, 1]
 *
 * MOBILE: an OPACITY-ONLY fly-in with NO perspective wrapper and NO transform.
 * The 3D version's perspective ancestor + framer's rotateX/Y/scale transform on
 * the card are transform/perspective ANCESTORS above the card's rounded
 * `overflow:hidden` clip, which iOS WebKit resolves by dropping the card's
 * composited children — the bottom half + the CTA button vanish. Flattening
 * `transform-style` alone (see globals.css) was NOT enough; the transform/
 * perspective ancestor itself has to go.
 *
 * We keep ONE tree (same wrapper div + same motion.div + same children) and
 * only change the style/variant VALUES by viewport. A prior attempt swapped the
 * tree STRUCTURE at runtime, which forced framer to reuse a single motion.div
 * across two shapes and squashed the card — that swap was the breakage, so we
 * never branch the structure, only the values. Desktop stays byte-for-byte.
 *
 * Triggers once on intersection (≥ 15 % in view). Reduced-motion: instant.
 */
import { motion, useReducedMotion, useInView } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

export default function TelegramCard3D({ children }: { children: ReactNode }) {
  const ref  = useRef<HTMLDivElement>(null);
  const inView  = useInView(ref, { once: true, amount: 0.15 });
  const reduced = useReducedMotion();

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    /* Perspective wrapper — DESKTOP ONLY. On mobile no 3D context exists above
       the rounded clip, so iOS keeps the card's children composited. */
    <div
      ref={ref}
      style={isMobile ? undefined : { perspective: "1100px", perspectiveOrigin: "50% 60%" }}
    >
      <motion.div
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={
          isMobile
            ? { hidden: { opacity: 0 }, visible: { opacity: 1 } }
            : {
                hidden: {
                  opacity: 0,
                  rotateX: 30,
                  rotateY: -16,
                  y: 90,
                  scale: 0.86,
                },
                visible: {
                  opacity: 1,
                  rotateX: 0,
                  rotateY: 0,
                  y: 0,
                  scale: 1,
                },
              }
        }
        transition={
          reduced
            ? { duration: 0 }
            : isMobile
              ? { opacity: { duration: 0.7, ease: "easeOut" } }
              : {
                  duration: 1.4,
                  ease: [0.16, 1, 0.3, 1],
                  opacity:  { duration: 0.55, ease: "easeOut" },
                  rotateX:  { duration: 1.4, ease: [0.16, 1, 0.3, 1] },
                  rotateY:  { duration: 1.35, ease: [0.16, 1, 0.3, 1], delay: 0.04 },
                  y:        { duration: 1.25, ease: [0.16, 1, 0.3, 1] },
                  scale:    { duration: 1.4,  ease: [0.16, 1, 0.3, 1] },
                }
        }
        className="tg-card-3d"
      >
        {children}
      </motion.div>
    </div>
  );
}
