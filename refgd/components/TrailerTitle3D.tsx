"use client";

  import { motion, useReducedMotion } from "framer-motion";

  /**
   * TrailerTitle3D v2 — render letters STATICALLY at full opacity. The
   * per-letter rotateY+rotateX+z=−180+opacity:0 whileInView reveal
   * previously emitted 18+ inline opacity:0 inline-block spans into
   * SSR. Lenis smooth-scroll broke whileInView's intersection observer,
   * so the title's letters stayed invisible — reading to users as
   * "the trailer title vanished".
   *
   * The new behaviour keeps the visual richness via the glow halo +
   * scanning underline (both visible regardless of viewport detection)
   * and drops the per-letter motion entirely. Letters render in
   * normal flow at full opacity and never disappear.
   */
  export default function TrailerTitle3D({
    text = "VIEW TRAILER VIDEO",
    className = "",
  }: {
    text?: string;
    className?: string;
  }) {
    const reduce = useReducedMotion();

    return (
      <div
        className={`relative mb-6 flex flex-col items-center justify-center text-center ${className}`}
        data-testid="trailer-title-3d"
      >
        {/* Subtle glow halo behind the letters — pulses on a slow loop
            so the title feels alive even though letters are static. */}
        <motion.span
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-1/2 -z-10 h-32 -translate-y-1/2 blur-3xl"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 50% 50%, rgba(34,211,238,0.55), transparent 70%)",
            opacity: 0.5,
          }}
          animate={
            reduce
              ? { opacity: 0.6 }
              : { opacity: [0.35, 0.7, 0.35] }
          }
          transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
        />

        <h2
          className="editorial-display flex flex-wrap items-center justify-center gap-y-1 text-white text-[clamp(1.6rem,5vw,3.6rem)] uppercase"
          style={{
            fontWeight: 900,
            letterSpacing: "0.04em",
            WebkitTextStroke: "1px rgba(34,211,238,0.45)",
            textShadow:
              "0 4px 24px rgba(0,0,0,0.85), 0 0 40px rgba(34,211,238,0.35), 0 2px 6px rgba(0,0,0,0.95)",
          }}
        >
          {text}
        </h2>

        {/* Thin animated underline that scans left → right. Starts at
            scaleX:1 in SSR (visible) and uses a CSS animation on mount
            for the entrance, so it never gets stuck at scaleX:0. */}
        <span
          aria-hidden
          className="safe-reveal-scale-x mt-3 block h-[2px] w-32 origin-left"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(34,211,238,0.95), transparent)",
          }}
        />
      </div>
    );
  }
  