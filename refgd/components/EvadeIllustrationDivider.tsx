"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/**
 * EvadeIllustrationDivider — between-section illustration band that
 * holds the page's hero artwork OUTSIDE of any GlassCard. Used to
 * separate the "Evade like a PRO" / "Solutions" / "Trust" chapters
 * with a visible piece of artwork instead of stuffing those images
 * behind the cards (where they were unreadable).
 *
 * The band is full-bleed inside the page container, the image floats
 * with a parallax drift on scroll, and there's an optional caption.
 */
export default function EvadeIllustrationDivider({
  src,
  alt,
  align = "center",
  glow = "violet",
  caption,
  height = 360,
  /** When true, no halo backdrop is rendered behind the artwork
   *  (used for cases where the image is already a fully transparent
   *  PNG and any halo wash would compete with the page galaxy). */
  transparent = false,
  /** Tighter vertical padding — used for divider bands that should
   *  feel inline with adjacent sections instead of floating apart. */
  compact = false,
}: {
  src: string;
  alt: string;
  align?: "left" | "center" | "right";
  glow?: "cyan" | "violet" | "amber" | "fuchsia";
  caption?: string;
  height?: number;
  transparent?: boolean;
  compact?: boolean;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // v6.7 — TIGHTENED parallax (was [40,-40]). The original range
  // shifted the artwork 40 px down at entry, producing the "huge
  // gap above Get Started Today" the user reported. Keep the image
  // close to its layout position so the band reads as one unit
  // with the section header above it.
  const y = useTransform(scrollYProgress, [0, 1], [10, -10]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.98, 1.02, 0.98]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-1, 1]);

  const glowMap = {
    cyan: "rgba(34,211,238,0.45)",
    violet: "rgba(167,139,250,0.45)",
    amber: "rgba(245,185,69,0.45)",
    fuchsia: "rgba(232,121,249,0.45)",
  } as const;

  const justify =
    align === "left"
      ? "justify-start"
      : align === "right"
      ? "justify-end"
      : "justify-center";

  return (
    <section className={compact ? "relative py-2" : "relative py-4 sm:py-6"}>
      <div className="container-wide">
        <div
          ref={ref}
          className={`relative flex w-full items-center ${justify}`}
          style={{ minHeight: height }}
        >
          {/* Soft halo behind the artwork so it reads as floating in
              space and not pasted on the page background. Suppressed
              when `transparent` is set — the image then floats over
              the bare page galaxy with no extra backdrop. */}
          {transparent ? null : (
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background: `radial-gradient(ellipse 60% 50% at ${
                  align === "left" ? "30%" : align === "right" ? "70%" : "50%"
                } 50%, ${glowMap[glow]}, transparent 65%)`,
                filter: "blur(20px)",
              }}
            />
          )}
          <motion.img
            src={src}
            alt={alt}
            loading="eager"
            decoding="async"
            style={{ y, scale, rotate, height }}
            className="relative z-10 w-auto max-w-[80vw] object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.55)]"
            suppressHydrationWarning
          />
        </div>
        {caption ? (
          <p className="mt-4 text-center text-xs uppercase tracking-[0.5em] text-white/55">
            {caption}
          </p>
        ) : null}
      </div>
    </section>
  );
}
