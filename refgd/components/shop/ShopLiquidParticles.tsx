"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * ShopLiquidParticles — full-page ambient background for the shop-methods page.
 *
 * Billgang-style: pure white base + 5 large vivid "liquid glass" blobs.
 * Each blob looks 3-dimensional via:
 *   • bright white specular highlight at top-left (radial-gradient)
 *   • saturated colour body fading to transparent at edges
 *   • coloured box-shadow glow (inner + outer halo)
 *   • slow organic borderRadius morph → the "liquid" motion
 *   • gentle float (translate x/y)
 *
 * No blur on the blobs themselves — blur kills the glassy sharpness.
 * The background is opaque white so the global dark galaxy is hidden.
 *
 * Scroll safety: only transform / opacity / borderRadius animate.
 */

type Blob = {
  size: number;
  left: string;
  top: string;
  rgb: [number, number, number];
  dx: number[];
  dy: number[];
  dur: number;
  delay: number;
  r0: string;
  r1: string;
};

const BLOBS: Blob[] = [
  {
    size: 480,
    left: "-8%", top: "-4%",
    rgb: [130, 60, 255],
    dx: [0, 32, -12, 0], dy: [0, 24, -18, 0],
    dur: 22, delay: 0,
    r0: "62% 38% 56% 44% / 54% 46% 54% 46%",
    r1: "40% 60% 42% 58% / 46% 54% 46% 54%",
  },
  {
    size: 440,
    left: "70%", top: "-6%",
    rgb: [20, 170, 245],
    dx: [0, -28, 18, 0], dy: [0, 28, 8, 0],
    dur: 26, delay: 4,
    r0: "44% 56% 62% 38% / 58% 42% 58% 42%",
    r1: "60% 40% 44% 56% / 44% 56% 40% 60%",
  },
  {
    size: 420,
    left: "62%", top: "62%",
    rgb: [220, 55, 200],
    dx: [0, 22, -24, 0], dy: [0, -22, 14, 0],
    dur: 24, delay: 8,
    r0: "54% 46% 48% 52% / 42% 58% 48% 52%",
    r1: "36% 64% 58% 42% / 56% 44% 60% 40%",
  },
  {
    size: 400,
    left: "-5%", top: "65%",
    rgb: [10, 195, 135],
    dx: [0, 28, -10, 0], dy: [0, -20, 14, 0],
    dur: 28, delay: 12,
    r0: "50% 50% 58% 42% / 60% 40% 50% 50%",
    r1: "44% 56% 42% 58% / 40% 60% 58% 42%",
  },
  {
    size: 350,
    left: "33%", top: "40%",
    rgb: [255, 110, 40],
    dx: [0, -20, 26, 0], dy: [0, -26, 10, 0],
    dur: 30, delay: 16,
    r0: "46% 54% 60% 40% / 52% 48% 46% 54%",
    r1: "58% 42% 46% 54% / 38% 62% 56% 44%",
  },
];

function LiquidBlob({ b, reduced, paused }: { b: Blob; reduced: boolean | null; paused: boolean }) {
  const [r, g, bl] = b.rgb;
  const main  = `rgba(${r},${g},${bl},0.88)`;
  const mid   = `rgba(${r},${g},${bl},0.68)`;
  const edge  = `rgba(${r},${g},${bl},0.22)`;
  const glow1 = `rgba(${r},${g},${bl},0.50)`;
  const glow2 = `rgba(${r},${g},${bl},0.20)`;

  return (
    <motion.div
      style={{
        position: "absolute",
        width: b.size,
        height: b.size,
        left: b.left,
        top: b.top,
        background: `radial-gradient(circle at 30% 28%, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.72) 7%, ${main} 20%, ${mid} 46%, ${edge} 74%, transparent 100%)`,
        boxShadow: `0 0 55px 18px ${glow1}, 0 0 100px 45px ${glow2}, inset 0 0 35px rgba(255,255,255,0.28)`,
        willChange: "transform, border-radius",
      }}
      animate={
        reduced || paused
          ? { borderRadius: b.r0 }
          : {
              x: b.dx,
              y: b.dy,
              scale: [1, 1.06, 0.97, 1.03, 1],
              borderRadius: [b.r0, b.r1, b.r0],
            }
      }
      transition={{
        duration: b.dur,
        delay: b.delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
    />
  );
}

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
      style={{ zIndex: 0, background: "#ffffff" }}
    >
      {BLOBS.map((b, i) => (
        <LiquidBlob key={i} b={b} reduced={reduced} paused={paused} />
      ))}
    </div>
  );
}
