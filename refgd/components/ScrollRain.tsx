"use client";

import { useEffect, useRef, useState } from "react";

/**
 * ScrollRain — page-wide cosmic streak shower for the home page.
 *
 * A grid of vertical "rain" streaks that always drift slowly down
 * the screen, then BURST forward when the user scrolls. The streaks
 * are pure CSS (no per-frame React render): we precompute the layout
 * once on mount, then read a single CSS custom property `--rain-v`
 * that's updated on scroll to multiply each streak's animation speed
 * and length. This keeps the layer cheap even on phones.
 *
 * Z-index is intentionally low (1) so the streaks sit BEHIND all
 * page content but in front of the static galaxy / home backdrop —
 * the streaks read like distant cosmic dust accelerating past the
 * camera as the user dives deeper into the page.
 */
type Streak = {
  /** Left position (%) */
  l: number;
  /** Vertical phase offset (s) */
  d: number;
  /** Cycle duration (s) — how fast it falls at rest */
  dur: number;
  /** Length (vh) */
  h: number;
  /** Horizontal drift (%) */
  drift: number;
  /** Color tint */
  c: string;
  /** Width (px) */
  w: number;
};

const COLORS = [
  "rgba(255,237,180,0.95)",   // amber
  "rgba(167,139,250,0.85)",   // violet
  "rgba(123,231,255,0.85)",   // cyan
  "rgba(244,114,182,0.75)",   // fuchsia
  "rgba(255,255,255,0.85)",   // white
];

function buildStreaks(count: number): Streak[] {
  const out: Streak[] = [];
  let seed = 2654435761;
  // Mulberry-ish deterministic RNG so SSR + client agree on layout.
  const rand = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = seed;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < count; i++) {
    out.push({
      l: rand() * 100,
      d: -rand() * 12,
      dur: 7 + rand() * 9,
      h: 12 + rand() * 22,
      drift: (rand() - 0.5) * 12,
      c: COLORS[Math.floor(rand() * COLORS.length)],
      w: rand() < 0.7 ? 1 : 2,
    });
  }
  return out;
}

export default function ScrollRain() {
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Drive a single CSS variable from scroll velocity. The streaks
  // multiply their `animation-duration` AND length by this so they
  // both elongate and accelerate while the user is actively scrolling.
  useEffect(() => {
    if (!mounted) return;
    const wrap = wrapRef.current;
    if (!wrap) return;

    let lastY = window.scrollY;
    let lastT = performance.now();
    let velocity = 0;
    let raf = 0;
    let decayRaf = 0;

    const apply = () => {
      // velocity in px/ms → tame to 0..1 then expand to a multiplier.
      const v = Math.min(1, Math.abs(velocity) / 4);
      // Speed multiplier: 1 (idle) → 6 (fast scroll). Length: 1 → 3.
      wrap.style.setProperty("--rain-speed", String(1 + v * 5));
      wrap.style.setProperty("--rain-length", String(1 + v * 2));
      wrap.style.setProperty("--rain-opacity", String(0.55 + v * 0.45));
    };

    const onScroll = () => {
      const now = performance.now();
      const dy = window.scrollY - lastY;
      const dt = Math.max(1, now - lastT);
      // Smooth velocity (low-pass filter).
      velocity = velocity * 0.55 + (dy / dt) * 0.45;
      lastY = window.scrollY;
      lastT = now;
      if (raf) cancelAnimationFrame(raf);
      raf = requestAnimationFrame(apply);
    };

    // Decay velocity back to 0 when scrolling stops so the rain
    // settles back to its calm idle state.
    const decay = () => {
      velocity *= 0.92;
      if (Math.abs(velocity) > 0.005) {
        apply();
        decayRaf = requestAnimationFrame(decay);
      } else {
        velocity = 0;
        apply();
      }
    };

    const onScrollEnd = () => {
      if (decayRaf) cancelAnimationFrame(decayRaf);
      decayRaf = requestAnimationFrame(decay);
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("scrollend", onScrollEnd as EventListener);
    // Fallback for browsers without `scrollend` (Safari): start decay
    // shortly after every scroll tick — the next tick re-arms the loop.
    let decayTimer: ReturnType<typeof setTimeout>;
    const scrollEndFallback = () => {
      clearTimeout(decayTimer);
      decayTimer = setTimeout(onScrollEnd, 140);
    };
    window.addEventListener("scroll", scrollEndFallback, { passive: true });

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", scrollEndFallback);
      window.removeEventListener("scrollend", onScrollEnd as EventListener);
      if (raf) cancelAnimationFrame(raf);
      if (decayRaf) cancelAnimationFrame(decayRaf);
      clearTimeout(decayTimer);
    };
  }, [mounted]);

  if (!mounted) return null;

  // Halve the streak count on mobile to protect the GPU compositor.
  const streaks = buildStreaks(isMobile ? 28 : 60);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      data-testid="scroll-rain"
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      style={{
        // Defaults; updated on scroll.
        // @ts-expect-error CSS custom properties.
        "--rain-speed": "1",
        "--rain-length": "1",
        "--rain-opacity": "0.55",
        opacity: "var(--rain-opacity)",
        transition: "opacity 250ms linear",
      }}
    >
      {streaks.map((s, i) => (
        <span
          key={i}
          className="absolute top-[-30vh] block"
          style={{
            left: `${s.l}%`,
            width: `${s.w}px`,
            height: `calc(${s.h}vh * var(--rain-length))`,
            background: `linear-gradient(to bottom, transparent, ${s.c} 35%, ${s.c} 65%, transparent)`,
            filter: s.w > 1 ? "blur(0.5px)" : "none",
            transform: `translateX(${s.drift}px)`,
            // The keyframes are defined in globals.css below.
            animation: `scrollRainFall ${s.dur}s linear ${s.d}s infinite`,
            animationDuration: `calc(${s.dur}s / var(--rain-speed))`,
            opacity: 0.85,
            mixBlendMode: "screen",
          }}
        />
      ))}
    </div>
  );
}
