"use client";
/**
 * TelegramCard3D — cinematic 3D fly-in for the entire Telegram CTA card.
 *
 * DESKTOP: the card starts deep in 3D space (tilted, far, below the viewport)
 * and flies to its natural flat position when it enters view. Perspective is on
 * the PARENT div (not the animated element) so the 3D distortion is correct.
 *
 * Animation breakdown (desktop):
 *   • rotateX  30 → 0 deg  (tips from leaning-back to flat)
 *   • rotateY -16 → 0 deg  (slight horizontal spin from right-of-screen)
 *   • y        90 → 0 px   (rises up into place)
 *   • scale  0.86 → 1      (starts slightly small — distance cue)
 *   • opacity   0 → 1      (fast fade, complete at ~0.6 s)
 *   duration: 1.4 s, ease [0.16, 1, 0.3, 1] (strong pull, long settle)
 *
 * MOBILE: the 3D rotation is dropped to a plain opacity + small rise. A
 * 3D-transformed ancestor (preserve-3d + rotateX) combined with the card's
 * descendant `overflow-hidden rounded-[2.5rem]` clip is an iOS Safari bug — the
 * rounded clip fails and the card's bottom renders broken ("telegram box breaks
 * from the bottom"). The persistent `willChange:transform` + preserve-3d keep
 * that broken compositing layer alive even after the animation settles, so on
 * mobile we also force `transformStyle:flat` and drop `willChange`.
 *
 * CRITICAL: this is ONE tree on every viewport — only the variant values, the
 * transition, and a couple of style props change with `isMobile`. A previous
 * attempt swapped the tree STRUCTURE at runtime, which forced framer to reuse a
 * single motion.div across two different shapes and left the card squashed/
 * blank. Changing values (not structure) is safe.
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
    /* Perspective wrapper — keeps the card's own stacking context clean.
       Perspective is irrelevant (and unwanted) once the child is flat. */
    <div ref={ref} style={{ perspective: isMobile ? undefined : "1100px", perspectiveOrigin: "50% 60%" }}>
      <motion.div
        initial="hidden"
        animate={inView ? "visible" : "hidden"}
        variants={
          isMobile
            ? {
                hidden:  { opacity: 0, y: 40 },
                visible: { opacity: 1, y: 0 },
              }
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
              ? {
                  duration: 0.7,
                  ease: [0.16, 1, 0.3, 1],
                  opacity: { duration: 0.5, ease: "easeOut" },
                }
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
        style={{
          transformStyle: isMobile ? "flat" : "preserve-3d",
          willChange: isMobile ? "auto" : "transform, opacity",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
