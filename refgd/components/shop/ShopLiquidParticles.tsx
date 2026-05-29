"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * ShopLiquidParticles — full-page ambient background for the shop-methods page.
 *
 * Renders two layers inside one fixed container:
 *   1. an animated, clearly-coloured liquid gradient base (opaque, so it
 *      overrides the global galaxy backdrop on this page and gives a cohesive
 *      field that matches the floating orbs); and
 *   2. floating, blurred radial-gradient orbs — the visible "liquid particles".
 *
 * IMPORTANT — scroll safety:
 *   The orbs do NOT use `mix-blend-mode` and only animate `transform`. Earlier
 *   versions used `mixBlendMode:"screen"` on a `position:fixed` layer, which
 *   forces the browser to re-composite the whole page on every scroll frame and
 *   caused the page content (cards) to tear / vanish on scroll. Plain opacity
 *   over a coloured base reads just as well and stays cheap.
 */
const ORBS: Array<{
  w: number; h: number; top: string; left: string;
  c1: string; c2: string; blur: number;
  dur: number; delay: number; dx: number; dy: number;
}> = [
  { w: 520, h: 480, top: "2%",  left: "4%",  c1: "rgba(167,139,250,0.95)", c2: "rgba(99,102,241,0.55)",  blur: 70, dur: 22, delay: 0,   dx: 60,  dy: 70 },
  { w: 420, h: 380, top: "8%",  left: "66%", c1: "rgba(56,211,238,0.92)",  c2: "rgba(20,184,166,0.50)",  blur: 62, dur: 27, delay: 2.2, dx: -48, dy: 54 },
  { w: 560, h: 500, top: "44%", left: "28%", c1: "rgba(232,121,249,0.85)", c2: "rgba(168,85,247,0.48)",  blur: 84, dur: 32, delay: 4.5, dx: 36,  dy: -58 },
  { w: 360, h: 420, top: "64%", left: "76%", c1: "rgba(129,140,248,0.92)", c2: "rgba(59,130,246,0.52)",  blur: 60, dur: 24, delay: 1.1, dx: -42, dy: 46 },
  { w: 460, h: 400, top: "72%", left: "2%",  c1: "rgba(45,212,191,0.82)",  c2: "rgba(34,211,238,0.46)",  blur: 72, dur: 29, delay: 3.3, dx: 46,  dy: -40 },
  { w: 320, h: 360, top: "30%", left: "86%", c1: "rgba(192,132,252,0.88)", c2: "rgba(124,58,237,0.50)",  blur: 56, dur: 20, delay: 5.1, dx: -34, dy: 56 },
  { w: 390, h: 340, top: "16%", left: "20%", c1: "rgba(96,165,250,0.80)",  c2: "rgba(6,182,212,0.44)",   blur: 64, dur: 26, delay: 2.7, dx: 50,  dy: 60 },
  { w: 440, h: 470, top: "82%", left: "46%", c1: "rgba(217,70,239,0.78)",  c2: "rgba(139,92,246,0.42)",  blur: 76, dur: 28, delay: 1.6, dx: -30, dy: -48 },
  { w: 300, h: 320, top: "38%", left: "50%", c1: "rgba(244,114,182,0.74)", c2: "rgba(168,85,247,0.40)",  blur: 54, dur: 21, delay: 3.7, dx: 40,  dy: 34 },
  { w: 350, h: 300, top: "54%", left: "20%", c1: "rgba(96,165,250,0.82)",  c2: "rgba(79,70,229,0.46)",   blur: 60, dur: 25, delay: 0.8, dx: -44, dy: -38 },
];

export default function ShopLiquidParticles() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Animated liquid gradient base — vivid, matches the orb palette, and
          overrides the global galaxy backdrop so the page reads as one
          cohesive coloured field. */}
      <div className="shop-liquid-base absolute inset-0" />

      {ORBS.map((o, i) => (
        <motion.div
          key={i}
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

      {/* Very light top vignette to keep nav/hero text readable. */}
      <div
        className="absolute inset-x-0 top-0 h-[40vh]"
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
