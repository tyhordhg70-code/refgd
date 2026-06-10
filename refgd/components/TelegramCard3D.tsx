"use client";
/**
 * TelegramCard3D — cinematic 3D fly-in for the entire Telegram CTA card.
 *
 * The card starts deep in 3D space (tilted, far, below the viewport) and
 * flies to its natural flat position when it enters view. Perspective is on
 * the PARENT div (not the animated element) so the 3D distortion is correct.
 *
 * Animation breakdown (DESKTOP, byte-for-byte unchanged):
 *   • rotateX  30 → 0 deg  (tips from leaning-back to flat)
 *   • rotateY -16 → 0 deg  (slight horizontal spin from right-of-screen)
 *   • y        90 → 0 px   (rises up into place)
 *   • scale  0.86 → 1      (starts slightly small — distance cue)
 *   • opacity   0 → 1      (fast fade, complete at ~0.6 s)
 *   duration: 1.4 s, ease [0.16, 1, 0.3, 1] (strong pull, long settle)
 *
 * MOBILE: opacity-only fade-in with NO perspective wrapper and NO transform.
 * On iOS WebKit, a `perspective` ancestor + framer-motion's non-identity
 * transform on the animated child make the card's rounded `overflow:hidden`
 * clip drop its composited descendants — so the dark inner panel paints past
 * the rounded corners ("breaking" + a black slab on the bottom). Keeping the
 * transform identity at rest (opacity-only) lets the native rounded clip work.
 * NOTE: do NOT force-promote this subtree (translateZ(0)/isolation) — that is
 * what froze the fly-in mid-frame in an earlier attempt; plain opacity is safe.
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

  // ── Mobile: flat, opacity-only entrance (no perspective, no transform) ──
  if (isMobile) {
    return (
      <div ref={ref}>
        <motion.div
          key="tg-m"
          className="tg-card-3d"
          initial="hidden"
          animate={inView ? "visible" : "hidden"}
          variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
          transition={reduced ? { duration: 0 } : { duration: 0.7, ease: "easeOut" }}
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
        key="tg-d"
        className="tg-card-3d"
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
      >
        {children}
      </motion.div>
    </div>
  );
}
