"use client";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * PathsReveal — flies the "Choose your path to mastery" headline + the
 * four path cards in from depth, so the chapter 01 section feels like
 * a direct continuation of the cosmic warp above (no visible page
 * break, no opaque card sitting on a separate page).
 *
 * The wrapper anchors itself with `start end → start start`, meaning
 * the reveal completes by the time its top edge hits the top of the
 * viewport — i.e. exactly as the cosmic journey behind it finishes.
 *
 * On mobile we tone down the transform magnitudes (and disable scale)
 * so the address-bar resize never re-rasterises a giant scaled layer
 * mid-scroll — that was the source of the previous flicker.
 */
export default function PathsReveal({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null);
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

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "start start"],
  });

  const stable = reduced;

  // Rise from below — much larger on desktop to feel like depth, gentler
  // on mobile so the layer doesn't dance with the address-bar resize.
  const y = useTransform(
    scrollYProgress,
    [0, 1],
    stable ? ["0px", "0px"] : isMobile ? ["80px", "0px"] : ["220px", "0px"],
  );

  // Scale from depth → real size. Disabled on mobile (a scale transform
  // causes constant re-rasterisation while scrolling).
  const scale = useTransform(
    scrollYProgress,
    [0, 1],
    stable || isMobile ? [1, 1] : [0.86, 1],
  );

  // Fade in from the warp.
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.35, 1],
    stable ? [1, 1, 1] : [0, 0.65, 1],
  );

  return (
    <motion.div
      ref={ref}
      data-testid="paths-reveal"
      style={
        mounted
          ? {
              y,
              scale,
              opacity,
              transformOrigin: "50% 0%",
              willChange: "transform, opacity",
            }
          : undefined
      }
      suppressHydrationWarning
      className="relative"
    >
      {children}
    </motion.div>
  );
}
