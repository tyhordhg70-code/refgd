"use client";
import Image from "next/image";
import { motion, useScroll, useTransform, useReducedMotion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";

/**
 * Cinematic 3D hero — replaces the firework splash. Inspired by
 * noomoagency / deso / thesillybunny: a full-bleed atmospheric image
 * that responds to mouse + scroll with layered parallax depth.
 *
 *  - Image tilts on mouse position (preserve-3d perspective)
 *  - Image scales/translates with scroll (parallax)
 *  - Soft animated glow blobs behind the image (depth layer 0)
 *  - Floating refractive specks overlay (depth layer 2)
 *  - Headline overlay with subtle motion (depth layer 3)
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

  // Mouse-tracked tilt (smoothed via spring)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 18 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 120, damping: 18 });
  const transX = useSpring(useTransform(mx, [-0.5, 0.5], [-18, 18]), { stiffness: 80, damping: 20 });
  const transY = useSpring(useTransform(my, [-0.5, 0.5], [-12, 12]), { stiffness: 80, damping: 20 });

  // Scroll-based parallax for the hero
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
    >
      {/* Depth layer 0 — animated glow blobs behind everything */}
      <div aria-hidden="true" className="absolute inset-0 -z-10">
        <div className="absolute left-[10%] top-[15%] h-[55vh] w-[55vh] animate-pulseGlow rounded-full bg-amber-400/15 blur-[120px]" />
        <div className="absolute right-[8%] top-[35%] h-[45vh] w-[45vh] animate-pulseGlow rounded-full bg-violet-500/20 blur-[120px]" style={{ animationDelay: "1.5s" }} />
        <div className="absolute left-[35%] bottom-[8%] h-[40vh] w-[40vh] animate-pulseGlow rounded-full bg-cyan-400/15 blur-[120px]" style={{ animationDelay: "3s" }} />
      </div>

      {/* Depth layer 1 — the hero image with 3D tilt + scroll parallax */}
      <motion.div
        style={{
          y: heroY,
          scale: heroScale,
          opacity: heroOpacity,
          transformStyle: "preserve-3d",
        }}
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
          <Image
            src={src}
            alt={alt}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          {/* Vignette so headline reads */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, transparent 35%, rgba(5,6,10,0.55) 70%, rgba(5,6,10,0.92) 100%), linear-gradient(180deg, rgba(5,6,10,0.4) 0%, transparent 25%, transparent 65%, rgba(5,6,10,0.95) 100%)",
            }}
          />
        </motion.div>
      </motion.div>

      {/* Depth layer 2 — floating refractive specks (CSS-only, GPU) */}
      {!reduced && (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          {Array.from({ length: 28 }).map((_, i) => {
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

      {/* Depth layer 3 — headline overlay with parallax */}
      <motion.div
        style={{ y: titleY, opacity: titleOpacity }}
        className="container-px relative z-10 grid min-h-[100svh] place-items-center"
      >
        <div className="-mt-16 text-center">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, ease: [0.25, 0.4, 0.25, 1] }}
            className="heading-display text-base font-medium lowercase tracking-[0.45em] text-amber-200/90 sm:text-lg"
          >
            {kicker}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 30, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 1.2, delay: 0.15, ease: [0.25, 0.4, 0.25, 1] }}
            className="heading-display mx-auto mt-4 max-w-5xl text-balance text-4xl font-bold uppercase leading-[0.98] tracking-tight text-white drop-shadow-[0_4px_30px_rgba(0,0,0,0.7)] sm:text-6xl md:text-7xl lg:text-8xl"
          >
            <span className="bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent">
              {title}
            </span>
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.1 }}
            className="mt-10 flex flex-col items-center gap-2 text-white/55"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.4em]">scroll</span>
            <span className="block h-10 w-px animate-pulseGlow bg-gradient-to-b from-white/60 to-transparent" />
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
