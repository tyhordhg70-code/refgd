"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * ShopLiquidParticles — full-page ambient background for the shop-methods page.
 *
 * Renders two layers inside one fixed container:
 *   1. an animated multi-stop liquid gradient base (opaque, so it overrides the
 *      global galaxy backdrop on this page and gives a cohesive coloured field
 *      that matches the floating orbs); and
 *   2. floating, blurred radial-gradient orbs (mix-blend-mode:screen) that glow
 *      clearly on top of that gradient — the "liquid particles".
 *
 * Everything is GPU-composited (transform/opacity only) so it stays cheap.
 */
const ORBS: Array<{
  w: number; h: number; top: string; left: string;
  c1: string; c2: string; blur: number;
  dur: number; delay: number; dx: number; dy: number;
}> = [
  { w: 520, h: 480, top: "4%",  left: "6%",  c1: "rgba(139,92,246,0.85)", c2: "rgba(79,70,229,0.45)",  blur: 90,  dur: 22, delay: 0,   dx: 60,  dy: 70 },
  { w: 420, h: 380, top: "10%", left: "68%", c1: "rgba(34,211,238,0.78)", c2: "rgba(20,184,166,0.40)", blur: 80,  dur: 27, delay: 2.2, dx: -48, dy: 54 },
  { w: 560, h: 500, top: "46%", left: "30%", c1: "rgba(217,70,239,0.70)", c2: "rgba(168,85,247,0.38)", blur: 110, dur: 32, delay: 4.5, dx: 36,  dy: -58 },
  { w: 360, h: 420, top: "66%", left: "78%", c1: "rgba(99,102,241,0.80)", c2: "rgba(59,130,246,0.45)", blur: 76,  dur: 24, delay: 1.1, dx: -42, dy: 46 },
  { w: 460, h: 400, top: "74%", left: "4%",  c1: "rgba(45,212,191,0.66)", c2: "rgba(34,211,238,0.38)", blur: 92,  dur: 29, delay: 3.3, dx: 46,  dy: -40 },
  { w: 310, h: 360, top: "32%", left: "88%", c1: "rgba(168,85,247,0.74)", c2: "rgba(124,58,237,0.42)", blur: 70,  dur: 20, delay: 5.1, dx: -34, dy: 56 },
  { w: 390, h: 340, top: "18%", left: "22%", c1: "rgba(56,189,248,0.62)", c2: "rgba(6,182,212,0.34)",  blur: 80,  dur: 26, delay: 2.7, dx: 50,  dy: 60 },
  { w: 440, h: 470, top: "84%", left: "48%", c1: "rgba(167,139,250,0.66)", c2: "rgba(217,70,239,0.34)", blur: 96, dur: 28, delay: 1.6, dx: -30, dy: -48 },
  { w: 290, h: 310, top: "40%", left: "52%", c1: "rgba(236,72,153,0.58)", c2: "rgba(168,85,247,0.32)", blur: 64,  dur: 21, delay: 3.7, dx: 40,  dy: 34 },
  { w: 350, h: 300, top: "56%", left: "22%", c1: "rgba(59,130,246,0.64)", c2: "rgba(79,70,229,0.36)",  blur: 76,  dur: 25, delay: 0.8, dx: -44, dy: -38 },
  { w: 480, h: 430, top: "24%", left: "80%", c1: "rgba(251,191,36,0.40)", c2: "rgba(217,70,239,0.40)", blur: 104, dur: 31, delay: 6,   dx: 22,  dy: 62 },
  { w: 320, h: 350, top: "82%", left: "12%", c1: "rgba(34,211,238,0.52)", c2: "rgba(56,189,248,0.30)", blur: 70,  dur: 23, delay: 4,   dx: 52,  dy: -30 },
];

export default function ShopLiquidParticles() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {/* Animated liquid gradient base — matches the orb palette and overrides
          the global galaxy backdrop so the page reads as one cohesive field. */}
      <div className="shop-liquid-base absolute inset-0" />
      {/* Soft vignette to keep edges deep and text readable. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 0%, transparent 38%, rgba(5,3,12,0.55) 100%)",
        }}
      />

      {ORBS.map((o, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: o.w,
            height: o.h,
            top: o.top,
            left: o.left,
            background: `radial-gradient(ellipse at center, ${o.c1} 0%, ${o.c2} 42%, transparent 70%)`,
            filter: `blur(${o.blur}px)`,
            mixBlendMode: "screen",
            willChange: "transform, opacity",
          }}
          animate={
            reduced
              ? {}
              : {
                  x: [0, o.dx, o.dx * 0.3, -o.dx * 0.4, 0],
                  y: [0, o.dy, -o.dy * 0.5, o.dy * 0.35, 0],
                  scale: [1, 1.1, 0.95, 1.05, 1],
                  opacity: [0.85, 1, 0.9, 1, 0.85],
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

      <style jsx>{`
        .shop-liquid-base {
          background:
            radial-gradient(140% 120% at 12% 8%, rgba(76, 29, 149, 0.55) 0%, transparent 55%),
            radial-gradient(120% 120% at 88% 14%, rgba(8, 145, 178, 0.42) 0%, transparent 55%),
            radial-gradient(130% 120% at 70% 90%, rgba(192, 38, 211, 0.40) 0%, transparent 55%),
            radial-gradient(120% 120% at 20% 95%, rgba(29, 78, 216, 0.40) 0%, transparent 55%),
            linear-gradient(150deg, #0a0618 0%, #140a2e 28%, #0b1733 55%, #1a0b2e 80%, #07040f 100%);
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
