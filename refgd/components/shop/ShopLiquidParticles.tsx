"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * ShopLiquidParticles — full-page ambient background for the shop-methods page.
 *
 * Light "billgang" style: a very soft off-white lavender base with large
 * slow-moving pastel blobs (ORBS) and coloured floating liquid droplets
 * (PARTICLES) that are clearly visible against the pale background.
 *
 * Layers:
 *   1. Animated light lavender-white gradient base
 *   2. Large, softly blurred pastel colour orbs for ambient depth
 *   3. Coloured "liquid" droplets that float upward
 *
 * Scroll safety: no mix-blend-mode (causes full-page recomposite on scroll).
 * Only transform / opacity are animated.
 */
const ORBS: Array<{
  w: number; h: number; top: string; left: string;
  c1: string; c2: string; blur: number;
  dur: number; delay: number; dx: number; dy: number;
}> = [
  { w: 700, h: 640, top: "2%",  left: "4%",  c1: "rgba(139,92,246,0.22)",  c2: "rgba(99,102,241,0.08)",  blur: 110, dur: 28, delay: 0,   dx: 60,  dy: 70  },
  { w: 620, h: 560, top: "8%",  left: "62%", c1: "rgba(56,189,248,0.18)",  c2: "rgba(20,184,166,0.07)",  blur: 100, dur: 32, delay: 2.4, dx: -50, dy: 55  },
  { w: 680, h: 620, top: "54%", left: "68%", c1: "rgba(232,121,249,0.20)", c2: "rgba(168,85,247,0.08)",  blur: 115, dur: 34, delay: 5.0, dx: 40,  dy: -60 },
  { w: 640, h: 560, top: "66%", left: "2%",  c1: "rgba(99,102,241,0.20)",  c2: "rgba(56,189,248,0.07)",  blur: 105, dur: 30, delay: 1.6, dx: 50,  dy: -50 },
  { w: 560, h: 500, top: "38%", left: "36%", c1: "rgba(251,146,60,0.10)",  c2: "rgba(249,168,212,0.07)", blur: 120, dur: 36, delay: 3.2, dx: -30, dy: 40  },
];

// Coloured liquid droplets — saturated enough to read against the light bg.
const PARTICLES: Array<{
  size: number; top: string; left: string; core: string; edge: string;
  dur: number; delay: number; drift: number; sway: number; peak: number;
}> = [
  { size: 28, top: "22%", left: "9%",  core: "rgba(109,40,217,0.55)",  edge: "rgba(109,40,217,0.06)",  dur: 17, delay: 0.0, drift: -160, sway: 32,  peak: 0.85 },
  { size: 16, top: "32%", left: "20%", core: "rgba(8,145,178,0.52)",   edge: "rgba(8,145,178,0.06)",   dur: 21, delay: 1.4, drift: -175, sway: -36, peak: 0.80 },
  { size: 22, top: "44%", left: "13%", core: "rgba(192,38,211,0.50)",  edge: "rgba(192,38,211,0.06)",  dur: 24, delay: 0.7, drift: -165, sway: 28,  peak: 0.82 },
  { size: 13, top: "58%", left: "7%",  core: "rgba(67,56,202,0.55)",   edge: "rgba(67,56,202,0.06)",   dur: 19, delay: 2.8, drift: -155, sway: -30, peak: 0.78 },
  { size: 32, top: "72%", left: "17%", core: "rgba(5,150,105,0.48)",   edge: "rgba(5,150,105,0.06)",   dur: 27, delay: 1.0, drift: -185, sway: 36,  peak: 0.86 },
  { size: 17, top: "86%", left: "11%", core: "rgba(109,40,217,0.50)",  edge: "rgba(109,40,217,0.06)",  dur: 20, delay: 3.4, drift: -155, sway: -26, peak: 0.78 },
  { size: 24, top: "18%", left: "40%", core: "rgba(37,99,235,0.50)",   edge: "rgba(37,99,235,0.06)",   dur: 25, delay: 0.3, drift: -175, sway: 32,  peak: 0.82 },
  { size: 14, top: "36%", left: "50%", core: "rgba(192,38,211,0.48)",  edge: "rgba(192,38,211,0.06)",  dur: 18, delay: 2.1, drift: -155, sway: -32, peak: 0.76 },
  { size: 26, top: "56%", left: "45%", core: "rgba(8,145,178,0.52)",   edge: "rgba(8,145,178,0.06)",   dur: 26, delay: 1.3, drift: -180, sway: 30,  peak: 0.83 },
  { size: 15, top: "74%", left: "53%", core: "rgba(109,40,217,0.50)",  edge: "rgba(109,40,217,0.06)",  dur: 20, delay: 3.8, drift: -155, sway: -34, peak: 0.78 },
  { size: 30, top: "14%", left: "70%", core: "rgba(5,150,105,0.48)",   edge: "rgba(5,150,105,0.06)",   dur: 28, delay: 0.9, drift: -185, sway: 32,  peak: 0.85 },
  { size: 14, top: "30%", left: "82%", core: "rgba(192,38,211,0.50)",  edge: "rgba(192,38,211,0.06)",  dur: 19, delay: 2.5, drift: -155, sway: -28, peak: 0.78 },
  { size: 22, top: "48%", left: "77%", core: "rgba(67,56,202,0.52)",   edge: "rgba(67,56,202,0.06)",   dur: 25, delay: 0.5, drift: -175, sway: 34,  peak: 0.82 },
  { size: 13, top: "64%", left: "88%", core: "rgba(8,145,178,0.50)",   edge: "rgba(8,145,178,0.06)",   dur: 18, delay: 1.9, drift: -155, sway: -32, peak: 0.76 },
  { size: 28, top: "80%", left: "78%", core: "rgba(109,40,217,0.52)",  edge: "rgba(109,40,217,0.06)",  dur: 27, delay: 3.1, drift: -185, sway: 28,  peak: 0.84 },
  { size: 17, top: "90%", left: "62%", core: "rgba(37,99,235,0.48)",   edge: "rgba(37,99,235,0.06)",   dur: 21, delay: 1.6, drift: -155, sway: -30, peak: 0.78 },
  { size: 20, top: "10%", left: "54%", core: "rgba(192,38,211,0.48)",  edge: "rgba(192,38,211,0.06)",  dur: 23, delay: 2.9, drift: -165, sway: 26,  peak: 0.80 },
  { size: 25, top: "46%", left: "62%", core: "rgba(5,150,105,0.50)",   edge: "rgba(5,150,105,0.06)",   dur: 26, delay: 0.2, drift: -180, sway: -36, peak: 0.83 },
  { size: 18, top: "26%", left: "30%", core: "rgba(67,56,202,0.52)",   edge: "rgba(67,56,202,0.06)",   dur: 22, delay: 1.2, drift: -165, sway: 30,  peak: 0.80 },
  { size: 21, top: "66%", left: "34%", core: "rgba(8,145,178,0.50)",   edge: "rgba(8,145,178,0.06)",   dur: 24, delay: 2.4, drift: -175, sway: -28, peak: 0.81 },
  { size: 13, top: "84%", left: "40%", core: "rgba(192,38,211,0.48)",  edge: "rgba(192,38,211,0.06)",  dur: 19, delay: 0.6, drift: -155, sway: 32,  peak: 0.76 },
  { size: 27, top: "38%", left: "92%", core: "rgba(109,40,217,0.52)",  edge: "rgba(109,40,217,0.06)",  dur: 27, delay: 2.0, drift: -185, sway: -32, peak: 0.84 },
];

