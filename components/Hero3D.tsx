"use client";
import { motion, useScroll, useTransform, useReducedMotion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";
import KineticText from "./KineticText";
import InteractiveParticles from "./InteractiveParticles";

/**
 * Immersive 3D hero. The whole composition is part of the page
 * structure — layered orbs that orbit, refract, and re-shape as you
 * scroll. Mouse parallax + scroll-linked depth + interactive particles
 * that flee the cursor.
 *
 * Title is OPTIONAL — when omitted, only the kicker (e.g. "WELCOME")
 * is displayed, big and centered, so it does not duplicate the path-
 * picker headline that follows immediately below.
 */
export default function Hero3D({
  kicker,
  title,
}: {
  kicker: string;
  title?: string;
}) {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const showTitle = !!(title && title.trim());

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [10, -10]), { stiffness: 120, damping: 18 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), { stiffness: 120, damping: 18 });
  const transX = useSpring(useTransform(mx, [-0.5, 0.5], [-30, 30]), { stiffness: 80, damping: 20 });
  const transY = useSpring(useTransform(my, [-0.5, 0.5], [-22, 22]), { stiffness: 80, damping: 20 });

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end start"],
  });

  // Planet: zooms past the viewer & vanishes as user scrolls down.
  const orbY      = useTransform(scrollYProgress, [0, 1], ["0%",   "70%"]);
  const orbScale  = useTransform(scrollYProgress, [0, 1], [1,      1.85]);
  const orbOpac   = useTransform(scrollYProgress, [0, 0.7, 1], [1,  0.5, 0]);
  const ringRot   = useTransform(scrollYProgress, [0, 1], [0,      160]);
  const ringScale = useTransform(scrollYProgress, [0, 1], [1,      0.30]);
  const ringOpac  = useTransform(scrollYProgress, [0, 0.85], [1,   0.10]);
  const cardY     = useTransform(scrollYProgress, [0, 1], ["0%",   "-40%"]);
  const cardOpac  = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.5, 0]);

  useEffect(() => {
    if (reduced) return;
    const el = wrapRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      mx.set((e.clientX - r.left) / r.width - 0.5);
      my.set((e.clientY - r.top) / r.height - 0.5);
    };
    const onLeave = () => { mx.set(0); my.set(0); };
    window.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      window.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [reduced, mx, my]);

  return (
    <section
      ref={wrapRef}
      className="relative isolate min-h-[100svh] w-full overflow-hidden bg-ink-950"
      style={{ perspective: "1800px" }}
      data-cursor="big"
      data-cursor-label="explore"
    >
      {/* ── PULSATING MESH GRADIENT BACKDROP ───────────────────────── */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="orb orb-1 absolute left-[6%] top-[10%] h-[60vh] w-[60vh] rounded-full" />
        <div className="orb orb-2 absolute right-[4%] top-[22%] h-[55vh] w-[55vh] rounded-full" />
        <div className="orb orb-3 absolute left-[35%] bottom-[2%] h-[50vh] w-[50vh] rounded-full" />
        <div className="orb orb-4 absolute right-[28%] bottom-[12%] h-[40vh] w-[40vh] rounded-full" />
      </div>

      {/* ── INTEGRATED 3D SCENE: orbs + rings, scroll-driven ───────── */}
      <motion.div
        style={{
          y: orbY,
          scale: orbScale,
          opacity: orbOpac,
          transformStyle: "preserve-3d",
        }}
        suppressHydrationWarning
        className="pointer-events-none absolute inset-0 grid place-items-center"
      >
        <motion.div
          style={{
            rotateX: reduced ? 0 : rotX,
            rotateY: reduced ? 0 : rotY,
            x: reduced ? 0 : transX,
            y: reduced ? 0 : transY,
            transformStyle: "preserve-3d",
            willChange: "transform",
          }}
          suppressHydrationWarning
          className="relative h-[78vh] w-[78vh] max-h-[820px] max-w-[820px]"
        >
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              style={{
                rotate: ringRot,
                scale: ringScale,
                opacity: ringOpac,
                z: i * 14,
              }}
              suppressHydrationWarning
              className="absolute inset-0 rounded-full"
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-full"
                style={{
                  border: "1px solid rgba(255,225,140,0.20)",
                  boxShadow: "inset 0 0 60px rgba(245,185,69,0.08)",
                  margin: `${i * 26}px`,
                }}
              />
            </motion.div>
          ))}

          {/* CRISP LIVING PLANET — slow auto-rotation, full clarity, no
              static blur. The static wrapper handles centering + Z-depth
              so the inner motion element is free to use rotate/scale
              without colliding with translate(-50%,-50%).                */}
          <div
            className="absolute left-1/2 top-1/2 h-[44%] w-[44%]"
            style={{ transform: "translate(-50%, -50%) translateZ(80px)" }}
          >
            <motion.div
              className="h-full w-full rounded-full"
              animate={reduced ? {} : { rotate: 360 }}
              transition={reduced ? {} : { duration: 80, repeat: Infinity, ease: "linear" }}
              style={{
                background:
                  "radial-gradient(circle at 30% 28%, rgba(255,237,180,1) 0%, rgba(245,185,69,0.85) 22%, rgba(167,139,250,0.62) 55%, rgba(34,211,238,0.32) 85%, transparent 100%)," +
                  "radial-gradient(circle at 70% 78%, rgba(167,139,250,0.55), transparent 60%)," +
                  "radial-gradient(circle at 22% 80%, rgba(34,211,238,0.45), transparent 55%)",
                boxShadow:
                  "0 0 140px 50px rgba(245,185,69,0.40), 0 0 260px 90px rgba(167,139,250,0.28), inset 0 0 80px rgba(255,255,255,0.5)",
              }}
            />
          </div>
          {/* surface highlight — pulses gently like solar flare */}
          <div
            className="absolute left-1/2 top-1/2 h-[44%] w-[44%]"
            style={{ transform: "translate(-50%, -50%) translateZ(82px)" }}
          >
            <motion.div
              className="h-full w-full rounded-full"
              animate={reduced ? {} : { opacity: [0.55, 0.95, 0.55], scale: [1, 1.06, 1] }}
              transition={reduced ? {} : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
              style={{
                background:
                  "radial-gradient(circle at 32% 26%, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.0) 28%)",
                mixBlendMode: "screen",
              }}
            />
          </div>

          {[
            { d: 0,    color: "#ffe28a", radiusVh: 30, dur: 18 },
            { d: -3,   color: "#a78bfa", radiusVh: 34, dur: 22 },
            { d: -6,   color: "#67e8f9", radiusVh: 26, dur: 16 },
            { d: -9,   color: "#f472b6", radiusVh: 38, dur: 26 },
          ].map((o, i) => (
            <span
              key={i}
              aria-hidden="true"
              className="orbit-wrap absolute left-1/2 top-1/2 block h-0 w-0"
              style={{
                animation: `spin ${o.dur}s linear ${o.d}s infinite`,
                transformOrigin: "center",
              }}
            >
              <span
                className="absolute block h-3 w-3 rounded-full"
                style={{
                  background: o.color,
                  boxShadow: `0 0 20px ${o.color}, 0 0 60px ${o.color}`,
                  transform: `translate(-50%, -50%) translateY(-${o.radiusVh}vh) translateZ(60px)`,
                }}
              />
            </span>
          ))}
        </motion.div>
      </motion.div>

      {/* ── INTERACTIVE PARTICLES — flee the cursor ───────────────── */}
      <InteractiveParticles count={80} />

      {/* ── HEADLINE ─────────────────────────────────────────────── */}
      <motion.div
        style={{ y: cardY, opacity: cardOpac }}
        suppressHydrationWarning
        className="pointer-events-none container-wide relative z-10 flex min-h-[100svh] flex-col items-center justify-center text-center"
      >
        {/* No backdrop card — the kicker sits directly on the cosmos.
            Smaller, refined scale that lets the galaxy breathe behind. */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.1, ease: [0.25, 0.4, 0.25, 1] }}
          suppressHydrationWarning
          className="mx-auto inline-block px-2"
        >
          <KineticText
            as="h1"
            text={kicker}
            className="editorial-display text-balance uppercase text-white text-[clamp(2.5rem,9vw,7rem)] leading-[0.95] tracking-[-0.015em]"
            style={{
              textShadow:
                "0 4px 50px rgba(0,0,0,0.95), 0 0 60px rgba(245,185,69,0.45), 0 2px 14px rgba(0,0,0,0.95)",
            }}
            stagger={0.1}
            delay={0.1}
          />
          {showTitle && (
            <KineticText
              as="p"
              text={title!}
              className="heading-display mx-auto mt-6 max-w-3xl text-balance text-white/85 text-[clamp(0.85rem,1.6vw,1.15rem)] uppercase tracking-[0.32em]"
              style={{ textShadow: "0 2px 18px rgba(0,0,0,0.9)" }}
              stagger={0.04}
              delay={0.6}
            />
          )}
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.4 }}
          suppressHydrationWarning
          className="mt-14 flex flex-col items-center gap-2 text-white/65"
        >
          <span className="text-[10px] font-semibold uppercase tracking-[0.4em]">scroll</span>
          <span className="block h-12 w-px animate-pulseGlow bg-gradient-to-b from-white/70 to-transparent" />
        </motion.div>
      </motion.div>
    </section>
  );
}
