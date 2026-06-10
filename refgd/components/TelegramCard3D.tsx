"use client";
/**
 * TelegramCard3D — cinematic 3D fly-in for the entire Telegram CTA card.
 *
 * The card starts deep in 3D space (tilted, far, below the viewport) and
 * flies to its natural flat position when it enters view. Perspective is on
 * the PARENT div (not the animated element) so the 3D distortion is correct.
 *
 * Animation breakdown (DESKTOP):
 *   • rotateX  30 → 0 deg  (tips from leaning-back to flat)
 *   • rotateY -16 → 0 deg  (slight horizontal spin from right-of-screen)
 *   • y        90 → 0 px   (rises up into place)
 *   • scale  0.86 → 1      (starts slightly small — distance cue)
 *   • opacity   0 → 1      (fast fade, complete at ~0.6 s)
 *   duration: 1.4 s, ease [0.16, 1, 0.3, 1] (strong pull, long settle)
 *
 * MOBILE: the 3D fly-in is disabled entirely. The desktop variant builds a
 * preserve-3d context (rotateX/rotateY + scale + perspective) around a card
 * whose inner layers use overflow-hidden + backdrop-filter (glass). On iOS
 * Safari that exact combination intermittently dropped the headline + CTA
 * button and collapsed the card's box — the "telegram box breaks, text
 * vanishes, button vanishes" report. Phones get a flat opacity + small rise
 * entrance instead: no 3D context, so nothing can break.
 *
 * Triggers once on intersection (≥ 15 % in view). Reduced-motion: instant.
 */
import { motion, useReducedMotion, useInView } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

export default function TelegramCard3D({ children }: { children: ReactNode }) {
  const ref  = useRef<HTMLDivElement>(null);
  const inView  = useInView(ref, { once: true, amount: 0.15 });
  const reduced = useReducedMotion();

  // Start desktop on both server + first client render (so hydration matches),
  // then flip to the flat mobile entrance after mount on small screens.
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ── Mobile: flat 2D entrance — NO 3D context, nothing to clip or drop ──
  if (isMobile) {
    return (
      <div ref={ref}>
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 28 }}
          animate={
            inView || reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }
          }
          transition={
            reduced ? { duration: 0 } : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
          }
          style={{ willChange: "opacity, transform" }}
        >
          {children}
        </motion.div>
      </div>
    );
  }

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
