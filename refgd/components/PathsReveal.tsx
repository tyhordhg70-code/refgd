"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

/**
 * PathsReveal — flies the "Choose your path to mastery" headline + the
 * four path cards in from depth, so the chapter 01 section feels like
 * a direct continuation of the cosmic warp above.
 *
 * Was previously scroll-driven (useScroll + useTransform), which meant
 * the user had to keep scrolling to reveal the section. It's now a
 * one-shot viewport-triggered animation that completes in ~1.4s the
 * moment the wrapper enters view.
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
          ? { opacity: 0, y: 28, scale: 1 }
          : { opacity: 0, y: 34, scale: 0.98 }
      }
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
      transition={{
        duration: reduced ? 0 : 0.65,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{
        transformOrigin: "50% 0%",
        willChange: "transform, opacity",
      }}
      className="relative"
    >
      {children}
    </motion.div>
  );
}
