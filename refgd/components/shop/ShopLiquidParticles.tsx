"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * ShopLiquidParticles — full-page ambient background for the shop-methods page.
 *
 * Three layers inside one fixed container:
 *   1. an animated, opaque liquid gradient base (overrides the global galaxy
 *      backdrop on this page — see page.tsx, which hides the global ambient
 *      layers while this is mounted);
 *   2. a few large, soft, blurred colour orbs for the ambient "liquid" field; and
 *   3. many small, crisp, glowing "particles" that clearly float around — these
 *      are what reads as discrete floating particles.
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
  { w: 520, h: 480, top: "2%",  left: "4%",  c1: "rgba(167,139,250,0.85)", c2: "rgba(99,102,241,0.40)",  blur: 80, dur: 24, delay: 0,   dx: 60,  dy: 70 },
  { w: 460, h: 420, top: "8%",  left: "66%", c1: "rgba(56,211,238,0.80)",  c2: "rgba(20,184,166,0.38)",  blur: 76, dur: 28, delay: 2.2, dx: -48, dy: 54 },
  { w: 560, h: 500, top: "44%", left: "26%", c1: "rgba(232,121,249,0.72)", c2: "rgba(168,85,247,0.36)",  blur: 96, dur: 32, delay: 4.5, dx: 36,  dy: -58 },
  { w: 400, h: 440, top: "62%", left: "74%", c1: "rgba(129,140,248,0.80)", c2: "rgba(59,130,246,0.40)",  blur: 74, dur: 26, delay: 1.1, dx: -42, dy: 46 },
  { w: 460, h: 400, top: "74%", left: "2%",  c1: "rgba(45,212,191,0.70)",  c2: "rgba(34,211,238,0.36)",  blur: 84, dur: 30, delay: 3.3, dx: 46,  dy: -40 },
  { w: 360, h: 380, top: "30%", left: "84%", c1: "rgba(192,132,252,0.74)", c2: "rgba(124,58,237,0.38)",  blur: 70, dur: 22, delay: 5.1, dx: -34, dy: 56 },
  { w: 420, h: 460, top: "84%", left: "46%", c1: "rgba(217,70,239,0.66)",  c2: "rgba(139,92,246,0.34)",  blur: 88, dur: 29, delay: 1.6, dx: -30, dy: -48 },
];

// Small, crisp floating particles — the visible "liquid gradient particles".
const PARTICLES: Array<{
  size: number; top: string; left: string; color: string;
  dur: number; delay: number; drift: number; sway: number;
}> = [
  { size: 10, top: "18%", left: "10%", color: "#c4b5fd", dur: 15, delay: 0.0, drift: -120, sway: 26 },
  { size: 6,  top: "28%", left: "22%", color: "#67e8f9", dur: 18, delay: 1.4, drift: -150, sway: -30 },
  { size: 8,  top: "40%", left: "14%", color: "#f0abfc", dur: 21, delay: 0.7, drift: -140, sway: 22 },
  { size: 5,  top: "55%", left: "8%",  color: "#a5b4fc", dur: 17, delay: 2.6, drift: -130, sway: -24 },
  { size: 12, top: "70%", left: "18%", color: "#5eead4", dur: 24, delay: 1.0, drift: -160, sway: 30 },
  { size: 7,  top: "85%", left: "12%", color: "#d8b4fe", dur: 19, delay: 3.2, drift: -120, sway: -20 },
  { size: 9,  top: "20%", left: "40%", color: "#93c5fd", dur: 22, delay: 0.3, drift: -150, sway: 28 },
  { size: 5,  top: "36%", left: "50%", color: "#f5d0fe", dur: 16, delay: 2.0, drift: -120, sway: -26 },
  { size: 8,  top: "58%", left: "44%", color: "#7dd3fc", dur: 23, delay: 1.2, drift: -150, sway: 24 },
  { size: 6,  top: "76%", left: "54%", color: "#c4b5fd", dur: 18, delay: 3.6, drift: -130, sway: -30 },
  { size: 11, top: "14%", left: "70%", color: "#67e8f9", dur: 25, delay: 0.9, drift: -160, sway: 26 },
  { size: 6,  top: "30%", left: "82%", color: "#f0abfc", dur: 17, delay: 2.4, drift: -120, sway: -22 },
  { size: 9,  top: "48%", left: "76%", color: "#a5b4fc", dur: 21, delay: 0.5, drift: -150, sway: 30 },
  { size: 5,  top: "64%", left: "88%", color: "#5eead4", dur: 16, delay: 1.8, drift: -120, sway: -28 },
  { size: 8,  top: "80%", left: "78%", color: "#d8b4fe", dur: 23, delay: 3.0, drift: -150, sway: 24 },
  { size: 7,  top: "90%", left: "64%", color: "#93c5fd", dur: 19, delay: 1.5, drift: -130, sway: -26 },
  { size: 6,  top: "10%", left: "54%", color: "#f5d0fe", dur: 20, delay: 2.8, drift: -140, sway: 22 },
  { size: 10, top: "46%", left: "62%", color: "#7dd3fc", dur: 24, delay: 0.2, drift: -160, sway: -30 },
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

      {/* 2. Large soft ambient orbs. */}
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
                  scale: [1, 1.1, 0.95, 1.05, 1],
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

      {/* 3. Small crisp floating particles. */}
      {PARTICLES.map((p, i) => (
        <motion.span
          key={`p-${i}`}
          className="absolute rounded-full"
          style={{
            width: p.size,
            height: p.size,
            top: p.top,
            left: p.left,
            background: p.color,
            boxShadow: `0 0 ${p.size * 1.6}px ${p.size * 0.5}px ${p.color}`,
            willChange: "transform, opacity",
          }}
          animate={
            reduced
              ? { opacity: 0.6 }
              : {
                  y: [0, p.drift],
                  x: [0, p.sway, -p.sway * 0.6, p.sway * 0.4, 0],
                  opacity: [0, 0.95, 0.9, 0.7, 0],
                  scale: [0.7, 1, 0.9, 1.05, 0.7],
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
            radial-gradient(120% 110% at 12% 8%, rgba(139, 92, 246, 0.75) 0%, transparent 55%),
            radial-gradient(110% 110% at 88% 14%, rgba(34, 211, 238, 0.62) 0%, transparent 55%),
            radial-gradient(120% 110% at 70% 92%, rgba(217, 70, 239, 0.60) 0%, transparent 55%),
            radial-gradient(110% 110% at 18% 95%, rgba(59, 130, 246, 0.58) 0%, transparent 55%),
            linear-gradient(150deg, #160a36 0%, #1e1147 26%, #112a5c 52%, #2a1150 78%, #0c0722 100%);
          background-size: 200% 200%, 200% 200%, 200% 200%, 200% 200%, 200% 200%;
          animation: shopLiquidShift 26s ease-in-out infinite;
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
