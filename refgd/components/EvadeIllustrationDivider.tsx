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
  // v6.13.4 — REMOVED the scroll-driven `scale: [0.98, 1.02, 0.98]`
  // and `rotate: [-1°, 1°]`. Two user-visible bugs both traced to
  // those keyframes:
  //   1. The image visibly pulsed (squash → stretch) mid-scroll,
  //      which read as a "distorted illustration".
  //   2. When `scale` dipped to 0.98, the contained image shrank
  //      ~2 % inside its slot, exposing a thin horizontal strip of
  //      page-bg above + below the artwork. As the scroll progress
  //      crossed the section, that strip appeared, widened, then
  //      closed back — exactly the "black bar appears and
  //      disappears mid-scroll" the user reported.
  // Keeping just the small y-drift gives parallax life without
  // mutating the image's intrinsic dimensions.

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
    <section className={compact ? "relative py-0" : "relative py-1 sm:py-2"}>
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
          {/* v6.13.10 — Image rendering rebuilt to fix two reports:
              (a) "illustration distorted" — the previous code set
                  CSS `height` on the <img> AND `max-w-[80vw]`. When
                  the natural width at the chosen height exceeded
                  80 vw, the browser clamped the width WITHOUT
                  re-deriving the height, squashing the picture. We
                  now constrain via maxHeight + maxWidth only, with
                  `width:auto height:auto`, so the browser preserves
                  the intrinsic aspect ratio in every viewport.
              (b) "black bar on bottom" — the heavy
                  `drop-shadow(0 30px 60px rgba(0,0,0,0.55))` cast a
                  60-px blurred dark band BELOW the artwork that
                  read on dark backgrounds as a horizontal black
                  bar between sections. Replaced with a much softer
                  shadow (12 px blur, 0.35 alpha) that doesn't read
                  as a separate bar against the page wash. */}
          <motion.img
            src={src}
            alt={alt}
            loading="eager"
            decoding="async"
            style={{
              y,
              maxHeight: height,
              maxWidth: "80vw",
              width: "auto",
              height: "auto",
              filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.35))",
            }}
            className="relative z-10 object-contain"
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
