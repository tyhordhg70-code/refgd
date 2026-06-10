"use client";

/**
 * EvadeHeroPortal — bespoke parallax hero for the Evade-Cancelations page.
 *
 * Replaces the ChipScroll "shield" canvas fallback (the old checkmark-in-
 * hexagon scene). Renders a custom animated "vault core" cyber emblem built
 * entirely from layered SVG + CSS transforms (rotate / scale / opacity /
 * stroke-dashoffset ONLY — never filter / backdrop-filter) so it stays crisp
 * and lag-free. The caption + subCaption strings are passed through verbatim.
 *
 * CRITICAL coupling: this route is registered as "scene-bearing" in
 * lib/asset-preloader.ts (pathHasScene) + components/LoadingScreen.tsx, so the
 * loading splash WAITS for a `refgd:scene-ready` window event before lifting.
 * ChipScroll used to dispatch it; this component MUST too, or the splash hangs
 * to its 60s ceiling.
 *
 * Perf: heavy decorative layers (radar sweep, orbiting nodes, scan beam) are
 * desktop-only and dropped on touch ≤1366px / ≤860px; all CSS animations stop
 * under prefers-reduced-motion and pause when the hero scrolls out of view.
 */

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export default function EvadeHeroPortal({
  caption,
  subCaption,
}: {
  caption?: string;
  subCaption?: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [paused, setPaused] = useState(false);

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });

  // Parallax: the emblem recedes (rises, shrinks, fades) as the user scrolls
  // through the runway; the caption fades out near the end.
  const emblemY = useTransform(scrollYProgress, [0, 1], [0, -140]);
  const emblemScale = useTransform(scrollYProgress, [0, 1], [1, 0.8]);
  const emblemOpacity = useTransform(scrollYProgress, [0, 0.72, 1], [1, 1, 0]);
  const backdropY = useTransform(scrollYProgress, [0, 1], [0, -70]);
  const captionOpacity = useTransform(scrollYProgress, [0, 0.86, 1], [1, 1, 0]);
  const captionY = useTransform(scrollYProgress, [0, 1], [0, -28]);
  const scrollPromptOpacity = useTransform(
    scrollYProgress,
    [0, 0.08, 0.18],
    [1, 1, 0],
  );

  // Tell LoadingScreen the hero scene is ready (this route waits for it).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fire = () =>
      window.dispatchEvent(new CustomEvent("refgd:scene-ready"));
    let r1 = 0;
    let r2 = 0;
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(fire);
    });
    const t = window.setTimeout(fire, 700);
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      window.clearTimeout(t);
    };
  }, []);

  // Pause all emblem CSS animations once the hero leaves the viewport.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof window === "undefined") return;
    const io = new IntersectionObserver((entries) => setPaused(!entries[entries.length - 1].isIntersecting), {
      threshold: 0,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const words = caption ? caption.split(" ") : [];

  return (
    <section ref={wrapRef} className="ev-hero relative" style={{ height: "180svh" }}>
      <div
        className={`ev-hero-stage sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden ${
          paused ? "ev-hero-paused" : ""
        }`}
      >
        {/* Seat the emblem over the site-wide ambient cube */}
        <motion.div
          aria-hidden="true"
          className="ev-hero-backdrop"
          style={{ y: backdropY }}
          suppressHydrationWarning
        />

        {/* ───────── EMBLEM ───────── */}
        <motion.div
          aria-hidden="true"
          className="ev-hero-emblem"
          style={{ y: emblemY, scale: emblemScale, opacity: emblemOpacity }}
          suppressHydrationWarning
        >
          {/* breathing halo */}
          <span className="ev-hero-halo" />

          {/* radar sweep (desktop) */}
          <span className="ev-hero-radar ev-hero-desk" />

          {/* outer reticle ring */}
          <div className="ev-hero-layer ev-hero-outer">
            <svg viewBox="0 0 400 400" className="ev-hero-svg">
              <circle cx="200" cy="200" r="194" className="ev-hero-ticks" />
              <circle cx="200" cy="200" r="176" className="ev-hero-ring-faint" />
              <path
                className="ev-hero-bracket"
                d="M200 12 v18 M200 388 v-18 M12 200 h18 M388 200 h-18"
              />
            </svg>
          </div>

          {/* mid hex frame + circuit (counter-rotating) */}
          <div className="ev-hero-layer ev-hero-mid">
            <svg viewBox="0 0 400 400" className="ev-hero-svg">
              <polygon
                className="ev-hero-hex"
                points="200,58 323,129 323,271 200,342 77,271 77,129"
              />
              <polygon
                className="ev-hero-hex-inner"
                points="200,96 290,148 290,252 200,304 110,252 110,148"
              />
              <path
                className="ev-hero-trace"
                d="M200 58 V20 M323 129 l34 -20 M323 271 l34 20 M200 342 V380 M77 271 l-34 20 M77 129 l-34 -20"
              />
              <circle className="ev-hero-vtx" cx="200" cy="58" r="4" />
              <circle className="ev-hero-vtx" cx="323" cy="129" r="4" />
              <circle className="ev-hero-vtx" cx="323" cy="271" r="4" />
              <circle className="ev-hero-vtx" cx="200" cy="342" r="4" />
              <circle className="ev-hero-vtx" cx="77" cy="271" r="4" />
              <circle className="ev-hero-vtx" cx="77" cy="129" r="4" />
            </svg>
          </div>

          {/* combination dial (rotating) */}
          <div className="ev-hero-layer ev-hero-dial">
            <svg viewBox="0 0 400 400" className="ev-hero-svg">
              <circle cx="200" cy="200" r="118" className="ev-hero-dial-ring" />
              <circle cx="200" cy="200" r="118" className="ev-hero-dial-ticks" />
              <path
                className="ev-hero-dial-arc"
                d="M200 82 A118 118 0 0 1 318 200"
              />
            </svg>
          </div>

          {/* orbiting data nodes (desktop) */}
          <div className="ev-hero-layer ev-hero-orbit ev-hero-desk">
            <span className="ev-hero-node" style={{ ["--a" as any]: "0deg" }} />
            <span className="ev-hero-node" style={{ ["--a" as any]: "120deg" }} />
            <span className="ev-hero-node" style={{ ["--a" as any]: "240deg" }} />
          </div>
          <div className="ev-hero-layer ev-hero-orbit ev-hero-orbit-2 ev-hero-desk">
            <span
              className="ev-hero-node ev-hero-node-sm"
              style={{ ["--a" as any]: "60deg" }}
            />
            <span
              className="ev-hero-node ev-hero-node-sm"
              style={{ ["--a" as any]: "200deg" }}
            />
          </div>

          {/* scan beam (desktop) */}
          <span className="ev-hero-scan ev-hero-desk" />

          {/* core shield-lock glyph */}
          <div className="ev-hero-layer ev-hero-core">
            <svg viewBox="0 0 400 400" className="ev-hero-svg">
              <defs>
                <radialGradient id="evhCore" cx="50%" cy="42%" r="62%">
                  <stop offset="0%" stopColor="#eafeff" stopOpacity="0.95" />
                  <stop offset="42%" stopColor="#22d3ee" stopOpacity="0.55" />
                  <stop offset="100%" stopColor="#0b1220" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="evhShield" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#7be7ff" />
                  <stop offset="55%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#7c5cff" />
                </linearGradient>
              </defs>
              <circle
                cx="200"
                cy="196"
                r="96"
                fill="url(#evhCore)"
                className="ev-hero-coreglow"
              />
              <path
                className="ev-hero-shield"
                d="M200 130 L256 152 L256 206 C256 246 230 268 200 282 C170 268 144 246 144 206 L144 152 Z"
              />
              <circle className="ev-hero-key" cx="200" cy="198" r="13" />
              <path
                className="ev-hero-key"
                d="M193 206 L207 206 L203 232 L197 232 Z"
              />
            </svg>
          </div>
        </motion.div>

        {/* ───────── CAPTION ───────── */}
        {caption && (
          <motion.div
            style={{ opacity: captionOpacity, y: captionY }}
            suppressHydrationWarning
            className="container-wide pointer-events-none absolute inset-x-0 bottom-[11%] z-10 text-center"
          >
            <h3
              className="editorial-display mx-auto max-w-5xl text-balance uppercase text-white"
              style={{
                textShadow:
                  "0 4px 40px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.85)",
                lineHeight: 1.05,
                letterSpacing: "0.07em",
                fontSize: "clamp(2.2rem, 7vw, 6rem)",
              }}
            >
              {words.map((word, wi) => {
                let charIndex = 0;
                for (let k = 0; k < wi; k++) charIndex += words[k].length;
                return (
                  <span
                    key={wi}
                    className="inline-block"
                    style={{
                      whiteSpace: "pre",
                      perspective: 800,
                      marginRight: wi < words.length - 1 ? "0.35em" : 0,
                    }}
                    aria-label={word}
                  >
                    {[...word].map((ch, ci) => {
                      const idx = charIndex + ci;
                      return (
                        <motion.span
                          key={ci}
                          aria-hidden
                          className="inline-block"
                          initial={{ opacity: 0, y: "110%", rotateX: -85 }}
                          animate={{ opacity: 1, y: "0%", rotateX: 0 }}
                          transition={{
                            duration: 0.85,
                            delay: 0.15 + idx * 0.028,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          style={{ transformOrigin: "50% 100%" }}
                        >
                          {ch}
                        </motion.span>
                      );
                    })}
                  </span>
                );
              })}
            </h3>
            {subCaption && (
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: 0.15 + words.length * 0.12 + 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-white/95 sm:mt-10 sm:text-lg"
                style={{
                  textShadow:
                    "0 0 24px rgba(255,255,255,0.55), 0 0 48px rgba(34,211,238,0.35), 0 2px 8px rgba(0,0,0,0.7)",
                }}
              >
                {subCaption}
              </motion.p>
            )}
          </motion.div>
        )}

        {/* ───────── SCROLL PROMPT ───────── */}
        <motion.div
          aria-hidden="true"
          style={{ opacity: scrollPromptOpacity }}
          suppressHydrationWarning
          className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-2 text-white/85"
        >
          <span className="heading-display text-[10px] font-semibold uppercase tracking-[0.45em]">
            scroll
          </span>
          <span className="block h-10 w-px animate-pulseGlow bg-gradient-to-b from-white/85 to-transparent" />
        </motion.div>
      </div>

      <style>{`
        .ev-hero-stage { perspective: 1200px; }
        .ev-hero-backdrop {
          position: absolute; left: 50%; top: 44%;
          width: min(86vw, 760px); height: min(86vw, 760px);
          transform: translate(-50%, -50%);
          background: radial-gradient(circle at 50% 50%, rgba(11,18,32,0.85) 0%, rgba(8,11,20,0.5) 42%, transparent 70%);
          pointer-events: none;
        }
        .ev-hero-emblem {
          position: relative;
          width: clamp(280px, 42vw, 560px);
          height: clamp(280px, 42vw, 560px);
          margin-top: -6vh;
          display: grid;
          place-items: center;
          will-change: transform, opacity;
        }
        .ev-hero-layer { position: absolute; inset: 0; }
        .ev-hero-svg { width: 100%; height: 100%; overflow: visible; display: block; }

        .ev-hero-halo {
          position: absolute; inset: 14%;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(34,211,238,0.30), rgba(124,92,255,0.12) 45%, transparent 70%);
          animation: evhBreathe 6s ease-in-out infinite;
          will-change: transform, opacity;
        }
        @keyframes evhBreathe {
          0%,100% { transform: scale(0.94); opacity: 0.65; }
          50%     { transform: scale(1.06); opacity: 1; }
        }

        .ev-hero-radar {
          position: absolute; inset: 4%;
          border-radius: 50%;
          background: conic-gradient(from 0deg, rgba(34,211,238,0) 0deg, rgba(34,211,238,0) 290deg, rgba(34,211,238,0.22) 340deg, rgba(125,231,255,0.55) 360deg);
          -webkit-mask-image: radial-gradient(circle, black 0 60%, transparent 61%);
                  mask-image: radial-gradient(circle, black 0 60%, transparent 61%);
          animation: evhSpin 7s linear infinite;
          will-change: transform;
        }

        .ev-hero-outer { animation: evhSpin 80s linear infinite; will-change: transform; }
        .ev-hero-mid   { animation: evhSpinRev 110s linear infinite; will-change: transform; }
        .ev-hero-dial  { animation: evhSpin 46s linear infinite; will-change: transform; }

        .ev-hero-ticks { fill: none; stroke: rgba(125,231,255,0.45); stroke-width: 2; stroke-dasharray: 2 12; }
        .ev-hero-ring-faint { fill: none; stroke: rgba(125,231,255,0.16); stroke-width: 1; }
        .ev-hero-bracket { fill: none; stroke: rgba(125,231,255,0.7); stroke-width: 2.5; stroke-linecap: round; }

        .ev-hero-hex { fill: none; stroke: rgba(34,211,238,0.55); stroke-width: 1.6; stroke-linejoin: round; }
        .ev-hero-hex-inner { fill: rgba(34,211,238,0.03); stroke: rgba(124,92,255,0.35); stroke-width: 1; stroke-linejoin: round; }
        .ev-hero-trace {
          fill: none; stroke: rgba(125,231,255,0.7); stroke-width: 1.6;
          stroke-dasharray: 6 10; animation: evhFlow 5s linear infinite;
          will-change: stroke-dashoffset;
        }
        .ev-hero-vtx { fill: #7be7ff; }

        .ev-hero-dial-ring { fill: none; stroke: rgba(125,231,255,0.25); stroke-width: 1; }
        .ev-hero-dial-ticks { fill: none; stroke: rgba(125,231,255,0.5); stroke-width: 7; stroke-dasharray: 2 18.6; }
        .ev-hero-dial-arc { fill: none; stroke: rgba(34,211,238,0.85); stroke-width: 2.5; stroke-linecap: round; }

        .ev-hero-orbit   { animation: evhSpin 18s linear infinite; will-change: transform; }
        .ev-hero-orbit-2 { animation: evhSpinRev 26s linear infinite; }
        .ev-hero-node {
          position: absolute; left: 50%; top: 50%; width: 12px; height: 12px;
          margin: -6px 0 0 -6px; border-radius: 50%;
          background: radial-gradient(circle, #ffffff 0%, #7be7ff 45%, rgba(34,211,238,0) 72%);
          transform: rotate(var(--a)) translateY(calc(-1 * clamp(140px, 21vw, 280px)));
          will-change: transform;
        }
        .ev-hero-node-sm {
          width: 8px; height: 8px; margin: -4px 0 0 -4px;
          background: radial-gradient(circle, #ffffff 0%, #c4b5fd 45%, rgba(124,92,255,0) 72%);
          transform: rotate(var(--a)) translateY(calc(-1 * clamp(112px, 17vw, 228px)));
        }

        .ev-hero-scan {
          position: absolute; left: 14%; right: 14%; top: 50%; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(125,231,255,0.8), transparent);
          animation: evhScan 5s ease-in-out infinite;
          will-change: transform; opacity: 0;
        }

        .ev-hero-core { display: grid; place-items: center; animation: evhPulse 4.5s ease-in-out infinite; will-change: transform; }
        .ev-hero-coreglow { opacity: 0.9; }
        .ev-hero-shield { fill: rgba(8,16,28,0.55); stroke: url(#evhShield); stroke-width: 2.6; stroke-linejoin: round; }
        .ev-hero-key { fill: #eafeff; }

        @keyframes evhSpin    { to { transform: rotate(360deg); } }
        @keyframes evhSpinRev { to { transform: rotate(-360deg); } }
        @keyframes evhFlow    { to { stroke-dashoffset: -240; } }
        @keyframes evhPulse   { 0%,100% { transform: scale(0.98); } 50% { transform: scale(1.03); } }
        @keyframes evhScan {
          0%,100% { transform: translateY(-120px); opacity: 0; }
          12%,88% { opacity: 0.85; }
          50%     { transform: translateY(120px); }
        }

        .ev-hero-paused .ev-hero-halo,
        .ev-hero-paused .ev-hero-radar,
        .ev-hero-paused .ev-hero-outer,
        .ev-hero-paused .ev-hero-mid,
        .ev-hero-paused .ev-hero-dial,
        .ev-hero-paused .ev-hero-trace,
        .ev-hero-paused .ev-hero-orbit,
        .ev-hero-paused .ev-hero-orbit-2,
        .ev-hero-paused .ev-hero-scan,
        .ev-hero-paused .ev-hero-core { animation-play-state: paused !important; }

        @media (hover: none) and (max-width: 1366px) {
          .ev-hero-radar, .ev-hero-scan { display: none !important; }
        }
        @media (max-width: 860px) {
          .ev-hero-desk { display: none !important; }
          .ev-hero-mid  { animation-duration: 150s; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ev-hero-halo, .ev-hero-radar, .ev-hero-outer, .ev-hero-mid,
          .ev-hero-dial, .ev-hero-trace, .ev-hero-orbit, .ev-hero-orbit-2,
          .ev-hero-scan, .ev-hero-core { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