export default function ShopLiquidParticles() {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const onVis = (e: Event) =>
      setPaused(!!(e as CustomEvent<{ open: boolean }>).detail?.open);
    window.addEventListener("vouches:visibility", onVis as EventListener);
    return () =>
      window.removeEventListener("vouches:visibility", onVis as EventListener);
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* 1. Animated light lavender-white gradient base. */}
      <div
        className="shop-liquid-base absolute inset-0"
        style={{ animationPlayState: paused ? "paused" : "running" }}
      />

      {/* 2. Large pastel ambient orbs. */}
      {!paused && ORBS.map((o, i) => (
        <motion.div
          key={`orb-${i}`}
          className="absolute rounded-full"
          style={{
            width: o.w,
            height: o.h,
            top: o.top,
            left: o.left,
            background: `radial-gradient(ellipse at center, ${o.c1} 0%, ${o.c2} 45%, transparent 72%)`,
            filter: `blur(${o.blur}px)`,
            willChange: "transform",
          }}
          animate={
            reduced
              ? {}
              : {
                  x: [0, o.dx, o.dx * 0.3, -o.dx * 0.4, 0],
                  y: [0, o.dy, -o.dy * 0.5, o.dy * 0.35, 0],
                  scale: [1, 1.07, 0.96, 1.04, 1],
                }
          }
          transition={{
            duration: o.dur,
            delay: o.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* 3. Coloured floating liquid droplets. */}
      {!paused && PARTICLES.map((p, i) => (
        <motion.span
          key={`p-${i}`}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            top: p.top,
            left: p.left,
            background: `radial-gradient(circle at 35% 30%, ${p.core} 0%, ${p.core.replace(/0\.\d+\)/, "0.30)")} 38%, ${p.edge} 78%, transparent 100%)`,
            boxShadow: `0 0 ${p.size}px ${Math.round(p.size * 0.4)}px ${p.core.replace(/0\.\d+\)/, "0.18)")}`,
            willChange: "transform, opacity",
          }}
          animate={
            reduced
              ? { opacity: p.peak * 0.6 }
              : {
                  y: [0, p.drift],
                  x: [0, p.sway, -p.sway * 0.6, p.sway * 0.4, 0],
                  opacity: [0, p.peak, p.peak, p.peak * 0.6, 0],
                  scale: [0.6, 1, 0.92, 1.06, 0.6],
                }
          }
          transition={{
            duration: p.dur,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      <style jsx>{`
        .shop-liquid-base {
          background:
            radial-gradient(130% 120% at 10% 6%,  rgba(139,92,246,0.22) 0%, transparent 55%),
            radial-gradient(120% 120% at 90% 12%,  rgba(56,189,248,0.18) 0%, transparent 55%),
            radial-gradient(130% 120% at 72% 94%,  rgba(232,121,249,0.20) 0%, transparent 55%),
            radial-gradient(120% 120% at 16% 96%,  rgba(99,102,241,0.18) 0%, transparent 55%),
            linear-gradient(150deg, #fdfcff 0%, #f8f3ff 22%, #f0f6ff 48%, #faf3ff 74%, #fcfeff 100%);
          background-size: 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%;
          animation: shopLiquidShift 32s ease-in-out infinite;
        }
        @keyframes shopLiquidShift {
          0%   { background-position: 0% 50%, 100% 50%, 50% 100%, 50% 0%, 0% 50%; }
          50%  { background-position: 100% 50%, 0% 50%, 50% 0%, 50% 100%, 100% 50%; }
          100% { background-position: 0% 50%, 100% 50%, 50% 100%, 50% 0%, 0% 50%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .shop-liquid-base { animation: none; }
        }
      `}</style>
    </div>
  );
}
