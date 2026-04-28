"use client";
import {
  animate,
  motion,
  useMotionValue,
  useReducedMotion,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * MentorshipHero — bespoke parallax illustration scene for the
 * mentorship page. Replaces a generic chess-board fallback.
 *
 * Was previously a 170vh sticky scroll-driven scene (useScroll +
 * useTransform on multiple layers). The user wanted every page to
 * play through animations in ONE motion (stop-motion feel) instead
 * of requiring constant scroll. So this is now a single viewport
 * (100svh) hero with a time-driven master timeline that runs once
 * on mount over ~4s. Mouse parallax remains for desktop polish.
 */
export default function MentorshipHero({
  caption,
  subCaption,
  accent = "#a78bfa",
}: {
  caption: string;
  subCaption?: string;
  accent?: string;
}) {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  const stable = reduce || isMobile;

  // Mouse parallax
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useSpring(mx, { stiffness: 80, damping: 18 });
  const py = useSpring(my, { stiffness: 80, damping: 18 });

  useEffect(() => {
    if (stable) return;
    const handler = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      mx.set((e.clientX / w - 0.5) * 2);
      my.set((e.clientY / h - 0.5) * 2);
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [stable, mx, my]);

  // Master one-shot timeline (replaces useScroll). Plays once on mount.
  const progress = useMotionValue(0);
  useEffect(() => {
    if (!mounted) return;
    const c = animate(progress, 1, {
      duration: reduce ? 0 : 3.8,
      delay: 0.2,
      ease: [0.22, 1, 0.36, 1],
    });
    return c.stop;
  }, [mounted, progress, reduce]);

  // Layer rises (analogous to the old scroll-driven Y)
  const farY = useTransform(progress, [0, 1], stable ? ["0%", "0%"] : ["12%", "0%"]);
  const midY = useTransform(progress, [0, 1], stable ? ["0%", "0%"] : ["24%", "0%"]);
  const nearY = useTransform(progress, [0, 1], stable ? ["0%", "0%"] : ["38%", "0%"]);
  const ringRot = useTransform(progress, [0, 1], stable ? [0, 0] : [-30, 0]);
  const masterOp = useTransform(progress, [0, 0.25, 1], [0, 0.85, 1]);
  const captionOp = useTransform(progress, [0, 0.4, 1], [0, 0.85, 1]);
  const captionY = useTransform(progress, [0, 1], stable ? ["0%", "0%"] : ["18%", "0%"]);

  const px1 = useTransform(px, (v) => v * -8);
  const px2 = useTransform(px, (v) => v * -22);
  const py2 = useTransform(py, (v) => v * -22);
  const px3 = useTransform(px, (v) => v * -42);
  const py3 = useTransform(py, (v) => v * -42);

  return (
    <section
      ref={wrap}
      className="relative h-[100svh] overflow-clip"
      data-testid="mentorship-hero"
    >
      <motion.div
        className="absolute inset-0 grid h-full w-full place-items-center overflow-hidden"
        style={mounted ? { opacity: masterOp } : { opacity: 0 }}
        suppressHydrationWarning
      >
        {/* Layer 1 — far stars / aurora wash */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ y: farY }}
          suppressHydrationWarning
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 35%, rgba(124,58,237,0.35), transparent 65%), radial-gradient(ellipse 70% 50% at 50% 70%, rgba(34,211,238,0.18), transparent 70%)",
            }}
          />
          {/* Star field via repeating radial gradients */}
          <div
            className="absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(1.5px 1.5px at 18% 22%, white, transparent 60%), radial-gradient(1px 1px at 78% 14%, white, transparent 60%), radial-gradient(1.2px 1.2px at 32% 58%, white, transparent 60%), radial-gradient(1px 1px at 64% 76%, white, transparent 60%), radial-gradient(1.5px 1.5px at 88% 88%, white, transparent 60%), radial-gradient(1px 1px at 12% 80%, white, transparent 60%)",
            }}
          />
        </motion.div>

        {/* Layer 2 — orbital rings */}
        <motion.svg
          viewBox="0 0 800 800"
          className="absolute h-[120vmin] w-[120vmin]"
          style={{ y: midY, x: px1, rotate: ringRot }}
          aria-hidden="true"
          suppressHydrationWarning
        >
          <defs>
            <linearGradient id="mh-ring" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={accent} stopOpacity="0.0" />
              <stop offset="50%" stopColor={accent} stopOpacity="0.85" />
              <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          <ellipse cx="400" cy="400" rx="340" ry="120" fill="none" stroke="url(#mh-ring)" strokeWidth="2" />
          <ellipse cx="400" cy="400" rx="280" ry="280" fill="none" stroke={accent} strokeOpacity="0.3" strokeWidth="1.5" />
          <ellipse cx="400" cy="400" rx="220" ry="320" fill="none" stroke="url(#mh-ring)" strokeWidth="1.5" />
        </motion.svg>

        {/* Layer 3 — crown / sigil */}
        <motion.div
          className="absolute"
          style={{ y: midY }}
          suppressHydrationWarning
        >
          <motion.div style={{ x: px2, y: py2 }} suppressHydrationWarning>
            <svg width="220" height="220" viewBox="0 0 200 200" aria-hidden>
              <defs>
                <radialGradient id="mh-crown" cx="50%" cy="40%" r="60%">
                  <stop offset="0%" stopColor="#fef3c7" />
                  <stop offset="60%" stopColor={accent} />
                  <stop offset="100%" stopColor="#1e1b4b" />
                </radialGradient>
              </defs>
              {/* halo */}
              <circle cx="100" cy="100" r="92" fill={accent} opacity="0.18" />
              <circle cx="100" cy="100" r="60" fill="url(#mh-crown)" />
              {/* crown */}
              <path
                d="M40 130 L60 70 L80 110 L100 60 L120 110 L140 70 L160 130 Z"
                fill={accent}
                stroke="#fff"
                strokeOpacity="0.3"
                strokeWidth="1.5"
              />
              <rect x="40" y="130" width="120" height="14" rx="3" fill="#0d0f1c" stroke={accent} strokeWidth="1.5" />
              {/* gems */}
              <circle cx="60" cy="70" r="4" fill="#fef3c7" />
              <circle cx="100" cy="60" r="5" fill="#67e8f9" />
              <circle cx="140" cy="70" r="4" fill="#f472b6" />
            </svg>
          </motion.div>
        </motion.div>

        {/* Layer 4 — floating slates / knowledge cards */}
        <motion.div
          className="pointer-events-none absolute inset-0"
          style={{ y: nearY }}
          suppressHydrationWarning
        >
          {[
            { x: "12%", y: "20%", w: 110, h: 70, r: -8, label: "REFUND" },
            { x: "78%", y: "26%", w: 130, h: 80, r: 10, label: "STEALTH" },
            { x: "20%", y: "70%", w: 140, h: 80, r: 6, label: "INSIDER" },
            { x: "76%", y: "72%", w: 120, h: 70, r: -10, label: "SE" },
          ].map((s, i) => (
            <motion.div
              key={i}
              className="absolute rounded-xl border border-white/15 bg-white/[0.05] backdrop-blur-md"
              style={{
                left: s.x,
                top: s.y,
                width: s.w,
                height: s.h,
                rotate: s.r,
                x: i % 2 === 0 ? px3 : px2,
                y: i < 2 ? py3 : py2,
                boxShadow: `0 30px 80px -30px ${accent}, inset 0 1px 0 rgba(255,255,255,0.08)`,
              }}
              suppressHydrationWarning
            >
              <div className="grid h-full place-items-center text-[10px] font-bold uppercase tracking-[0.4em] text-white/85">
                {s.label}
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Caption */}
        <motion.div
          className="relative z-10 max-w-3xl px-6 text-center"
          style={{ opacity: captionOp, y: captionY }}
          suppressHydrationWarning
        >
          <p className="heading-display mb-4 text-[10px] font-semibold uppercase tracking-[0.4em] text-violet-200/90 sm:text-xs">
            — chapter 02 / mastery awaits
          </p>
          <h1
            className="editorial-display text-balance text-white text-[clamp(2.4rem,8vw,7rem)] uppercase"
            style={{ textShadow: "0 6px 40px rgba(0,0,0,0.95), 0 0 30px rgba(167,139,250,0.4)" }}
          >
            {caption}
          </h1>
          {subCaption ? (
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/85 sm:text-lg">
              {subCaption}
            </p>
          ) : null}
        </motion.div>
      </motion.div>
    </section>
  );
}
