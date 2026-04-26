"use client";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode } from "react";
import Image from "next/image";
import KineticText from "./KineticText";

/**
 * Cinematic pin-on-scroll section, noomoagency-style. Sticky 100vh
 * viewport with image scale/rotate/parallax driven by scroll progress;
 * kinetic-reveal headline floats above; glass label chip in the
 * top-right corner; ambient animated glow.
 */
export default function PinSection({
  imageSrc,
  alt,
  eyebrow,
  title,
  body,
  accent = "amber",
  height = "240vh",
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

  const scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.22, 1, 1.06]);
  const rotate = useTransform(scrollYProgress, [0, 1], [-3, 3]);
  const y = useTransform(scrollYProgress, [0, 1], ["14%", "-14%"]);
  const titleY = useTransform(scrollYProgress, [0.1, 0.5, 0.95], ["20%", "0%", "-20%"]);
  const titleOpacity = useTransform(scrollYProgress, [0.05, 0.25, 0.7, 0.95], [0, 1, 1, 0.4]);
  const veil = useTransform(scrollYProgress, [0, 0.5, 1], [0.85, 0.55, 0.85]);

  const accentTextGrad = {
    amber: "from-amber-200 via-white to-amber-300",
    violet: "from-violet-200 via-white to-fuchsia-200",
    cyan: "from-cyan-200 via-white to-sky-200",
    fuchsia: "from-fuchsia-200 via-white to-pink-200",
  }[accent];

  const accentGlow = {
    amber: "rgba(245,185,69,0.30)",
    violet: "rgba(167,139,250,0.30)",
    cyan: "rgba(34,211,238,0.30)",
    fuchsia: "rgba(244,114,182,0.30)",
  }[accent];

  if (reduced) {
    return (
      <section className="container-wide py-24">
        <div className="relative aspect-video overflow-hidden rounded-[2.5rem]">
          <Image src={imageSrc} alt={alt} fill className="object-cover" sizes="100vw" />
          <div className="absolute inset-0 bg-ink-950/65" />
          <div className="absolute inset-0 grid place-items-center text-center">
            <div>
              {eyebrow && <p className="heading-display text-xs font-semibold uppercase tracking-[0.45em] text-white/70">{eyebrow}</p>}
              <h2 className={`editorial-display mt-4 bg-gradient-to-b ${accentTextGrad} bg-clip-text text-transparent text-4xl uppercase sm:text-7xl`}>
                {title}
              </h2>
              {body && <p className="mx-auto mt-6 max-w-2xl text-lg text-white/85">{body}</p>}
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section ref={ref} style={{ height }} className="relative" data-cursor="big">
      <div className="sticky top-0 h-[100svh] w-full overflow-hidden">
        {/* Image plate with parallax + tilt */}
        <motion.div style={{ scale, rotate, y }} className="absolute inset-0">
          <Image src={imageSrc} alt={alt} fill sizes="100vw" priority className="object-cover" />
        </motion.div>

        {/* Veil */}
        <motion.div
          aria-hidden="true"
          style={{ opacity: veil }}
          className="absolute inset-0"
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 45%, transparent 25%, rgba(5,6,10,0.55) 70%, rgba(5,6,10,0.96) 100%), linear-gradient(180deg, rgba(5,6,10,0.5) 0%, transparent 25%, transparent 65%, rgba(5,6,10,0.98) 100%)",
            }}
          />
        </motion.div>

        {/* Ambient glow */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div
            className="absolute left-[20%] top-[20%] h-[55vh] w-[55vh] animate-pulseGlow rounded-full blur-[140px]"
            style={{ background: accentGlow }}
          />
          <div
            className="absolute right-[10%] bottom-[15%] h-[40vh] w-[40vh] animate-pulseGlow rounded-full blur-[120px]"
            style={{ background: accentGlow, animationDelay: "1.4s" }}
          />
        </div>

        {/* Glass corner chip */}
        {eyebrow && (
          <div className="absolute right-6 top-6 z-20 sm:right-10 sm:top-10">
            <div className="rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 backdrop-blur-xl">
              <p className="heading-display text-[10px] font-semibold uppercase tracking-[0.4em] text-white/85">
                {eyebrow}
              </p>
            </div>
          </div>
        )}

        {/* Headline */}
        <motion.div
          style={{ y: titleY, opacity: titleOpacity }}
          className="container-wide relative z-10 grid h-full place-items-center"
        >
          <div className="text-center">
            <KineticText
              as="h2"
              text={title}
              className={`editorial-display mx-auto max-w-[1500px] text-balance bg-gradient-to-b ${accentTextGrad} bg-clip-text text-transparent text-[clamp(2.5rem,9vw,11rem)] uppercase drop-shadow-[0_8px_60px_rgba(0,0,0,0.7)]`}
              stagger={0.07}
            />
            {body && (
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 1.3 }}
                className="mx-auto mt-8 max-w-3xl text-balance text-lg leading-relaxed text-white/85 sm:text-xl"
              >
                {body}
              </motion.p>
            )}
          </div>
        </motion.div>

        {/* Scroll indicator */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.6 }}
          className="absolute bottom-10 left-1/2 z-10 -translate-x-1/2 text-center"
        >
          <span className="block text-[10px] font-semibold uppercase tracking-[0.45em] text-white/55">scroll</span>
          <span className="mx-auto mt-2 block h-12 w-px animate-pulseGlow bg-gradient-to-b from-white/60 to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}
