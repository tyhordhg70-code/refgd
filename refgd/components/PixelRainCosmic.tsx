"use client";

import { useEffect, useRef } from "react";

/**
 * PixelRainCosmic
 * ─────────────────────────────────────────────────────────────────
 * A 3D-feeling cosmic-blue digital pixel rain (Matrix-style, but in
 * cyan/azure with depth & parallax). The animation is LAZY-SCROLL
 * TRIGGERED: it does nothing until the host section enters the
 * viewport, then progresses 0 → 1 across one scroll-length.
 *
 * Critically, the visual progresses BOTH directions:
 *   – Scrolling DOWN  → 0 → 1 (rain spawns, lights flicker on, builds
 *                              up a dense column matrix)
 *   – Scrolling UP    → 1 → 0 (rain sucks back into the void; columns
 *                              dissolve from the bottom up)
 *
 * The whole sweep completes within ONE viewport-height of scroll
 * inside the host section, so the user always sees a clean start and
 * a clean finish per pass.
 *
 * Implementation notes:
 *   – Pure 2D <canvas>; the "3D depth" is faked by parallax + per-
 *     column z-bin (near columns: bigger glyphs, brighter, faster;
 *     far columns: smaller, dimmer, slower).
 *   – devicePixelRatio aware. Resizes on window resize.
 *   – Cheaply pauses (no rAF) when off-screen.
 *   – Honors `prefers-reduced-motion` by fading in a static still
 *     instead of animating.
 */

type Props = {
  /** Approx. height of the host sticky section, in viewport heights.
   *  Default 1.6vh worth of scroll consumed for the sweep. */
  scrollLength?: number;
  /** Cosmic accent (default azure-cyan). */
  accent?: string;
  className?: string;
};

const GLYPHS = "0123456789ABCDEFアイウエオカキクケコサシスセソタチツテトナニヌネノハ▣▤▥▦◇◆░▒▓".split("");

