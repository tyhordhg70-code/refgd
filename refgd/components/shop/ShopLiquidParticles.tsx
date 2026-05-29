"use client";

import { motion, useReducedMotion } from "framer-motion";

/**
 * ShopLiquidParticles — full-viewport fixed layer of floating, blurred
 * radial-gradient orbs that give the shop-methods page a 3D liquid-light
 * ambiance. Uses GPU-composited blur + mix-blend-mode:screen so the
 * cost stays in the compositor thread and doesn't battle GalaxyBackground.
 */
const ORBS: Array<{
  w: number; h: number; top: string; left: string;
  c1: string; c2: string; blur: number;
  dur: number; delay: number; dx: number; dy: number;
}> = [
  { w: 520, h: 480, top: "4%",  left: "6%",  c1: "rgba(124,58,237,0.50)", c2: "rgba(79,70,229,0.28)",  blur: 120, dur: 22, delay: 0,   dx: 55,  dy: 65 },
  { w: 420, h: 380, top: "10%", left: "68%", c1: "rgba(6,182,212,0.45)",  c2: "rgba(20,184,166,0.22)", blur: 100, dur: 27, delay: 2.2, dx: -45, dy: 50 },
  { w: 580, h: 520, top: "48%", left: "30%", c1: "rgba(217,70,239,0.40)", c2: "rgba(168,85,247,0.22)", blur: 145, dur: 32, delay: 4.5, dx: 32,  dy: -55 },
  { w: 360, h: 420, top: "68%", left: "78%", c1: "rgba(79,70,229,0.45)",  c2: "rgba(59,130,246,0.28)", blur: 92,  dur: 24, delay: 1.1, dx: -38, dy: 42 },
  { w: 460, h: 400, top: "74%", left: "4%",  c1: "rgba(20,184,166,0.38)", c2: "rgba(34,211,238,0.22)", blur: 115, dur: 29, delay: 3.3, dx: 42,  dy: -38 },
  { w: 310, h: 360, top: "33%", left: "90%", c1: "rgba(168,85,247,0.42)", c2: "rgba(124,58,237,0.24)", blur: 82,  dur: 20, delay: 5.1, dx: -32, dy: 52 },
  { w: 390, h: 340, top: "18%", left: "22%", c1: "rgba(34,211,238,0.35)", c2: "rgba(6,182,212,0.20)",  blur: 98,  dur: 26, delay: 2.7, dx: 48,  dy: 58 },
  { w: 440, h: 470, top: "86%", left: "48%", c1: "rgba(139,92,246,0.38)", c2: "rgba(217,70,239,0.20)", blur: 108, dur: 28, delay: 1.6, dx: -28, dy: -44 },
  { w: 290, h: 310, top: "40%", left: "53%", c1: "rgba(236,72,153,0.32)", c2: "rgba(168,85,247,0.18)", blur: 72,  dur: 21, delay: 3.7, dx: 38,  dy: 32 },
  { w: 350, h: 300, top: "58%", left: "24%", c1: "rgba(59,130,246,0.36)", c2: "rgba(79,70,229,0.20)",  blur: 88,  dur: 25, delay: 0.8, dx: -42, dy: -36 },
  { w: 480, h: 430, top: "25%", left: "80%", c1: "rgba(251,191,36,0.18)", c2: "rgba(217,70,239,0.22)", blur: 130, dur: 31, delay: 6,   dx: 20,  dy: 60 },
  { w: 320, h: 350, top: "82%", left: "12%", c1: "rgba(6,182,212,0.28)",  c2: "rgba(34,211,238,0.15)", blur: 78,  dur: 23, delay: 4,   dx: 50,  dy: -28 },
];

export default function ShopLiquidParticles() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden"
      style={{ zIndex: 0 }}
    >
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
            mixBlendMode: "screen",
            willChange: "transform, opacity",
          }}
          animate={
            reduced
              ? {}
              : {
                  x: [0, o.dx, o.dx * 0.3, -o.dx * 0.4, 0],
                  y: [0, o.dy, -o.dy * 0.5, o.dy * 0.35, 0],
                  scale: [1, 1.08, 0.96, 1.04, 1],
                  opacity: [0.65, 0.95, 0.75, 0.90, 0.65],
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
    </div>
  );
}
