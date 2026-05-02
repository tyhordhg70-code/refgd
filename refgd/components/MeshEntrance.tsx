"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { useEntranceReady } from "@/lib/loading-screen-gate";

/**
 * MeshEntrance — lusion.co-style 3D distorted mesh entrance.
 *
 * Wraps any block of content with a one-shot entrance that combines:
 *   • SVG feTurbulence + feDisplacementMap (the "mesh distortion")
 *   • perspective scale + rotateX
 *   • CSS blur
 *
 * The displacement scale, blur, transform and opacity all morph from
 * "warped" to "settled" over ~1.1s using direct DOM mutation in a
 * single rAF loop (no React re-renders during the playback).
 *
 * After the animation completes the wrapper drops the SVG filter and
 * inline styles entirely so subsequent paints are zero-cost — the
 * filter is purely an entrance flourish, not a permanent compositor
 * layer.
 *
 * Trigger: IntersectionObserver, single shot. Reduced-motion users
 * just see the final state.
 */
export default function MeshEntrance({
  children,
  className = "",
  delay = 0,
  duration = 1100,
  /** Maximum SVG displacement scale (px). Higher = more violent warp. */
  warp = 90,
  /** Maximum entrance blur in pixels. */
  blur = 14,
  /** Initial scale (settles to 1). */
  startScale = 0.84,
  /** Initial X rotation in deg (settles to 0). */
  startRotateX = -16,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  warp?: number;
  blur?: number;
  startScale?: number;
  startRotateX?: number;
}) {
  const id = useId().replace(/:/g, "");
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const dispRef = useRef<SVGFEDisplacementMapElement>(null);
  // Gate the mesh entrance until the loading splash has lifted —
  // otherwise above-the-fold mesh-wrapped sections (e.g. the home
  // Telegram CTA) silently complete their warp behind the splash
  // overlay and the user sees a static box when the splash fades.
  const entranceReady = useEntranceReady();

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!entranceReady) return;
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    const disp = dispRef.current;
    if (!wrap || !inner) return;

    const reduce =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      inner.style.opacity = "1";
      inner.style.transform = "none";
      inner.style.filter = "none";
      return;
    }

    let raf = 0;
    let played = false;

    const play = () => {
      const startAt = performance.now() + delay * 1000;
      const tick = (now: number) => {
        const t = Math.max(0, Math.min(1, (now - startAt) / duration));
        const e = 1 - Math.pow(1 - t, 3.5);
        const opacity = e;
        const scale = startScale + (1 - startScale) * e;
        const rotX = startRotateX * (1 - e);
        const b = blur * (1 - e);
        const d = warp * (1 - e);

        inner.style.opacity = opacity.toFixed(3);
        inner.style.transform = `perspective(1200px) rotateX(${rotX.toFixed(2)}deg) scale(${scale.toFixed(3)})`;
        inner.style.filter = `url(#me-${id}) blur(${b.toFixed(2)}px)`;
        if (disp) disp.setAttribute("scale", d.toFixed(2));

        if (t < 1) {
          raf = requestAnimationFrame(tick);
        } else {
          // Settle: drop the filter so the static card has zero
          // compositor cost and stays crisp / interactive.
          inner.style.filter = "none";
          inner.style.transform = "none";
          inner.style.opacity = "1";
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
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(wrap);

    // If already in view at mount (above-the-fold), kick off immediately.
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
  }, [id, delay, duration, warp, blur, startScale, startRotateX, entranceReady]);

  return (
    <div ref={wrapRef} className={className}>
      <svg
        width="0"
        height="0"
        aria-hidden="true"
        style={{ position: "absolute", pointerEvents: "none" }}
      >
        <filter
          id={`me-${id}`}
          x="-20%"
          y="-20%"
          width="140%"
          height="140%"
        >
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.018"
            numOctaves="2"
            seed="5"
          />
          <feDisplacementMap
            ref={dispRef}
            in="SourceGraphic"
            scale={String(warp)}
          />
        </filter>
      </svg>
      <div
        ref={innerRef}
        style={{
          opacity: 0,
          transform: `perspective(1200px) rotateX(${startRotateX}deg) scale(${startScale})`,
          filter: `url(#me-${id}) blur(${blur}px)`,
          willChange: "transform, opacity, filter",
        }}
      >
        {children}
      </div>
    </div>
  );
}
