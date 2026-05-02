"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useEntranceReady } from "@/lib/loading-screen-gate";

/**
 * PrismShard — entrance specifically used for the Evade-Cancelations
 * FEATURES grid so it visually differs from the StoreList "rules"
 * cards (those use MeshEntrance). The user explicitly asked for
 * the Evade page and StoreList page to have DISTINCT entrance
 * animations so the two pages don't feel templated.
 *
 * Effect: each card sweeps in behind a clip-path "prism shard"
 * that pivots open from a tilted edge, while a chromatic-aberration
 * RGB split eases back to crisp at completion. Pure CSS keyframes
 * driven by IntersectionObserver — single shot, drops all inline
 * styles after settle so the static card costs zero compositor
 * cycles. Reduced-motion users see the final state instantly.
 */
export default function PrismShard({
  children,
  className = "",
  delay = 0,
  duration = 1100,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  // Defer the prism-shard entrance until the loading splash has
  // lifted so the Evade FEATURES grid above the fold doesn't burn
  // its first play behind the splash overlay.
  const entranceReady = useEntranceReady();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!entranceReady) return;
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      inner.style.opacity = "1";
      inner.style.transform = "none";
      inner.style.filter = "none";
      inner.style.clipPath = "none";
      return;
    }

    let raf = 0;
    let played = false;

    const play = () => {
      const startAt = performance.now() + delay * 1000;
      const tick = (now: number) => {
        const t = Math.max(0, Math.min(1, (now - startAt) / duration));
        // back-ease for a snappy "shard slams into place" feel
        const e =
          t < 0.5
            ? 4 * t * t * t
            : 1 - Math.pow(-2 * t + 2, 3) / 2;

        const opacity = e;
        const skewY = (1 - e) * 8; // tilt
        const tx = (1 - e) * -42; // slide in from left
        const scale = 0.92 + 0.08 * e;
        // Chromatic aberration: red & cyan split that closes to 0
        const splitPx = (1 - e) * 6;
        // Clip-path: shard wipes from a tilted parallelogram (right
        // edge first) outward to full rect.
        const wipe = 100 - 100 * e;
        const clip = `polygon(${wipe}% 0%, 100% 0%, 100% 100%, ${wipe + 6}% 100%)`;

        inner.style.opacity = opacity.toFixed(3);
        inner.style.transform = `translate3d(${tx.toFixed(2)}px, 0, 0) skewY(${skewY.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        inner.style.clipPath = clip;
        inner.style.filter = `drop-shadow(${splitPx.toFixed(2)}px 0 0 rgba(255,80,120,0.55)) drop-shadow(${(-splitPx).toFixed(2)}px 0 0 rgba(80,200,255,0.55))`;

        if (t < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          // Settle — wipe all entrance styles so the static card
          // is interaction-ready and costs zero compositor cycles.
          inner.style.opacity = "1";
          inner.style.transform = "none";
          inner.style.clipPath = "none";
          inner.style.filter = "none";
        }
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !played) {
            played = true;
            io.disconnect();
            play();
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(wrap);

    const r = wrap.getBoundingClientRect();
    if (
      r.top < (window.innerHeight || 0) * 0.95 &&
      r.bottom > 0 &&
      !played
    ) {
      played = true;
      io.disconnect();
      play();
    }

    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [delay, duration, entranceReady]);

  return (
    <div ref={wrapRef} className={className}>
      <div
        ref={innerRef}
        style={{
          opacity: 0,
          transform: "translate3d(-42px, 0, 0) skewY(8deg) scale(0.92)",
          clipPath: "polygon(100% 0%, 100% 0%, 106% 100%, 106% 100%)",
          willChange: "opacity, transform, clip-path, filter",
        }}
      >
        {children}
      </div>
    </div>
  );
}
