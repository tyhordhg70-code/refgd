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

  // Twinkle starfield positions — deterministic so SSR/CSR match.
  // Spread across the FULL section (incl. behind cards & beyond) so
  // the cosmic backdrop is continuous between "Choose your path"
  // and the telegram CTA below. Pure CSS keyframe, zero JS cost.
  const STARS = Array.from({ length: 24 }, (_, i) => {
    const angle = (i * 137.508) % 360; // golden angle
    const r = 12 + ((i * 53) % 80);
    return {
      left: `${50 + r * Math.cos((angle * Math.PI) / 180) * 0.55}%`,
      top: `${50 + r * Math.sin((angle * Math.PI) / 180) * 0.55}%`,
      size: 1 + (i % 3),
      dur: 4 + (i % 5),
      delay: (i % 6) * 0.5,
      tint: i % 5 === 0 ? "rgba(255,237,180,0.95)"
          : i % 5 === 1 ? "rgba(167,139,250,0.95)"
          : i % 5 === 2 ? "rgba(103,232,249,0.9)"
          : i % 5 === 3 ? "rgba(244,114,182,0.85)"
          : "rgba(255,255,255,0.95)",
    };
  });

  return (
    <div
      aria-hidden="true"
      data-testid="chapter-cosmos"
      className="pointer-events-none absolute inset-0"
      style={{
        // overflow-visible so the orbital rings spill seamlessly
        // into the surrounding gap (was getting cut off by the
        // section bounds at desktop sizes where 120vmin > section
        // height). The page wrapper still clips horizontal overflow.
        overflow: "visible",
      }}
    >
      {/* Twinkle starfield — covers the full section so the cosmic
          backdrop is visible from "Choose your path" onward, and
          continues seamlessly into the telegram section's own
          stars. Each star is a single CSS @keyframes opacity
          tween — entirely compositor-thread. */}
      <div className="absolute inset-0 pointer-events-none">
        {STARS.map((s, i) => (
          <span
            key={`cc-star-${i}`}
            className="telegram-star absolute rounded-full"
            style={{
              left: s.left,
              top: s.top,
              width: s.size,
              height: s.size,
              background: s.tint,
              boxShadow: `0 0 ${s.size * 5}px ${s.tint}`,
              animationDuration: `${s.dur}s`,
              animationDelay: `${s.delay}s`,
            }}
          />
        ))}
      </div>

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
          <span
            key={i}
            className={reduced ? "absolute block h-2 w-2 rounded-full" : "constellation-dot absolute block h-2 w-2 rounded-full"}
            style={{
              left: p.x,
              top: p.y,
              background: p.c,
              boxShadow: `0 0 14px ${p.c}, 0 0 30px ${p.c}`,
              animationDuration: `${3 + i * 0.6}s`,
              animationDelay: `${i * 0.4}s`,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
