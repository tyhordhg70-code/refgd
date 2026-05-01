"use client";
import { useEffect, useState } from "react";
import { useCosmicScene } from "@/lib/cosmic-scene";
import InteractiveParticles from "@/components/InteractiveParticles";

/**
 * Page-wide cosmic backdrop overlay for the home page.
 *
 * Goal: maximum visual richness on desktop, minimum main-thread work
 * on mobile (iPhone Safari). The Web-Worker WebGL canvas
 * (planet, halo, nebulas, twinkles, warp streaks) does the heavy
 * lifting on BOTH platforms — this DOM layer just adds taste on top.
 *
 * Mobile contract (post user feedback "still gone with the planet,
 * still laggy"):
 *   - DROP the big mix-blend-mode + blur orbs on mobile. They were
 *     covering the whole viewport with bright washed-out gradients,
 *     hiding the worker nebulas/twinkles behind them, AND they are
 *     the single most expensive thing for Safari's compositor to
 *     redraw every scroll tick.
 *   - DROP the SVG aurora streamer on mobile (gaussian blur filter
 *     also expensive).
 *   - DROP InteractiveParticles on mobile (no cursor anyway).
 *   - KEEP the dot-only twinkling starfield (pure transform/opacity,
 *     no blur, no blend mode — basically free for the compositor)
 *     and bump its count to 80 so the screen visibly fills.
 *
 * Desktop:
 *   - Keep all of it: orbs, aurora, dense star field, cursor particles.
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

  // Star count — generous on both platforms because dot-only stars
  // are essentially free (no blur, no blend mode, just opacity).
  const STAR_COUNT = isMobile ? 80 : 110;
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
      {/* Soft vignette that keeps the centre of the page legible.
          Lighter than before (0.55 → 0.35) so the worker nebulas
          and twinkles aren't crushed at the screen edges. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 40%, transparent 45%, rgba(4,3,12,0.35) 100%)",
        }}
      />

      {/* DESKTOP-ONLY drifting gradient orbs. These wash out the
          worker nebulas if rendered on a small mobile viewport, and
          the blur+blend mode is the #1 cause of iPhone Safari scroll
          lag, so they are gated to desktop only. */}
      {!isMobile && [
        { c: "rgba(245,185,69,0.22)",  size: "60vmin", l: "8%",  t: "12%", d: "0s",   dur: "32s" },
        { c: "rgba(167,139,250,0.24)", size: "70vmin", l: "62%", t: "8%",  d: "-8s",  dur: "38s" },
        { c: "rgba(103,232,249,0.18)", size: "55vmin", l: "78%", t: "60%", d: "-16s", dur: "30s" },
        { c: "rgba(244,114,182,0.16)", size: "65vmin", l: "12%", t: "65%", d: "-22s", dur: "36s" },
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

      {/* DESKTOP-ONLY aurora streamer. */}
      {!isMobile && (
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
      )}

      {/* TWINKLING STARFIELD — dot-only (no blur, no blend mode).
          Cheap enough to run on mobile at full count. Sits ABOVE the
          worker so the dots punch through the vignette. */}
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

      {/* DESKTOP-ONLY cursor-reactive abstract particles. */}
      {!isMobile && (
        <div className="absolute inset-0">
          <InteractiveParticles count={70} influence={180} />
        </div>
      )}
    </div>
  );
}
