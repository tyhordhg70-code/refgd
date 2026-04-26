"use client";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";
import KineticText from "./KineticText";

/**
 * Cinematic 3D hero — DeSo-style oversized edge-to-edge typography over
 * a layered atmospheric image. Mouse tracks tilt, scroll drives parallax,
 * floating refractive specks add ambient life.
 */
export default function Hero3D({
  src,
  alt = "RefundGod",
  kicker,
  title,
}: {
  src: string;
  alt?: string;
  kicker: string;
  title: string;
}) {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 18 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 120, damping: 18 });
  const transX = useSpring(useTransform(mx, [-0.5, 0.5], [-22, 22]), { stiffness: 80, damping: 20 });
  const transY = useSpring(useTransform(my, [-0.5, 0.5], [-14, 14]), { stiffness: 80, damping: 20 });

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end start"],
  });
  const heroY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const heroScale = useTransform(scrollYProgress, [0, 1], [1, 1.18]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.5, 0]);
  const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "-60%"]);
  const titleOpacity = useTransform(scrollYProgress, [0, 0.6, 1], [1, 0.6, 0]);

  useEffect(() => {
    if (reduced) return;
    const el = wrapRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = e.clientX - r.left;
      const cy = e.clientY - r.top;
      mx.set(cx / r.width - 0.5);
      my.set(cy / r.height - 0.5);
    };
    const onLeave = () => { mx.set(0); my.set(0); };
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [reduced, mx, my]);

  return (
    <section
      ref={wrapRef}
      className="relative isolate min-h-[100svh] w-full overflow-hidden"
      style={{ perspective: "1600px" }}
      data-cursor="big"
      data-cursor-label="explore"
    >
      {/* Glow blobs */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute left-[8%] top-[12%] h-[60vh] w-[60vh] animate-pulseGlow rounded-full bg-amber-400/20 blur-[140px]" />
        <div className="absolute right-[5%] top-[28%] h-[55vh] w-[55vh] animate-pulseGlow rounded-full bg-violet-500/22 blur-[140px]" style={{ animationDelay: "1.5s" }} />
        <div className="absolute left-[35%] bottom-[5%] h-[45vh] w-[45vh] animate-pulseGlow rounded-full bg-cyan-400/18 blur-[140px]" style={{ animationDelay: "3s" }} />
      </div>

      {/* Hero image with tilt + parallax */}
      <motion.div
        style={{ y: heroY, scale: heroScale, opacity: heroOpacity, transformStyle: "preserve-3d" }}
        className="absolute inset-0"
      >
        <motion.div
          style={{
            rotateX: reduced ? 0 : rotX,
            rotateY: reduced ? 0 : rotY,
            x: reduced ? 0 : transX,
            y: reduced ? 0 : transY,
            transformStyle: "preserve-3d",
            transformPerspective: 1600,
            willChange: "transform",
          }}
          className="absolute inset-0"
        >
          <Image src={src} alt={alt} fill priority sizes="100vw" className="object-cover" />
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 45%, transparent 30%, rgba(5,6,10,0.55) 68%, rgba(5,6,10,0.94) 100%), linear-gradient(180deg, rgba(5,6,10,0.45) 0%, transparent 25%, transparent 65%, rgba(5,6,10,0.96) 100%)",
            }}
          />
        </motion.div>
      </motion.div>

      {/* Floating specks */}
      {!reduced && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 32 }).map((_, i) => {
            const left = (i * 37) % 100;
            const top = (i * 53) % 100;
            const dur = 12 + (i % 7) * 2;
            const delay = (i % 5) * 1.4;
            const size = 1 + (i % 4);
            const hue = i % 3 === 0 ? "rgba(245,185,69,0.85)" : i % 3 === 1 ? "rgba(167,139,250,0.85)" : "rgba(103,232,249,0.85)";
            return (
              <span
                key={i}
                className="absolute rounded-full"
                style={{
                  left: `${left}%`,
                  top: `${top}%`,
                  width: `${size}px`,
                  height: `${size}px`,
                  background: hue,
                  boxShadow: `0 0 ${4 + size * 4}px ${hue}`,
                  animation: `floatSlow ${dur}s ease-in-out ${delay}s infinite`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* Headline overlay — DeSo edge-to-edge type */}
      <motion.div
        style={{ y: titleY, opacity: titleOpacity }}
        className="container-wide relative z-10 flex min-h-[100svh] flex-col justify-center"
      >
        <div className="mx-auto w-full text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.25, 0.4, 0.25, 1] }}
            className="heading-display text-base font-medium lowercase tracking-[0.45em] text-amber-200/95 sm:text-lg"
          >
            {kicker}
          </motion.p>
          <KineticText
            as="h1"
            text={title}
            className="editorial-display mx-auto mt-6 max-w-[1400px] text-balance bg-gradient-to-b from-white via-white to-amber-200 bg-clip-text text-transparent text-[clamp(3rem,11vw,12rem)] uppercase drop-shadow-[0_8px_60px_rgba(0,0,0,0.65)]"
            stagger={0.08}
            delay={0.15}
          />
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            className="mt-12 flex flex-col items-center gap-2 text-white/55"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.4em]">scroll</span>
            <span className="block h-12 w-px animate-pulseGlow bg-gradient-to-b from-white/60 to-transparent" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
