"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * TrailerTitle3D v3 — letter-by-letter entrance animation that is
 * Lenis-safe. v2 stripped animation entirely because the old whileInView
 * pattern stayed invisible under Lenis. v3 uses a manual
 * IntersectionObserver (which is what Lenis can't break — it only touches
 * window.scrollY) and fires a one-shot reveal when the title enters view.
 * The letters start primed (opacity:0, translateY(40px), rotateX(70deg))
 * and animate to natural state with a 35ms stagger. Glow halo still
 * pulses, underline still scans.
 */
export default function TrailerTitle3D({
  text = "VIEW TRAILER VIDEO",
  className = "",
}: {
  text?: string;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    if (reduce) {
      setRevealed(true);
      return;
    }
    const el = rootRef.current;
    if (!el) return;
    // If element is already in view at mount (above the fold), reveal
    // immediately. IntersectionObserver fires async on mount so we'd
    // otherwise see a flash of primed state.
    const r = el.getBoundingClientRect();
    if (r.top < (window.innerHeight || 0) && r.bottom > 0) {
      setRevealed(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  // Preserve spaces as literal spaces (don't animate)
  const chars = text.split("");

  return (
    <div
      ref={rootRef}
      className={`relative mb-6 flex flex-col items-center justify-center text-center ${className}`}
      data-testid="trailer-title-3d"
    >
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-32 -translate-y-1/2 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(34,211,238,0.55), transparent 70%)",
          opacity: 0.5,
        }}
        animate={reduce ? { opacity: 0.6 } : { opacity: [0.35, 0.7, 0.35] }}
        transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
      />

      <h2
        className="editorial-display flex flex-wrap items-center justify-center gap-y-1 text-white text-[clamp(1.6rem,5vw,3.6rem)] uppercase"
        style={{
          fontWeight: 900,
          letterSpacing: "0.04em",
          WebkitTextStroke: "1px rgba(34,211,238,0.45)",
          textShadow:
            "0 4px 24px rgba(0,0,0,0.85), 0 0 40px rgba(34,211,238,0.35), 0 2px 6px rgba(0,0,0,0.95)",
          perspective: "800px",
        }}
        aria-label={text}
      >
        {chars.map((c, i) => {
          if (c === " ") {
            return (
              <span key={i} aria-hidden style={{ display: "inline-block", width: "0.4em" }}>
                {"\u00A0"}
              </span>
            );
          }
          return (
            <motion.span
              key={i}
              aria-hidden
              style={{ display: "inline-block", transformOrigin: "50% 100%" }}
              initial={false}
              animate={
                revealed
                  ? { opacity: 1, y: 0, rotateX: 0 }
                  : { opacity: 0, y: 40, rotateX: 70 }
              }
              transition={{
                duration: 0.7,
                delay: revealed ? i * 0.035 : 0,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              {c}
            </motion.span>
          );
        })}
      </h2>

      <span
        aria-hidden
        className="safe-reveal-scale-x mt-3 block h-[2px] w-32 origin-left"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(34,211,238,0.95), transparent)",
        }}
      />
    </div>
  );
}
