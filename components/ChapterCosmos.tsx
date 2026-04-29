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
 * star dots is now driven by CSS @keyframes instead of framer-motion
 * `repeat: Infinity` — the previous version ran 5 main-thread JS
 * interpolations every animation frame, which was a measurable
 * source of the page-wide scroll stutter the user reported.
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
      <style jsx>{`
        @keyframes cc-twinkle {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.4); }
        }
        .cc-dot {
          position: absolute;
          display: block;
          height: 0.5rem;
          width: 0.5rem;
          border-radius: 9999px;
          will-change: opacity, transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .cc-dot {
            animation: none !important;
            opacity: 0.7;
            transform: none;
          }
        }
      `}</style>

      <motion.div
        className="absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2"
        initial={
          mounted
            ? stable
              ? { opacity: 0 }
              : { opacity: 0, rotate: 0, y: "6%" }
            : { opacity: 0 }
        }
        whileInView={
          stable
            ? { opacity: 1 }
            : { opacity: 1, rotate: 35, y: "-6%" }
        }
        viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
        transition={{ duration: stable ? 1.2 : 1.6, ease: [0.22, 1, 0.36, 1] }}
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
        {/* Constellation accent dots — pulse via CSS @keyframes */}
        {[
          { x: "20%", y: "30%", c: "#ffe28a" },
          { x: "78%", y: "22%", c: "#a78bfa" },
          { x: "85%", y: "62%", c: "#67e8f9" },
          { x: "30%", y: "78%", c: "#f472b6" },
          { x: "55%", y: "55%", c: "#ffe28a" },
        ].map((p, i) => (
          <span
            key={i}
            className="cc-dot"
            style={{
              left: p.x,
              top: p.y,
              background: p.c,
              boxShadow: `0 0 14px ${p.c}, 0 0 30px ${p.c}`,
              animation: reduced
                ? "none"
                : `cc-twinkle ${3 + i * 0.6}s ease-in-out ${i * 0.4}s infinite`,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
