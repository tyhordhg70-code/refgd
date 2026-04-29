"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";

/**
 * Cosmic accent rendered behind the Chapter 01 heading on the home
 * page. Continues the storytelling beat from the CosmicJourney warp:
 * a faint orbital constellation that spins slowly and drifts into
 * view — the journey hasn't ended, the cosmos is still here.
 *
 * The orbital ring pulse on the star dots is driven by CSS
 * @keyframes (declared in app/globals.css under "ChapterCosmos") so
 * the work moves to the compositor and the main thread is free to
 * keep up with native scroll. The previous version ran 5 main-thread
 * JS interpolations every animation frame through framer-motion
 * `repeat: Infinity`, which was a measurable source of the page-wide
 * scroll stutter the user reported.
 *
 * NOTE: keyframes live in globals.css, NOT in a `<style jsx>` block.
 * styled-jsx scopes both selectors and `@keyframes` names per
 * component, but our inline `style={{ animation: "cc-twinkle ..." }}`
 * references the unscoped name — so when the keyframes were defined
 * in styled-jsx the renamed keyframe never matched and nothing ever
 * pulsed. globals.css gives us truly global keyframe names.
 */
export default function ChapterCosmos() {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div
      aria-hidden="true"
      data-testid="chapter-cosmos"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <motion.div
        className="absolute left-1/2 top-1/2 h-[120vmin] w-[120vmin] -translate-x-1/2 -translate-y-1/2"
        initial={
          mounted
            ? reduced
              ? { opacity: 0 }
              : { opacity: 0, rotate: 0, y: "6%" }
            : { opacity: 0 }
        }
        whileInView={
          reduced
            ? { opacity: 1 }
            : { opacity: 1, rotate: 35, y: "-6%" }
        }
        viewport={{ once: true, margin: "-10% 0px -10% 0px" }}
        transition={{ duration: reduced ? 1.2 : 1.6, ease: [0.22, 1, 0.36, 1] }}
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
        {/* Constellation accent dots — pulse via CSS @keyframes (globals.css) */}
        {[
          { x: "20%", y: "30%", c: "#ffe28a" },
          { x: "78%", y: "22%", c: "#a78bfa" },
          { x: "85%", y: "62%", c: "#67e8f9" },
          { x: "30%", y: "78%", c: "#f472b6" },
          { x: "55%", y: "55%", c: "#ffe28a" },
        ].map((p, i) => (
          <span
            key={i}
            className="cc-dot"
            style={{
              left: p.x,
              top: p.y,
              background: p.c,
              boxShadow: `0 0 14px ${p.c}, 0 0 30px ${p.c}`,
              animation: reduced
                ? "none"
                : `cc-twinkle ${3 + i * 0.6}s ease-in-out ${i * 0.4}s infinite`,
            }}
          />
        ))}
      </motion.div>
    </div>
  );
}
