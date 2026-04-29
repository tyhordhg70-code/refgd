"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

/**
 * PathsReveal — flies the "Choose your path to mastery" headline +
 * the four path cards in from depth, so the chapter section feels
 * like a direct continuation of the cosmic warp above.
 *
 *   ── Behaviour ────────────────────────────────────────────────
 *   On enter, the wrapper fades in, lifts up, rotates from a slight
 *   3D tilt (`rotateX: 18°`) and scales from 95 % → 100 %. With
 *   `once: false`, the entrance REPLAYS every time the section
 *   re-enters the viewport — exactly what the user asked for so
 *   that scrolling back up to the top and then down again doesn't
 *   leave the section sitting in its final state silently.
 */
export default function PathsReveal({ children }: { children: ReactNode }) {
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

  if (!mounted) {
    // SSR: render content as-is so the page is visible immediately
    // and the in-view animation can take over once mounted.
    return <div className="relative">{children}</div>;
  }

  return (
    <motion.div
      data-testid="paths-reveal"
      initial={
        reduced
          ? { opacity: 1 }
          : isMobile
          ? { opacity: 0, y: 36, scale: 0.97, rotateX: 12 }
          : { opacity: 0, y: 50, scale: 0.95, rotateX: 18 }
      }
      whileInView={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      viewport={{ once: false, amount: 0.18 }}
      transition={{
        duration: reduced ? 0 : 0.85,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{
        transformOrigin: "50% 0%",
        transformStyle: "preserve-3d",
        perspective: 1600,
        willChange: "transform, opacity",
      }}
      className="relative"
    >
      {children}
    </motion.div>
  );
}
