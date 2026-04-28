"use client";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Page-wide animated cosmic background for the home page.
 *
 * Renders a family of gradient orbs that drift behind every chapter
 * so the cosmos feels continuous all the way down. On desktop the
 * field rotates and intensifies with scroll; on mobile we keep the
 * orbs perfectly stable so address-bar viewport resizes don't cause
 * the dreaded scroll-jump / flicker.
 *
 * Sits between <GalaxyBackground/> (z-0) and the page content (z-2).
 */
export default function HomeBackground() {
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll();

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

  // Slow rotation that intensifies as you scroll. Disabled on mobile.
  const fieldRot = useTransform(
    scrollYProgress,
    [0, 1],
    stable ? [0, 0] : [0, 24],
  );
  const fieldScale = useTransform(
    scrollYProgress,
    [0, 0.5, 1],
    stable ? [1, 1, 1] : [1, 1.06, 1.14],
  );

  // Each orb gets its own scroll-driven shift on desktop only.
  const o1y = useTransform(scrollYProgress, [0, 1], stable ? ["0%", "0%"] : ["0%", "-22%"]);
  const o2y = useTransform(scrollYProgress, [0, 1], stable ? ["0%", "0%"] : ["0%", "18%"]);
  const o3y = useTransform(scrollYProgress, [0, 1], stable ? ["0%", "0%"] : ["0%", "-14%"]);
  const o4y = useTransform(scrollYProgress, [0, 1], stable ? ["0%", "0%"] : ["0%", "12%"]);
  const fieldOpacity = useTransform(
    scrollYProgress,
    [0, 0.15, 0.85, 1],
    [0.85, 0.95, 0.95, 0.75],
  );

  return (
    <motion.div
      aria-hidden="true"
      data-testid="home-background"
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      style={
        mounted
          ? { rotate: fieldRot, scale: fieldScale, opacity: fieldOpacity }
          : undefined
      }
      suppressHydrationWarning
    >
      {/* Soft vignette that keeps the centre of the page legible. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 35%, rgba(4,3,12,0.45) 100%)",
        }}
      />

      <motion.div
        className="orb orb-1 absolute left-[6%] top-[8%] h-[55vh] w-[55vh] rounded-full"
        style={mounted ? { y: o1y } : undefined}
        suppressHydrationWarning
      />
      <motion.div
        className="orb orb-2 absolute right-[4%] top-[18%] h-[50vh] w-[50vh] rounded-full"
        style={mounted ? { y: o2y } : undefined}
        suppressHydrationWarning
      />
      <motion.div
        className="orb orb-3 absolute left-[30%] top-[55%] h-[48vh] w-[48vh] rounded-full"
        style={mounted ? { y: o3y } : undefined}
        suppressHydrationWarning
      />
      <motion.div
        className="orb orb-4 absolute right-[24%] top-[78%] h-[40vh] w-[40vh] rounded-full"
        style={mounted ? { y: o4y } : undefined}
        suppressHydrationWarning
      />
    </motion.div>
  );
}
