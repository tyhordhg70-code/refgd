"use client";
import { useEffect, useState } from "react";
import { useCosmicScene } from "@/lib/cosmic-scene";
import InteractiveParticles from "@/components/InteractiveParticles";

/**
 * Page-wide cosmic backdrop overlay for the home page.
 *
 * Two layers of richness now:
 *   1. The shared Web-Worker WebGL canvas (planet, halo, nebulas,
 *      warp streaks) — activated via useCosmicScene("home").
 *   2. DOM cinematic layer — large drifting gradient orbs, dense
 *      twinkling starfield, an aurora streamer, and cursor-reactive
 *      particles.
 *
 * The DOM layer is intentionally compositor-only (transform/opacity
 * keyframes, GPU-promoted via will-change). It sits ABOVE the worker
 * canvas so its colour pops, and the worker continues to render the
 * planet/nebula behind it.
 *
 * User feedback (May '26): "home page illustrations and background
 * effects and stars and abstract particles are all gone" — the
 * earlier rewrite that moved everything into the worker left the page
 * feeling empty because the worker scene alone was too subtle. This
 * version restores DOM richness on top of the worker without bringing
 * back the heavy backdrop-blur stacks that made mobile feel laggy.
 */
export default function HomeBackground() {
  useCosmicScene("home");

  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  if (!mounted) return null;

  const STAR_COUNT = isMobile ? 36 : 90;
  const stars = Array.from({ length: STAR_COUNT }).map((_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    const r1 = (seed / 233280);
    const r2 = ((seed * 7) % 233280) / 233280;
    const r3 = ((seed * 13) % 233280) / 233280;
    const r4 = ((seed * 19) % 233280) / 233280;
    const left = (r1 * 100).toFixed(2);
    const top = (r2 * 100).toFixed(2);
    const size = (1 + r3 * 2.4).toFixed(2);
    const dur = (2.4 + r4 * 4.5).toFixed(2);
    const delay = (r3 * 5).toFixed(2);
    const tint =
      r4 < 0.55 ? "rgba(255,255,255,0.95)" :
      r4 < 0.8  ? "rgba(255,225,140,0.95)" :
      r4 < 0.92 ? "rgba(167,139,250,0.95)" :
                  "rgba(103,232,249,0.95)";
    return { left, top, size, dur, delay, tint };
  });

  return (
    <div
      aria-hidden="true"
      data-testid="home-background"
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
    >
      {/* Soft vignette that keeps the centre of the page legible. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 35%, rgba(4,3,12,0.55) 100%)",
        }}
      />

      {/* DRIFTING GRADIENT ORBS — 4 large softly-coloured radial
          gradients that slowly drift and pulse. Pure transform/opacity
          animation = compositor-only, no per-frame paint. */}
      {[
        { c: "rgba(245,185,69,0.28)",  size: "60vmin", l: "8%",  t: "12%", d: "0s",   dur: "32s" },
        { c: "rgba(167,139,250,0.30)", size: "70vmin", l: "62%", t: "8%",  d: "-8s",  dur: "38s" },
        { c: "rgba(103,232,249,0.22)", size: "55vmin", l: "78%", t: "60%", d: "-16s", dur: "30s" },
        { c: "rgba(244,114,182,0.20)", size: "65vmin", l: "12%", t: "65%", d: "-22s", dur: "36s" },
      ].map((o, i) => (
        <div
          key={i}
          className="hb-orb"
          style={{
            left: o.l,
            top: o.t,
            width: o.size,
            height: o.size,
            background: `radial-gradient(circle at 50% 50%, ${o.c}, transparent 65%)`,
            animationDelay: o.d,
            animationDuration: o.dur,
          }}
        />
      ))}

      {/* AURORA STREAMER — a single softly-curving SVG path that fades
          in/out and drifts horizontally. Adds organic movement above
          the orbs. */}
      <svg
        className="hb-aurora"
        viewBox="0 0 1200 800"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id="hb-aurora-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%"   stopColor="rgba(167,139,250,0)" />
            <stop offset="35%"  stopColor="rgba(167,139,250,0.45)" />
            <stop offset="55%"  stopColor="rgba(245,185,69,0.55)" />
            <stop offset="75%"  stopColor="rgba(103,232,249,0.40)" />
            <stop offset="100%" stopColor="rgba(103,232,249,0)" />
          </linearGradient>
          <filter id="hb-aurora-blur" x="-20%" y="-50%" width="140%" height="200%">
            <feGaussianBlur stdDeviation="36" />
          </filter>
        </defs>
        <path
          d="M -200 420 C 200 280, 500 540, 800 360 S 1200 480, 1500 320"
          stroke="url(#hb-aurora-grad)"
          strokeWidth="120"
          fill="none"
          filter="url(#hb-aurora-blur)"
          opacity="0.85"
        />
      </svg>

      {/* TWINKLING STARFIELD — DOM stars sit ABOVE the worker canvas
          and the orbs so they pop visibly. Each star is a 1-3px white/
          amber/violet/cyan dot with its own slow opacity+scale loop. */}
      {stars.map((s, i) => (
        <span
          key={i}
          className="hb-star"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: `${s.size}px`,
            height: `${s.size}px`,
            background: s.tint,
            boxShadow: `0 0 ${(parseFloat(s.size) * 4).toFixed(1)}px ${s.tint}`,
            animationDuration: `${s.dur}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}

      {/* CURSOR-REACTIVE ABSTRACT PARTICLES — desktop only (mobile has
          no cursor and the orbs already provide enough depth). */}
      {!isMobile && (
        <div className="absolute inset-0">
          <InteractiveParticles count={70} influence={180} />
        </div>
      )}
    </div>
  );
}
