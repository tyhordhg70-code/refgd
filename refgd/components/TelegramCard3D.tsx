"use client";
/**
 * TelegramCard3D — cinematic 3D fly-in for the entire Telegram CTA card.
 *
 * The card starts deep in 3D space (tilted, far, below the viewport) and
 * flies to its natural flat position when it enters view. Perspective is on
 * the PARENT div (not the animated element) so the 3D distortion is correct.
 *
 * Animation breakdown:
 *   • rotateX  30 → 0 deg  (tips from leaning-back to flat)
 *   • rotateY -16 → 0 deg  (slight horizontal spin from right-of-screen)
 *   • y        90 → 0 px   (rises up into place)
 *   • scale  0.86 → 1      (starts slightly small — distance cue)
 *   • opacity   0 → 1      (fast fade, complete at ~0.6 s)
 *   duration: 1.4 s, ease [0.16, 1, 0.3, 1] (strong pull, long settle)
 *
 * The fly-in runs on EVERY viewport (mobile included). A previous mobile-only
 * "flat" variant was tried to dodge an iOS layout glitch, but it swapped the
 * tree structure at runtime which forced framer to reuse a single motion.div
 * across two different shapes — leaving the card squashed/blank. That swap was
 * itself the breakage, so it is gone: one tree, one animation, all sizes.
 *
 * Triggers once on intersection (≥ 15 % in view). Reduced-motion: instant.
 */
import { motion, useReducedMotion, useInView } from "framer-motion";
import { useRef, type ReactNode } from "react";

export default function TelegramCard3D({ children }: { children: ReactNode }) {
  const ref  = useRef<HTMLDivElement>(null);
  const inView  = useInView(ref, { once: true, amount: 0.15 });
  const reduced = useReducedMotion();

  return (
    /* Perspective wrapper — keeps the card's own stacking context clean */
    <div ref={ref} style={{ perspective: "1100px", perspectiveOrigin: "50% 60%" }}>
      <motion.div
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={{
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
        }}
        transition={
          reduced
            ? { duration: 0 }
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
        style={{ transformStyle: "preserve-3d", willChange: "transform, opacity" }}
      >
        {children}
      </motion.div>
    </div>
  );
}