export default function PixelRainCosmic({
  scrollLength = 1.6,
  accent = "#7dd3fc",
  className = "",
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const visibleRef = useRef(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cnv = canvasRef.current;
    if (!wrap || !cnv) return;

    // TS narrowing — locked once we've passed the null checks above.
    const W = wrap as HTMLDivElement;
    const C = cnv as HTMLCanvasElement;

    const ctx = C.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Resize handling ──
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cssW = 0;
    let cssH = 0;
    let cols = 0;
    const cellW = 16;       // CSS pixels per column
    const cellH = 22;       // CSS pixels per row stride
    type Col = {
      head: number;        // y position of the brightest glyph (rows)
      speed: number;       // rows per progress-step
      depth: number;       // 0 (far) → 1 (near)
      hueShift: number;    // -25..25 deg from accent
      alphaPeak: number;   // brightest glyph alpha
      flicker: number;     // 0..1 random offset for shimmer
      lastGlyph: string;
    };
    let columns: Col[] = [];

    function rebuildColumns() {
      cols = Math.max(8, Math.ceil(cssW / cellW));
      columns = new Array(cols).fill(0).map(() => {
        const depth = Math.pow(Math.random(), 1.6); // skew toward far
        return {
          head: -Math.random() * (cssH / cellH),
          speed: 0.35 + Math.random() * 0.95 + depth * 0.6,
          depth,
          hueShift: (Math.random() - 0.5) * 50,
          alphaPeak: 0.35 + 0.65 * depth,
          flicker: Math.random(),
          lastGlyph: GLYPHS[(Math.random() * GLYPHS.length) | 0],
        };
      });
    }

    function resize() {
      const r = W.getBoundingClientRect();
      cssW = Math.max(1, r.width);
      cssH = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      C.width = Math.floor(cssW * dpr);
      C.height = Math.floor(cssH * dpr);
      C.style.width = `${cssW}px`;
      C.style.height = `${cssH}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildColumns();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(W);

    // ── Visibility gate ──
    const io = new IntersectionObserver(
      ([e]) => {
        visibleRef.current = e.isIntersecting;
        if (visibleRef.current) loop();
      },
      { rootMargin: "120px" }
    );
    io.observe(W);

    // Parse the accent into "h s l" so we can shift hue per column.
    const hsl = hexToHsl(accent);

    function draw() {
      const w = cssW;
      const h = cssH;
      const p = clamp(progressRef.current, 0, 1);

      // Trail: clear with a translucent dark cosmic wash so previous
      // glyphs persist briefly, producing the classic "rain trail".
      ctx!.globalCompositeOperation = "source-over";
      ctx!.fillStyle = `rgba(4,8,22,${0.18 + 0.10 * (1 - p)})`;
      ctx!.fillRect(0, 0, w, h);

      // Vignette / depth wash so the rain reads as cosmic, not flat.
      const grad = ctx!.createRadialGradient(
        w * 0.5, h * 0.55, h * 0.05,
        w * 0.5, h * 0.55, Math.max(w, h) * 0.7
      );
      grad.addColorStop(0, "rgba(8,14,36,0)");
      grad.addColorStop(1, "rgba(2,3,12,0.55)");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, w, h);

      // Active rows-window scales with progress: at p=0 only the
      // top sliver of glyphs is alive, at p=1 the full column is full.
      const aliveRows = (h / cellH) * (0.15 + 0.85 * p);

      ctx!.font = "600 14px JetBrains Mono, ui-monospace, SFMono-Regular, monospace";
      ctx!.textBaseline = "top";

      for (let i = 0; i < cols; i++) {
        const c = columns[i];
        const x = i * cellW + cellW * 0.5;

        // Per-column rain head advances proportionally to global p.
        // We anchor the head to progress so dragging the scroll
        // backward reverses the rain (it doesn't just freeze).
        const headRow = (p * (h / cellH + 30) * c.speed) - 20 + c.flicker * 4;

        // Draw the trail of glyphs above the head, fading with distance.
        const trailLen = Math.max(8, Math.floor(aliveRows));
        for (let k = 0; k < trailLen; k++) {
          const row = headRow - k;
          const y = row * cellH;
          if (y < -cellH || y > h + cellH) continue;

          // Brightness falls off with k (distance from head) and
          // rises with column depth.
          const t = 1 - k / trailLen;
          const a =
            c.alphaPeak *
            t *
            (0.6 + 0.4 * Math.sin((c.flicker + k) * 1.7 + p * 6));

          // Lead glyph is white-hot; trail uses the cosmic blue.
          const isHead = k === 0;
          const hue = (hsl.h + c.hueShift + 360) % 360;
          const sat = isHead ? 30 : Math.min(95, hsl.s + 10);
          const lit = isHead ? 90 : Math.max(38, hsl.l + c.depth * 18 - k * 1.5);
          ctx!.fillStyle = `hsla(${hue}, ${sat}%, ${lit}%, ${clamp(a, 0, 1)})`;

          // Occasionally swap the glyph so the column shimmers.
          let g = c.lastGlyph;
          if (isHead || Math.random() < 0.06) {
            g = GLYPHS[(Math.random() * GLYPHS.length) | 0];
            if (isHead) c.lastGlyph = g;
          }
          ctx!.fillText(g, x - 7, y);
        }
      }
    }

    function loop() {
      if (!visibleRef.current) {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        return;
      }
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }

    // ── Scroll-progress driver ──
    function onScroll() {
      const r = W.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      // Span over which 0 → 1 plays out: ONE viewport-height of scroll.
      const span = vh * scrollLength;
      // Distance the wrapper's TOP has scrolled past the viewport top.
      // -vh (just-entering) → +span (just-exiting upward).
      const traveled = vh - r.top;
      progressRef.current = clamp((traveled - vh * 0.15) / span, 0, 1);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (reduce) {
      // Render one static frame at progress=0.6 and stop.
      progressRef.current = 0.6;
      draw();
    } else {
      loop();
    }

    return () => {
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [accent, scrollLength]);

  return (
    <div
      ref={wrapRef}
      className={`relative w-full overflow-hidden rounded-[1.6rem] border border-cyan-300/15 ${className}`}
      style={{
        height: `${Math.round(scrollLength * 70)}vh`,
        minHeight: 360,
        background:
          "linear-gradient(180deg, rgba(2,4,16,0.92) 0%, rgba(4,10,32,0.96) 50%, rgba(2,4,16,0.96) 100%)",
        boxShadow:
          "0 60px 120px -40px rgba(8,30,80,0.6), inset 0 1px 0 rgba(125,211,252,0.08)",
      }}
      aria-hidden="true"
    >
      <canvas ref={canvasRef} className="block h-full w-full" />
      {/* Top + bottom edge fades so the rain blends into the page. */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-24"
        style={{
          background:
            "linear-gradient(180deg, rgba(2,4,16,1) 0%, rgba(2,4,16,0) 100%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
        style={{
          background:
            "linear-gradient(0deg, rgba(2,4,16,1) 0%, rgba(2,4,16,0) 100%)",
        }}
      />
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = hex.replace("#", "");
  const n = m.length === 3
    ? m.split("").map((c) => c + c).join("")
    : m;
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}
