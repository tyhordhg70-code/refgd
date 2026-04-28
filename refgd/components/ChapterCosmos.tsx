"use client";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Cosmic accent rendered behind the Chapter 01 heading on the home
 * page. Continues the storytelling beat from the CosmicJourney warp:
 * a faint orbital constellation that spins slowly and drifts into
 * view as the user reads the chapter intro — the journey hasn't
 * ended, the cosmos is still here.
 *
 * Pure CSS / framer-motion. No raster assets. Pointer-events:none so
 * it never gets in the way of editable copy / clicks.
 */
export default function ChapterCosmos() {
  const reduced = useReducedMotion();
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

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
  const rot = useTransform(scrollYProgress, [0, 1], stable ? [0, 0] : [0, 35]);
  const fade = useTransform(scrollYProgress, [0, 0.25, 0.85, 1], [0, 1, 1, 0.4]);
  const drift = useTransform(scrollYProgress, [0, 1], stable ? ["0%", "0%"] : ["6%", "-6%"]);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      data-testid="chapter-cosmos"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <motion.div
        className="absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2"
        style={mounted ? { rotate: rot, opacity: fade, y: drift } : { opacity: 0 }}
        suppressHydrationWarning
      >
        {/* Faint orbital rings */}
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: `${n * 28}vmin`,
              height: `${n * 28}vmin`,
              border: `1px solid rgba(255,225,140,${0.16 - n * 0.03})`,
              boxShadow: `inset 0 0 ${n * 18}px rgba(167,139,250,${0.10 - n * 0.02})`,
            }}
          />
        ))}
        {/* Constellation accent dots */}
        {[
          { x: "20%", y: "30%", c: "#ffe28a" },
          { x: "78%", y: "22%", c: "#a78bfa" },
          { x: "85%", y: "62%", c: "#67e8f9" },
          { x: "30%", y: "78%", c: "#f472b6" },
          { x: "55%", y: "55%", c: "#ffe28a" },
        ].map((p, i) => (
          <motion.span
            key={i}
            className="absolute block h-2 w-2 rounded-full"
            style={{
              left: p.x,
              top: p.y,
              background: p.c,
              boxShadow: `0 0 14px ${p.c}, 0 0 30px ${p.c}`,
            }}
            animate={
              reduced
                ? {}
                : { opacity: [0.4, 1, 0.4], scale: [0.8, 1.4, 0.8] }
            }
            transition={
              reduced
                ? {}
                : {
                    duration: 3 + i * 0.6,
                    repeat: Infinity,
                    delay: i * 0.4,
                    ease: "easeInOut",
                  }
            }
          />
        ))}
      </motion.div>
    </div>
  );
}
