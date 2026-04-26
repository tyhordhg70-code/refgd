"use client";
import { motion, useScroll, useTransform, useReducedMotion, useMotionValue, useSpring } from "framer-motion";
import { useEffect, useRef } from "react";
import KineticText from "./KineticText";
import InteractiveParticles from "./InteractiveParticles";

/**
 * Immersive 3D hero. The whole composition is part of the page
 * structure — layered orbs that orbit, refract, and re-shape as you
 * scroll. Mouse parallax + scroll-linked depth + interactive particles
 * that flee the cursor. The text overlay sits inside a backdrop-blur
 * card so it stays readable, but pointer-events are scoped only to
 * actually interactive elements so the planet/particles can be poked
 * with the cursor anywhere on the canvas — even where text appears.
 */
export default function Hero3D({
  kicker,
  title,
}: {
  kicker: string;
  title: string;
}) {
  const reduced = useReducedMotion();
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rotX = useSpring(useTransform(my, [-0.5, 0.5], [8, -8]), { stiffness: 120, damping: 18 });
  const rotY = useSpring(useTransform(mx, [-0.5, 0.5], [-12, 12]), { stiffness: 120, damping: 18 });
  const transX = useSpring(useTransform(mx, [-0.5, 0.5], [-26, 26]), { stiffness: 80, damping: 20 });
  const transY = useSpring(useTransform(my, [-0.5, 0.5], [-18, 18]), { stiffness: 80, damping: 20 });

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end start"],
  });

  const orbY      = useTransform(scrollYProgress, [0, 1], ["0%",   "60%"]);
  const orbScale  = useTransform(scrollYProgress, [0, 1], [1,      1.55]);
  const orbBlur   = useTransform(scrollYProgress, [0, 1], [0,      14]);
  const ringRot   = useTransform(scrollYProgress, [0, 1], [0,      135]);
  const ringScale = useTransform(scrollYProgress, [0, 1], [1,      0.35]);
  const ringOpac  = useTransform(scrollYProgress, [0, 0.85], [1,   0.15]);
  const cardY     = useTransform(scrollYProgress, [0, 1], ["0%",   "-30%"]);
  const cardOpac  = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.6, 0]);
  const titleY    = useTransform(scrollYProgress, [0, 1], ["0%",   "-50%"]);
  const titleOp   = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.7, 0]);
  const blurFilter = useTransform(orbBlur, (v) => `blur(${v}px)`);

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
    // Listen on the window so cursor over the centered text/card still
    // moves the planet (the section spans the full viewport).
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
          filter: blurFilter,
          transformStyle: "preserve-3d",
        }}
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
          className="relative h-[78vh] w-[78vh] max-h-[820px] max-w-[820px]"
        >
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              style={{
                rotate: ringRot,
                scale: ringScale,
                opacity: ringOpac,
                transform: `translateZ(${i * 14}px)`,
              }}
              className="absolute inset-0 rounded-full border"
              {...({} as any)}
            >
              <div
                aria-hidden="true"
                className="absolute inset-0 rounded-full"
                style={{
                  border: "1px solid rgba(255,225,140,0.18)",
                  boxShadow: "inset 0 0 60px rgba(245,185,69,0.07)",
                  margin: `${i * 26}px`,
                }}
              />
            </motion.div>
          ))}
          <div
            className="absolute left-1/2 top-1/2 h-[44%] w-[44%] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle at 30% 28%, rgba(255,237,180,0.95) 0%, rgba(245,185,69,0.55) 30%, rgba(167,139,250,0.42) 60%, rgba(34,211,238,0.18) 88%, transparent 100%)",
              boxShadow:
                "0 0 120px 40px rgba(245,185,69,0.30), 0 0 220px 80px rgba(167,139,250,0.22), inset 0 0 60px rgba(255,255,255,0.4)",
              filter: "blur(0.5px)",
              transform: "translateZ(80px)",
            }}
          />
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

      {/* ── HEADLINE — pointer-events scoped so the canvas stays
            interactive under the text. ──────────────────────────── */}
      <motion.div
        style={{ y: titleY, opacity: titleOp }}
        className="pointer-events-none container-wide relative z-10 flex min-h-[100svh] flex-col justify-center"
      >
        <motion.div style={{ y: cardY, opacity: cardOpac }} className="mx-auto w-full text-center">
          <div
            className="mx-auto inline-block rounded-[2.5rem] px-6 py-8 sm:px-10 sm:py-10"
            style={{
              background:
                "linear-gradient(180deg, rgba(10,12,20,0.18), rgba(10,12,20,0.06) 35%, rgba(10,12,20,0.18))",
              backdropFilter: "blur(3px)",
              WebkitBackdropFilter: "blur(3px)",
            }}
          >
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
              className="editorial-display mx-auto mt-6 max-w-[1400px] text-balance bg-gradient-to-b from-white via-white to-amber-200 bg-clip-text text-transparent text-[clamp(2.5rem,11vw,11rem)] uppercase drop-shadow-[0_8px_60px_rgba(0,0,0,0.85)]"
              stagger={0.08}
              delay={0.15}
            />
          </div>
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 1.4 }}
            className="mt-12 flex flex-col items-center gap-2 text-white/65"
          >
            <span className="text-[10px] font-semibold uppercase tracking-[0.4em]">scroll</span>
            <span className="block h-12 w-px animate-pulseGlow bg-gradient-to-b from-white/70 to-transparent" />
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
