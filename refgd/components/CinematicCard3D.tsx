"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { useEntranceReady } from "@/lib/loading-screen-gate";

/**
 * CinematicCard3D — fast, hard-edged 3D entrance for box cards.
 *
 * Built explicitly to replace MeshEntrance's SVG-displacement
 * blur+ripple, which the user reported as making them dizzy. This
 * component instead uses ONLY 3D transforms (no blur, no
 * displacement filter) plus a single accent-colour edge glow that
 * flashes bright on entrance and then settles into a thin static
 * rim — giving the cards an "innovative, hard-edge glow" finish
 * the user requested.
 *
 *   variant = "flip"     → fast rotateY flip (How-it-works)
 *   variant = "shuffle"  → rotateX + translateY snap (Rules)
 *
 * Both variants are FAST (~700 ms) and use ease-out-back so the
 * card overshoots slightly before snapping into place — that's
 * the "cinematic" beat. After the entrance plays the inline
 * styles are dropped so the card is a zero-cost static element
 * for any subsequent interaction.
 *
 * Trigger: rAF poll (replaces IntersectionObserver). The previous
 * IO used threshold:0.18 + rootMargin "-6% bottom" — on iOS Safari
 * this threshold was too strict and the IO callback never fired,
 * leaving cards permanently invisible (inner opacity:0). The rAF
 * poll fires the moment the card's top enters window.innerHeight,
 * which is identical to SafeReveal v13 / Reveal v7 / LedTicker v2
 * and is reliable across all mobile browsers.
 *
 * Gated on useEntranceReady so cards above the loading splash
 * hold their initial state until the splash lifts (otherwise the
 * entrance plays silently behind the overlay).
 */
export type CinematicAccent =
  | "amber"
  | "violet"
  | "cyan"
  | "fuchsia"
  | "rose"
  | "emerald";

const ACCENT_RGB: Record<CinematicAccent, string> = {
  amber: "245, 185, 69",
  violet: "167, 139, 250",
  cyan: "34, 211, 238",
  fuchsia: "232, 121, 249",
  rose: "251, 113, 133",
  emerald: "52, 211, 153",
};

export default function CinematicCard3D({
  children,
  className = "",
  delay = 0,
  duration = 700,
  variant = "flip",
  accent = "amber",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  variant?: "flip" | "shuffle";
  accent?: CinematicAccent;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const rimRef = useRef<HTMLDivElement>(null);
  const entranceReady = useEntranceReady();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!entranceReady) return;
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    const rim = rimRef.current;
    if (!wrap || !inner || !rim) return;

    const reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      inner.style.opacity = "1";
      inner.style.transform = "none";
      rim.style.opacity = "0";
      return;
    }

    let raf = 0;
    let played = false;

    // Easing: ease-out-back — overshoots then settles, the
    // signature "snap" that reads as cinematic without the
    // dizzying compositor work of a blur/displacement filter.
    const easeOutBack = (t: number) => {
      const c1 = 1.70158;
      const c3 = c1 + 1;
      return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
    };

    const startTransform =
      variant === "flip"
        ? "perspective(1400px) rotateY(-78deg) rotateX(8deg) translateZ(-220px) scale(0.82)"
        : "perspective(1400px) rotateX(34deg) translateY(60px) translateZ(-160px) scale(0.88)";

    inner.style.opacity = "0";
    inner.style.transform = startTransform;

    const play = () => {
      const startAt = performance.now() + delay * 1000;
      const tick = (now: number) => {
        const raw = Math.max(0, Math.min(1, (now - startAt) / duration));
        const e = easeOutBack(raw);
        const opacity = Math.min(1, raw * 1.4);

        if (variant === "flip") {
          const ry = -78 * (1 - e);
          const rx = 8 * (1 - e);
          const tz = -220 * (1 - e);
          const sc = 0.82 + (1 - 0.82) * e;
          inner.style.transform = `perspective(1400px) rotateY(${ry.toFixed(2)}deg) rotateX(${rx.toFixed(2)}deg) translateZ(${tz.toFixed(1)}px) scale(${sc.toFixed(3)})`;
        } else {
          const rx = 34 * (1 - e);
          const ty = 60 * (1 - e);
          const tz = -160 * (1 - e);
          const sc = 0.88 + (1 - 0.88) * e;
          inner.style.transform = `perspective(1400px) rotateX(${rx.toFixed(2)}deg) translateY(${ty.toFixed(1)}px) translateZ(${tz.toFixed(1)}px) scale(${sc.toFixed(3)})`;
        }
        inner.style.opacity = opacity.toFixed(3);

        // Rim glow flashes bright at settle (raw ≈ 0.6→1) and
        // then fades to a quiet 18 % steady-state, so the card
        // keeps a permanent thin accent edge.
        const flash =
          raw < 0.6 ? raw / 0.6 : Math.max(0, 1 - (raw - 0.6) / 0.4);
        rim.style.opacity = (0.18 + flash * 0.82).toFixed(3);

        if (raw < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          inner.style.transform = "none";
          inner.style.opacity = "1";
          rim.style.opacity = "0.18";
        }
      };
      raf = requestAnimationFrame(tick);
    };

    // rAF poll: fires when card top enters viewport.
    // Replaces IntersectionObserver (threshold:0.18) which failed
    // to fire on iOS Safari, leaving cards permanently invisible.
    let pollActive = true;
    let pollRaf = 0;

    // Immediate check — above-fold cards play without polling.
    const r0 = wrap.getBoundingClientRect();
    if (r0.top < (window.innerHeight || 0) * 0.95 && r0.bottom > 0) {
      played = true;
      play();
    } else {
      const poll = () => {
        if (!pollActive || played) return;
        const r = wrap.getBoundingClientRect();
        if (r.top < window.innerHeight) {
          played = true;
          play();
        } else {
          pollRaf = requestAnimationFrame(poll);
        }
      };
      pollRaf = requestAnimationFrame(poll);
    }

    return () => {
      pollActive = false;
      cancelAnimationFrame(pollRaf);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [delay, duration, variant, entranceReady]);

  const rgb = ACCENT_RGB[accent];

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ perspective: "1400px" }}
    >
      <div
        ref={innerRef}
        style={{
          position: "relative",
          opacity: 0,
          transformStyle: "preserve-3d",
          transformOrigin: "center center",
          willChange: "transform, opacity",
        }}
      >
        {/* Hard-edge accent rim — sharp 1 px border + tight outer
            glow. Sits ABOVE the children so it crisply traces the
            card's actual silhouette. Pointer-events:none so it
            never blocks clicks on the underlying card. */}
        <div
          ref={rimRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[28px]"
          style={{
            opacity: 0,
            border: `1px solid rgba(${rgb}, 0.95)`,
            boxShadow: `0 0 0 1px rgba(${rgb}, 0.35), 0 0 24px 2px rgba(${rgb}, 0.55), inset 0 0 18px rgba(${rgb}, 0.25)`,
            zIndex: 5,
            transition: "opacity 200ms ease-out",
          }}
        />
        {children}
      </div>
    </div>
  );
}
