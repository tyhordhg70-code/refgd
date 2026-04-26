"use client";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";
import Image from "next/image";

/**
 * Cinematic pin-on-scroll section, noomoagency-style. The user scrolls
 * past a tall outer container; inside we sticky-pin a 100vh viewport,
 * then drive the inner image's scale, rotation, and a text-overlay's
 * opacity from `scrollYProgress`. The result is a "story-telling" beat
 * that reveals an image as the user scrolls without leaving the page.
 */
export default function PinSection({
  imageSrc,
  alt,
  eyebrow,
  title,
  body,
  accent = "amber",
  height = "200vh",
}: {
  imageSrc: string;
  alt: string;
  eyebrow?: string;
  title: string;
  body?: string;
  accent?: "amber" | "violet" | "cyan" | "fuchsia";
  height?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.18, 1, 1.04]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-2.5, 2.5]);
  const y = useTransform(scrollYProgress, [0, 1], ["12%", "-12%"]);
  const titleY = useTransform(scrollYProgress, [0, 0.5, 1], ["40%", "0%", "-30%"]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.25, 0.7, 1], [0, 1, 1, 0.4]);
  const veil = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 0.55, 0.85]);

  const accentColor = {
    amber: "from-amber-200 via-white to-amber-200",
    violet: "from-violet-200 via-white to-fuchsia-200",
    cyan: "from-cyan-200 via-white to-sky-200",
    fuchsia: "from-fuchsia-200 via-white to-pink-200",
  }[accent];

  if (reduced) {
    return (
      <section className="container-px py-24">
        <div className="relative aspect-video overflow-hidden rounded-3xl">
          <Image src={imageSrc} alt={alt} fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-ink-950/60" />
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              {eyebrow && <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/70">{eyebrow}</p>}
              <h2 className={`heading-display mt-3 bg-gradient-to-r ${accentColor} bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-5xl`}>
                {title}
              </h2>
              {body && <p className="mx-auto mt-4 max-w-2xl text-base text-white/75">{body}</p>}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} style={{ height }} className="relative">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        <motion.div style={{ scale, rotate, y }} className="absolute inset-0">
          <Image
            src={imageSrc}
            alt={alt}
            fill
            sizes="100vw"
            className="object-cover"
          />
        </motion.div>
        <motion.div
          aria-hidden="true"
          style={{ opacity: veil }}
          className="absolute inset-0"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/70 via-ink-950/30 to-ink-950/95" />
        </motion.div>

        <motion.div
          style={{ y: titleY, opacity: titleOpacity }}
          className="container-px relative z-10 grid h-full place-items-center"
        >
          <div className="max-w-4xl text-center">
            {eyebrow && (
              <p className="heading-display text-xs font-semibold uppercase tracking-[0.45em] text-white/75 sm:text-sm">
                {eyebrow}
              </p>
            )}
            <h2 className={`heading-display mt-4 bg-gradient-to-r ${accentColor} bg-clip-text text-balance text-4xl font-bold uppercase leading-tight tracking-tight text-transparent drop-shadow-[0_4px_30px_rgba(0,0,0,0.6)] sm:text-6xl md:text-7xl`}>
              {title}
            </h2>
            {body && (
              <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-white/85 sm:text-lg">
                {body}
              </p>
            )}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
