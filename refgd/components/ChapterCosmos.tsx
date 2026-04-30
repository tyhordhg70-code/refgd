"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Cosmic accent rendered behind the Chapter 01 heading on the home
 * page. Continues the storytelling beat from the CosmicJourney warp:
 * a faint orbital constellation that spins slowly and drifts into
 * view — the journey hasn't ended, the cosmos is still here.
 *
 * Was scroll-driven; now a one-shot viewport-triggered fade + drift
 * that completes in ~1.6s on enter. The orbital ring pulse on the
 * star dots stays continuous (CSS-cheap) so the layer keeps breathing.
 */
export default function ChapterCosmos() {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const stable = reduced || isMobile;

  return (
    <div
      aria-hidden="true"
      data-testid="chapter-cosmos"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <motion.div
        className="absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2"
        // Always visible from the first paint — the cosmic
        // backdrop is a CONSTANT, not an entrance animation.
        // Per user request: "it should already be there".
        initial={{ opacity: 1 }}
        animate={{ opacity: 1 }}
        suppressHydrationWarning
      >
        {/* Faint orbital rings */}
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: `${n * 28}vmin`,
              height: `${n * 28}vmin`,
              border: `1px solid rgba(255,225,140,${0.16 - n * 0.03})`,
              boxShadow: `inset 0 0 ${n * 18}px rgba(167,139,250,${0.10 - n * 0.02})`,
            }}
          />
        ))}
        {/* Constellation accent dots */}
        {[
          { x: "20%", y: "30%", c: "#ffe28a" },
          { x: "78%", y: "22%", c: "#a78bfa" },
          { x: "85%", y: "62%", c: "#67e8f9" },
          { x: "30%", y: "78%", c: "#f472b6" },
          { x: "55%", y: "55%", c: "#ffe28a" },
        ].map((p, i) => (
          <motion.span
            key={i}
            className="absolute block h-2 w-2 rounded-full"
            style={{
              left: p.x,
              top: p.y,
              background: p.c,
              boxShadow: `0 0 14px ${p.c}, 0 0 30px ${p.c}`,
            }}
            animate={
              reduced || isMobile
                ? {}
                : { opacity: [0.4, 1, 0.4], scale: [0.8, 1.4, 0.8] }
            }
            transition={
              reduced || isMobile
                ? {}
                : {
                    duration: 3 + i * 0.6,
                    repeat: Infinity,
                    delay: i * 0.4,
                    ease: "easeInOut",
                  }
            }
          />
        ))}
      </motion.div>
    </div>
  );
}
