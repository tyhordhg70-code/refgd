"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

/**
 * FloatingArt — small inline animated illustration intended to live
 * INSIDE editorial sections (e.g. "Evade like a PRO", "Comprehensive
 * solutions"). Combines:
 *   - scroll-driven Y drift + scale + rotate (parallax)
 *   - a continuous gentle bob/sway (CSS keyframes via framer)
 *   - one-shot reveal on viewport enter (replays on every entry)
 *
 * No backdrop / halo — the image must already be a transparent PNG/WebP
 * so the page galaxy shows through cleanly.
 */
type Props = {
  src: string;
  alt: string;
  size?: number;            // max width in px
  side?: "left" | "right" | "center";
  bobAmplitude?: number;    // px of vertical bob
  spin?: number;            // degrees of gentle continuous rotation
  className?: string;
};

export default function FloatingArt({
  src,
  alt,
  size = 320,
  side = "center",
  bobAmplitude = 18,
  spin = 3,
  className = "",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], [60, -60]);
  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [0.92, 1.05, 0.94]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-3, 3]);

  const justify =
    side === "left" ? "justify-start" : side === "right" ? "justify-end" : "justify-center";

  return (
    <div ref={ref} className={`relative flex w-full ${justify} ${className}`}>
      <motion.div
        style={{ y, scale, rotate, maxWidth: size }}
        className="relative w-full"
        initial={{ opacity: 0, scale: 0.7, filter: "blur(12px)" }}
        whileInView={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
        viewport={{ once: false, amount: 0.25 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.img
          src={src}
          alt={alt}
          loading="eager"
          decoding="async"
          className="block w-full h-auto object-contain drop-shadow-[0_24px_50px_rgba(0,0,0,0.55)]"
          animate={{
            y: [0, -bobAmplitude, 0, bobAmplitude * 0.6, 0],
            rotate: [0, spin, 0, -spin, 0],
          }}
          transition={{
            duration: 7,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          suppressHydrationWarning
        />
      </motion.div>
    </div>
  );
}
