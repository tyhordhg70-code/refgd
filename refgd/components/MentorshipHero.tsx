"use client";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * MentorshipHero — bespoke parallax illustration scene for the
 * mentorship page.
 *
 * Scroll-driven: the section is a 200svh runway whose inner sticky
 * canvas pins the hero to the viewport while the user scrolls. Layers
 * (aurora wash, orbital rings, crown sigil, floating slates, caption)
 * each have their own parallax depth wired to scrollYProgress so the
 * scene assembles itself as you scroll, then disassembles smoothly
 * when you scroll back up.
 *
 * Crown: a much larger, continuously-animated sigil with breathing
 * pulse + slow rotation + sparkles around the gems.
 *
 * Mouse parallax remains for desktop polish.
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
  const stable = !!reduce;

  // Mouse parallax (desktop only, never on mobile or reduced-motion)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const px = useSpring(mx, { stiffness: 80, damping: 18 });
  const py = useSpring(my, { stiffness: 80, damping: 18 });

  useEffect(() => {
    if (stable || isMobile) return;
    const handler = (e: MouseEvent) => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      mx.set((e.clientX / w - 0.5) * 2);
      my.set((e.clientY / h - 0.5) * 2);
    };
    window.addEventListener("mousemove", handler);
    return () => window.removeEventListener("mousemove", handler);
  }, [stable, isMobile, mx, my]);

  // Scroll-driven progress over the 200svh outer runway. As the user
  // scrolls into the section, scrollYProgress goes 0 → 1.
  const { scrollYProgress } = useScroll({
    target: wrap,
    offset: ["start start", "end end"],
  });

  // Smooth the progress so layers don't jitter on small wheel deltas.
  const sp = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 28,
    mass: 0.4,
  });

  // Layer rises — far layers move slowest, near layers move most.
  // All layers start slightly off-screen / faded and assemble at p=0.5,
  // then drift past at p=1 so scrolling back up plays in reverse.
  const farY = useTransform(sp, [0, 0.5, 1], stable ? ["0%", "0%", "0%"] : ["14%", "0%", "-6%"]);
  const midY = useTransform(sp, [0, 0.5, 1], stable ? ["0%", "0%", "0%"] : ["28%", "0%", "-12%"]);
  const nearY = useTransform(sp, [0, 0.5, 1], stable ? ["0%", "0%", "0%"] : ["44%", "0%", "-18%"]);
  const ringRot = useTransform(sp, [0, 1], stable ? [0, 0] : [-40, 40]);
  const ringScale = useTransform(sp, [0, 0.5, 1], stable ? [1, 1, 1] : [0.85, 1.02, 1.18]);
  const crownScale = useTransform(sp, [0, 0.5, 1], stable ? [1, 1, 1] : [0.5, 1, 1.08]);
  const crownTilt = useTransform(sp, [0, 1], stable ? [0, 0] : [-18, 18]);
  const masterOp = useTransform(sp, [0, 0.18, 0.85, 1], [0, 1, 1, 0.85]);
  const captionOp = useTransform(sp, [0, 0.25, 0.85, 1], [0, 1, 1, 0.6]);
  const captionY = useTransform(sp, [0, 0.5, 1], stable ? ["0%", "0%", "0%"] : ["32%", "0%", "-10%"]);

  // Mouse-parallax derivatives (small drift on top of scroll position).
  const mxA = useTransform(px, (v) => v * -8);
  const mxB = useTransform(px, (v) => v * -22);
  const myB = useTransform(py, (v) => v * -22);
  const mxC = useTransform(px, (v) => v * -42);
  const myC = useTransform(py, (v) => v * -42);

  return (
    <section
      ref={wrap}
      className="relative h-[200svh] overflow-clip"
      data-testid="mentorship-hero"
    >
      {/* Inner sticky canvas — pins to viewport while the outer 200svh
          runway scrolls past. */}
      <div className="sticky top-0 h-screen w-full overflow-hidden">
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
                  "radial-gradient(ellipse 60% 50% at 50% 35%, rgba(124,58,237,0.45), transparent 65%), radial-gradient(ellipse 70% 50% at 50% 70%, rgba(34,211,238,0.22), transparent 70%)",
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

          {/* Layer 2 — orbital rings (now scroll-rotated and scaled) */}
          <motion.svg
            viewBox="0 0 800 800"
            className="absolute h-[140vmin] w-[140vmin]"
            style={{ y: midY, x: mxA, rotate: ringRot, scale: ringScale }}
            aria-hidden="true"
            suppressHydrationWarning
          >
            <defs>
              <linearGradient id="mh-ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity="0.0" />
                <stop offset="50%" stopColor={accent} stopOpacity="0.95" />
                <stop offset="100%" stopColor="#67e8f9" stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <ellipse cx="400" cy="400" rx="340" ry="120" fill="none" stroke="url(#mh-ring)" strokeWidth="2.4" />
            <ellipse cx="400" cy="400" rx="280" ry="280" fill="none" stroke={accent} strokeOpacity="0.4" strokeWidth="1.8" />
            <ellipse cx="400" cy="400" rx="220" ry="320" fill="none" stroke="url(#mh-ring)" strokeWidth="1.8" />
          </motion.svg>

          {/* Layer 3 — crown / sigil. Big, scroll-scaled + scroll-tilted,
              and continuously animated (breath + slow rotation) so it
              feels alive even when the user pauses scrolling. */}
          <motion.div
            className="absolute"
            style={{ y: midY, scale: crownScale }}
            suppressHydrationWarning
          >
            <motion.div
              style={{ x: mxB, y: myB, rotate: crownTilt }}
              suppressHydrationWarning
            >
              {/* Continuous breathing pulse + slow yaw — runs forever, not
                  scroll-driven, so the crown never sits totally still. */}
              <motion.div
                animate={
                  stable
                    ? {}
                    : {
                        scale: [1, 1.06, 1],
                        rotate: [0, 2.5, 0, -2.5, 0],
                      }
                }
                transition={{
                  duration: 8,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                style={{ transformOrigin: "50% 55%" }}
              >
                <svg
                  width={isMobile ? 320 : 460}
                  height={isMobile ? 320 : 460}
                  viewBox="0 0 200 200"
                  aria-hidden
                  style={{
                    filter: `drop-shadow(0 24px 60px ${accent}) drop-shadow(0 8px 20px rgba(0,0,0,0.85))`,
                  }}
                >
                  <defs>
                    <radialGradient id="mh-crown" cx="50%" cy="40%" r="60%">
                      <stop offset="0%" stopColor="#fef3c7" />
                      <stop offset="60%" stopColor={accent} />
                      <stop offset="100%" stopColor="#1e1b4b" />
                    </radialGradient>
                    <linearGradient id="mh-crown-band" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#1a1530" />
                      <stop offset="100%" stopColor="#0a0820" />
                    </linearGradient>
                    <radialGradient id="mh-crown-halo" cx="50%" cy="50%" r="55%">
                      <stop offset="0%" stopColor={accent} stopOpacity="0.55" />
                      <stop offset="60%" stopColor={accent} stopOpacity="0.18" />
                      <stop offset="100%" stopColor={accent} stopOpacity="0" />
                    </radialGradient>
                  </defs>
                  {/* outer halo */}
                  <circle cx="100" cy="100" r="98" fill="url(#mh-crown-halo)" />
                  {/* inner halo orb */}
                  <circle cx="100" cy="100" r="70" fill="url(#mh-crown)" />
                  {/* crown body */}
                  <path
                    d="M30 138 L55 60 L80 115 L100 50 L120 115 L145 60 L170 138 Z"
                    fill={accent}
                    stroke="#fff"
                    strokeOpacity="0.4"
                    strokeWidth="2"
                  />
                  {/* crown band */}
                  <rect
                    x="30"
                    y="138"
                    width="140"
                    height="18"
                    rx="4"
                    fill="url(#mh-crown-band)"
                    stroke={accent}
                    strokeWidth="2"
                  />
                  {/* base gems on the band */}
                  <circle cx="50" cy="147" r="3" fill="#fef3c7" />
                  <circle cx="100" cy="147" r="3.5" fill="#67e8f9" />
                  <circle cx="150" cy="147" r="3" fill="#f472b6" />
                  {/* spike tip gems with twinkling animation */}
                  <motion.circle
                    cx="55"
                    cy="60"
                    r="6"
                    fill="#fef3c7"
                    animate={
                      stable
                        ? {}
                        : { scale: [1, 1.5, 1], opacity: [0.85, 1, 0.85] }
                    }
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                    style={{ transformOrigin: "55px 60px" }}
                  />
                  <motion.circle
                    cx="100"
                    cy="50"
                    r="7"
                    fill="#67e8f9"
                    animate={
                      stable
                        ? {}
                        : { scale: [1, 1.6, 1], opacity: [0.85, 1, 0.85] }
                    }
                    transition={{
                      duration: 2.2,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.4,
                    }}
                    style={{ transformOrigin: "100px 50px" }}
                  />
                  <motion.circle
                    cx="145"
                    cy="60"
                    r="6"
                    fill="#f472b6"
                    animate={
                      stable
                        ? {}
                        : { scale: [1, 1.5, 1], opacity: [0.85, 1, 0.85] }
                    }
                    transition={{
                      duration: 1.9,
                      repeat: Infinity,
                      ease: "easeInOut",
                      delay: 0.8,
                    }}
                    style={{ transformOrigin: "145px 60px" }}
                  />
                </svg>
              </motion.div>
            </motion.div>
          </motion.div>

          {/* Layer 4 — floating slates / knowledge cards */}
          <motion.div
            className="pointer-events-none absolute inset-0"
            style={{ y: nearY }}
            suppressHydrationWarning
          >
            {[
              { x: "10%", y: "18%", w: 130, h: 80, r: -8, label: "REFUND" },
              { x: "78%", y: "22%", w: 150, h: 90, r: 10, label: "STEALTH" },
              { x: "16%", y: "70%", w: 160, h: 90, r: 6, label: "INSIDER" },
              { x: "76%", y: "72%", w: 140, h: 80, r: -10, label: "SE" },
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
                  x: i % 2 === 0 ? mxC : mxB,
                  y: i < 2 ? myC : myB,
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
      </div>
    </section>
  );
}
