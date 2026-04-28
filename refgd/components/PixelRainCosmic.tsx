"use client";

import { useEffect, useRef } from "react";

/**
 * PixelRainCosmic
 * ─────────────────────────────────────────────────────────────────
 * A 3D-feeling cosmic-blue digital pixel rain (Matrix-style, but in
 * cyan/azure with depth & parallax). The component is FULL-SCREEN
 * and TRANSPARENT — it sits on top of the page galaxy as a transition
 * animation, never obscuring it with a solid panel.
 *
 * The animation is LAZY-SCROLL TRIGGERED: it does nothing until the
 * host section enters the viewport, then progresses 0 → 1 across one
 * scroll-length.
 *
 * Critically, the visual progresses BOTH directions:
 *   – Scrolling DOWN  → 0 → 1 (rain spawns, columns build up dense)
 *   – Scrolling UP    → 1 → 0 (rain sucks back into the void; columns
 *                              dissolve from the bottom up)
 *
 * The whole sweep completes within ONE viewport-height of scroll
 * inside the host section, so the user always sees a clean start and
 * a clean finish per pass.
 *
 * Implementation notes:
 *   – Pure 2D <canvas> with destination-out trail clearing so the
 *     page background shows through between glyphs.
 *   – Outer container is a tall scroll runway; the inner canvas is
 *     `sticky top-0 h-screen` so it pins as a full-screen layer.
 *   – devicePixelRatio aware. Resizes on window resize.
 *   – Cheaply pauses (no rAF) when off-screen.
 *   – Honors `prefers-reduced-motion` by fading in a static still
 *     instead of animating.
 */

type Props = {
  /** How many viewport-heights of scroll to consume for one full
   *  0 → 1 sweep. Default 1.0 (one continuous scroll). */
  scrollLength?: number;
  /** Cosmic accent (default azure-cyan). */
  accent?: string;
  className?: string;
};

const GLYPHS = "0123456789ABCDEFアイウエオカキクケコサシスセソタチツテトナニヌネノハ▣▤▥▦◇◆░▒▓".split("");

export default function PixelRainCosmic({
  scrollLength = 1.0,
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

    const W = wrap as HTMLDivElement;
    const C = cnv as HTMLCanvasElement;

    // alpha:true → canvas itself is transparent; the page's galaxy
    // shows through wherever we haven't drawn (or have erased) glyphs.
    const ctx = C.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Resize handling ──
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cssW = 0;
    let cssH = 0;
    let cols = 0;
    const cellW = 16;
    const cellH = 22;
    type Col = {
      head: number;
      speed: number;
      depth: number;
      hueShift: number;
      alphaPeak: number;
      flicker: number;
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
          alphaPeak: 0.45 + 0.55 * depth,
          flicker: Math.random(),
          lastGlyph: GLYPHS[(Math.random() * GLYPHS.length) | 0],
        };
      });
    }

    function resize() {
      const r = C.getBoundingClientRect();
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
    ro.observe(C);

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

      // Trail clearing: destination-out fades previous glyphs by alpha,
      // letting the underlying page background show through. This is
      // what gives us a TRANSPARENT canvas with proper trail behaviour.
      ctx!.globalCompositeOperation = "destination-out";
      ctx!.fillStyle = `rgba(0,0,0, ${0.10 + 0.06 * (1 - p)})`;
      ctx!.fillRect(0, 0, w, h);

      // Glyph drawing — opaque on top of whatever's left.
      ctx!.globalCompositeOperation = "source-over";

      // Active rows-window scales with progress.
      const aliveRows = (h / cellH) * (0.15 + 0.85 * p);

      ctx!.font = "600 14px JetBrains Mono, ui-monospace, SFMono-Regular, monospace";
      ctx!.textBaseline = "top";

      for (let i = 0; i < cols; i++) {
        const c = columns[i];
        const x = i * cellW + cellW * 0.5;

        // Per-column rain head advances proportionally to global p.
        const headRow = (p * (h / cellH + 30) * c.speed) - 20 + c.flicker * 4;

        const trailLen = Math.max(8, Math.floor(aliveRows));
        for (let k = 0; k < trailLen; k++) {
          const row = headRow - k;
          const y = row * cellH;
          if (y < -cellH || y > h + cellH) continue;

          const t = 1 - k / trailLen;
          const a =
            c.alphaPeak *
            t *
            (0.6 + 0.4 * Math.sin((c.flicker + k) * 1.7 + p * 6));

          const isHead = k === 0;
          const hue = (hsl.h + c.hueShift + 360) % 360;
          const sat = isHead ? 30 : Math.min(95, hsl.s + 10);
          const lit = isHead ? 92 : Math.max(45, hsl.l + c.depth * 18 - k * 1.5);
          ctx!.fillStyle = `hsla(${hue}, ${sat}%, ${lit}%, ${clamp(a, 0, 1)})`;

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
      // Span over which 0 → 1 plays out.
      const span = vh * scrollLength;
      // How far the wrapper top has scrolled past viewport top.
      const traveled = -r.top;
      progressRef.current = clamp(traveled / span, 0, 1);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    if (reduce) {
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

  // Outer wrapper: scroll runway. Inner: sticky full-viewport canvas.
  // No bg colour, no border, no shadow — fully transparent so the page
  // galaxy shows through as the rain plays over the top.
  const runway = `${Math.round(100 + scrollLength * 100)}svh`;

  return (
    <div
      ref={wrapRef}
      className={`relative w-full ${className}`}
      style={{ height: runway, background: "transparent" }}
      aria-hidden="true"
    >
      <div
        className="sticky top-0 h-screen w-full overflow-hidden"
        style={{ background: "transparent" }}
      >
        <canvas
          ref={canvasRef}
          className="block h-full w-full"
          style={{ background: "transparent" }}
        />
      </div>
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
