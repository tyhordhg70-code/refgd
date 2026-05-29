"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * ShopLiquidParticles — full-page ambient background for the shop-methods page.
 *
 * Layers inside one fixed container:
 *   1. an animated, opaque liquid gradient base (overrides the global galaxy
 *      backdrop on this page — see page.tsx, which hides the global ambient
 *      layers while this is mounted);
 *   2. a FEW soft, dim, blurred colour orbs for ambient depth (kept low so they
 *      don't wash out the particles); and
 *   3. MANY bright, clearly-visible "liquid" droplets that float upward — these
 *      are the floating particles. Each is a soft radial-gradient blob with a
 *      bright glow so it reads as a discrete particle, not a smooth wash.
 *
 * Scroll safety: no `mix-blend-mode` anywhere (that on a fixed layer forces a
 * full-page re-composite every scroll frame and tears the cards). Elements only
 * animate `transform` / `opacity`.
 */
const ORBS: Array<{
  w: number; h: number; top: string; left: string;
  c1: string; c2: string; blur: number;
  dur: number; delay: number; dx: number; dy: number;
}> = [
  { w: 520, h: 480, top: "4%",  left: "6%",  c1: "rgba(139,92,246,0.45)", c2: "rgba(99,102,241,0.18)", blur: 90, dur: 26, delay: 0,   dx: 50,  dy: 60 },
  { w: 460, h: 420, top: "10%", left: "66%", c1: "rgba(34,211,238,0.40)", c2: "rgba(20,184,166,0.16)", blur: 86, dur: 30, delay: 2.2, dx: -42, dy: 48 },
  { w: 540, h: 480, top: "56%", left: "70%", c1: "rgba(217,70,239,0.38)", c2: "rgba(168,85,247,0.16)", blur: 96, dur: 32, delay: 4.5, dx: 34,  dy: -52 },
  { w: 460, h: 420, top: "70%", left: "4%",  c1: "rgba(59,130,246,0.40)", c2: "rgba(34,211,238,0.16)", blur: 88, dur: 28, delay: 1.4, dx: 40,  dy: -44 },
];

// Bright, visible floating "liquid" droplets. core = bright centre colour,
// edge = soft outer colour for the radial-gradient liquid look.
const PARTICLES: Array<{
  size: number; top: string; left: string; core: string; edge: string;
  dur: number; delay: number; drift: number; sway: number; peak: number;
}> = [
  { size: 26, top: "22%", left: "9%",  core: "rgba(216,205,255,0.98)", edge: "rgba(139,92,246,0.05)",  dur: 17, delay: 0.0, drift: -150, sway: 30,  peak: 0.95 },
  { size: 14, top: "32%", left: "20%", core: "rgba(190,245,255,0.98)", edge: "rgba(34,211,238,0.05)",  dur: 20, delay: 1.4, drift: -170, sway: -34, peak: 0.9  },
  { size: 20, top: "44%", left: "13%", core: "rgba(248,210,255,0.98)", edge: "rgba(217,70,239,0.05)",  dur: 23, delay: 0.7, drift: -160, sway: 26,  peak: 0.92 },
  { size: 11, top: "58%", left: "7%",  core: "rgba(205,214,255,0.98)", edge: "rgba(99,102,241,0.05)",  dur: 18, delay: 2.6, drift: -150, sway: -28, peak: 0.85 },
  { size: 30, top: "72%", left: "17%", core: "rgba(190,255,238,0.98)", edge: "rgba(45,212,191,0.05)",  dur: 26, delay: 1.0, drift: -180, sway: 34,  peak: 0.95 },
  { size: 15, top: "86%", left: "11%", core: "rgba(228,210,255,0.98)", edge: "rgba(139,92,246,0.05)",  dur: 19, delay: 3.2, drift: -150, sway: -24, peak: 0.88 },
  { size: 22, top: "18%", left: "40%", core: "rgba(200,224,255,0.98)", edge: "rgba(59,130,246,0.05)",  dur: 24, delay: 0.3, drift: -170, sway: 30,  peak: 0.92 },
  { size: 12, top: "36%", left: "50%", core: "rgba(250,214,255,0.98)", edge: "rgba(232,121,249,0.05)", dur: 17, delay: 2.0, drift: -150, sway: -30, peak: 0.85 },
  { size: 24, top: "56%", left: "45%", core: "rgba(190,245,255,0.98)", edge: "rgba(34,211,238,0.05)",  dur: 25, delay: 1.2, drift: -175, sway: 28,  peak: 0.93 },
  { size: 14, top: "74%", left: "53%", core: "rgba(216,205,255,0.98)", edge: "rgba(139,92,246,0.05)",  dur: 19, delay: 3.6, drift: -150, sway: -32, peak: 0.88 },
  { size: 28, top: "14%", left: "70%", core: "rgba(190,255,238,0.98)", edge: "rgba(45,212,191,0.05)",  dur: 27, delay: 0.9, drift: -180, sway: 30,  peak: 0.95 },
  { size: 13, top: "30%", left: "82%", core: "rgba(248,210,255,0.98)", edge: "rgba(217,70,239,0.05)",  dur: 18, delay: 2.4, drift: -150, sway: -26, peak: 0.86 },
  { size: 21, top: "48%", left: "77%", core: "rgba(205,214,255,0.98)", edge: "rgba(99,102,241,0.05)",  dur: 24, delay: 0.5, drift: -170, sway: 32,  peak: 0.92 },
  { size: 12, top: "64%", left: "88%", core: "rgba(190,245,255,0.98)", edge: "rgba(34,211,238,0.05)",  dur: 17, delay: 1.8, drift: -150, sway: -30, peak: 0.85 },
  { size: 26, top: "80%", left: "78%", core: "rgba(228,210,255,0.98)", edge: "rgba(139,92,246,0.05)",  dur: 26, delay: 3.0, drift: -180, sway: 26,  peak: 0.94 },
  { size: 15, top: "90%", left: "62%", core: "rgba(200,224,255,0.98)", edge: "rgba(59,130,246,0.05)",  dur: 20, delay: 1.5, drift: -150, sway: -28, peak: 0.88 },
  { size: 18, top: "10%", left: "54%", core: "rgba(250,214,255,0.98)", edge: "rgba(232,121,249,0.05)", dur: 22, delay: 2.8, drift: -160, sway: 24,  peak: 0.9  },
  { size: 23, top: "46%", left: "62%", core: "rgba(190,255,238,0.98)", edge: "rgba(45,212,191,0.05)",  dur: 25, delay: 0.2, drift: -175, sway: -34, peak: 0.93 },
  { size: 16, top: "26%", left: "30%", core: "rgba(216,205,255,0.98)", edge: "rgba(139,92,246,0.05)",  dur: 21, delay: 1.1, drift: -160, sway: 28,  peak: 0.9  },
  { size: 19, top: "66%", left: "34%", core: "rgba(190,245,255,0.98)", edge: "rgba(34,211,238,0.05)",  dur: 23, delay: 2.3, drift: -170, sway: -26, peak: 0.91 },
  { size: 12, top: "84%", left: "40%", core: "rgba(248,210,255,0.98)", edge: "rgba(217,70,239,0.05)",  dur: 18, delay: 0.6, drift: -150, sway: 30,  peak: 0.85 },
  { size: 25, top: "38%", left: "92%", core: "rgba(205,214,255,0.98)", edge: "rgba(99,102,241,0.05)",  dur: 26, delay: 1.9, drift: -180, sway: -30, peak: 0.93 },
];

export default function ShopLiquidParticles() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* 1. Animated opaque liquid gradient base. */}
      <div className="shop-liquid-base absolute inset-0" />

      {/* 2. A few dim ambient orbs. */}
      {ORBS.map((o, i) => (
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
                  scale: [1, 1.08, 0.96, 1.04, 1],
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

      {/* 3. Bright floating liquid droplets — the visible particles. */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={`p-${i}`}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            top: p.top,
            left: p.left,
            background: `radial-gradient(circle at 35% 30%, ${p.core} 0%, ${p.core.replace(/0\.98\)/, "0.55)")} 38%, ${p.edge} 78%, transparent 100%)`,
            boxShadow: `0 0 ${p.size}px ${p.size * 0.45}px ${p.core.replace(/0\.98\)/, "0.45)")}`,
            willChange: "transform, opacity",
          }}
          animate={
            reduced
              ? { opacity: p.peak * 0.7 }
              : {
                  y: [0, p.drift],
                  x: [0, p.sway, -p.sway * 0.6, p.sway * 0.4, 0],
                  opacity: [0, p.peak, p.peak, p.peak * 0.7, 0],
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

      {/* Light top vignette to keep nav / hero text readable. */}
      <div
        className="absolute inset-x-0 top-0 h-[42vh]"
        style={{
          background:
            "linear-gradient(to bottom, rgba(6,3,18,0.55) 0%, transparent 100%)",
        }}
      />

      <style jsx>{`
        .shop-liquid-base {
          background:
            radial-gradient(120% 110% at 12% 8%, rgba(124, 58, 237, 0.55) 0%, transparent 55%),
            radial-gradient(110% 110% at 88% 14%, rgba(34, 211, 238, 0.45) 0%, transparent 55%),
            radial-gradient(120% 110% at 70% 92%, rgba(217, 70, 239, 0.45) 0%, transparent 55%),
            radial-gradient(110% 110% at 18% 95%, rgba(59, 130, 246, 0.42) 0%, transparent 55%),
            linear-gradient(150deg, #130a30 0%, #1a0f40 26%, #0e2452 52%, #240f48 78%, #0a061d 100%);
          background-size: 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%;
          animation: shopLiquidShift 28s ease-in-out infinite;
        }
        @keyframes shopLiquidShift {
          0% {
            background-position: 0% 50%, 100% 50%, 50% 100%, 50% 0%, 0% 50%;
          }
          50% {
            background-position: 100% 50%, 0% 50%, 50% 0%, 50% 100%, 100% 50%;
          }
          100% {
            background-position: 0% 50%, 100% 50%, 50% 100%, 50% 0%, 0% 50%;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .shop-liquid-base {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
