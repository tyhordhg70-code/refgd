"use client";

import { useEffect, useRef } from "react";

/**
 * PixelRainCosmic v7 — self-playing cinematic transition.
 *
 * Previous design: scroll-driven with a sticky runway (100 + N×100 svh).
 * This required the user to scroll through the runway, broke under Lenis
 * smooth-scroll, and caused an ugly dead-scroll zone.
 *
 * New design:
 *   – Container is exactly h-screen (one viewport, no runway).
 *   – Rain is TIME-driven, not scroll-driven. The moment the section
 *     enters the viewport, density ramps 0 → 1 over ~1.5 s and rain
 *     falls continuously at natural speed forever.
 *   – No auto-scroll logic, no Lenis dependency, no sticky div.
 *   – Canvas is fully transparent (alpha: true, destination-out trail),
 *     so the page galaxy background shows through at all times.
 *   – IntersectionObserver pauses the rAF loop when fully off-screen
 *     (battery / perf friendly).
 *   – Honors prefers-reduced-motion (static still at mid-density).
 */

type Props = {
  /** Cosmic accent colour (default azure-cyan). */
  accent?: string;
  className?: string;
  /**
   * Legacy prop — no longer used (was scroll-runway multiplier).
   * Kept in the signature so call-sites don't need updating.
   */
  scrollLength?: number;
};

const GLYPHS = "0123456789ABCDEFアイウエオカキクケコサシスセソタチツテトナニヌネノハ▣▤▥▦◇◆░▒▓".split("");

/** Duration (in rAF ticks at ~60 fps) to ramp 0 → 1. */
const RAMP_TICKS = 90; // ~1.5 s at 60 fps

export default function PixelRainCosmic({
  accent = "#7dd3fc",
  className = "",
  scrollLength: _ignored,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timeRef = useRef(0);
  const rampRef = useRef(0);   // ticks since section entered view (0 → RAMP_TICKS)
  const rafRef = useRef<number | null>(null);
  const visibleRef = useRef(false);

  useEffect(() => {
    const wrap = wrapRef.current;
    const cnv = canvasRef.current;
    if (!wrap || !cnv) return;

    const ctx = cnv.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Resize ──────────────────────────────────────────────────────────
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cssW = 0, cssH = 0, cols = 0;
    const cellW = 16, cellH = 22;

    type Col = {
      head: number; speed: number; depth: number;
      hueShift: number; alphaPeak: number; flicker: number; lastGlyph: string;
    };
    let columns: Col[] = [];

    function rebuildColumns() {
      timeRef.current = 0;
      cols = Math.max(8, Math.ceil(cssW / cellW));
      columns = new Array(cols).fill(0).map(() => {
        const depth = Math.pow(Math.random(), 1.6);
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
      const r = cnv.getBoundingClientRect();
      cssW = Math.max(1, r.width);
      cssH = Math.max(1, r.height);
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      cnv.width = Math.floor(cssW * dpr);
      cnv.height = Math.floor(cssH * dpr);
      cnv.style.width = `${cssW}px`;
      cnv.style.height = `${cssH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      rebuildColumns();
    }
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(cnv);

    // ── Helpers ──────────────────────────────────────────────────────────
    const hsl = hexToHsl(accent);

    function draw(p: number) {
      const w = cssW, h = cssH;

      ctx.globalCompositeOperation = "destination-out";
      ctx.fillStyle = `rgba(0,0,0,${0.10 + 0.06 * (1 - p)})`;
      ctx.fillRect(0, 0, w, h);

      ctx.globalCompositeOperation = "source-over";
      ctx.font = "600 14px JetBrains Mono, ui-monospace, SFMono-Regular, monospace";
      ctx.textBaseline = "top";

      const tf = timeRef.current;
      const screenRows = Math.ceil(h / cellH);
      const trailBuf = Math.max(8, Math.floor(8 + 8 * p));

      for (let i = 0; i < cols; i++) {
        const c = columns[i];
        const x = i * cellW + cellW * 0.5;
        const cycleLen = screenRows + trailBuf + 4;
        const headRow = ((tf * c.speed * 0.45 + c.flicker * cycleLen) % cycleLen);

        for (let k = 0; k < trailBuf; k++) {
          const row = headRow - k;
          const y = row * cellH;
          if (y < -cellH || y > h + cellH) continue;

          const t = 1 - k / trailBuf;
          const a =
            c.alphaPeak * p * t *
            (0.6 + 0.4 * Math.sin((c.flicker + k) * 1.7 + tf * 0.02));

          const isHead = k === 0;
          const hue = (hsl.h + c.hueShift + 360) % 360;
          const sat = isHead ? 30 : Math.min(95, hsl.s + 10);
          const lit = isHead ? 92 : Math.max(45, hsl.l + c.depth * 18 - k * 1.5);
          ctx.fillStyle = `hsla(${hue},${sat}%,${lit}%,${clamp(a, 0, 1)})`;

          let g = c.lastGlyph;
          if (isHead || Math.random() < 0.06) {
            g = GLYPHS[(Math.random() * GLYPHS.length) | 0];
            if (isHead) c.lastGlyph = g;
          }
          ctx.fillText(g, x - 7, y);
        }
      }
    }

    function loop() {
      if (!visibleRef.current) {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        return;
      }
      timeRef.current += 1;
      // Ramp density 0 → 1 over RAMP_TICKS ticks.
      if (rampRef.current < RAMP_TICKS) rampRef.current += 1;
      // Ease-in-out curve so the ramp feels smooth.
      const raw = rampRef.current / RAMP_TICKS;
      const p = raw < 0.5 ? 2 * raw * raw : 1 - Math.pow(-2 * raw + 2, 2) / 2;
      draw(p);
      rafRef.current = requestAnimationFrame(loop);
    }

    // ── IntersectionObserver — pauses rAF when fully off-screen ─────────
    const io = new IntersectionObserver(
      ([e]) => {
        visibleRef.current = e.isIntersecting;
        if (visibleRef.current) loop();
      },
      { rootMargin: "200px 0px 400px 0px" }
    );
    io.observe(wrap);

    if (reduce) {
      // Static still — ramp to mid-density, draw once.
      rampRef.current = Math.round(RAMP_TICKS * 0.7);
      draw(0.7);
    }

    return () => {
      ro.disconnect();
      io.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [accent]);

  return (
    <div
      ref={wrapRef}
      className={`relative h-screen w-full overflow-hidden ${className}`}
      style={{ background: "transparent" }}
      aria-hidden="true"
    >
      <canvas
        ref={canvasRef}
        className="block h-full w-full"
        style={{ background: "transparent" }}
      />
    </div>
  );
}

function clamp(v: number, lo: number, hi: number) {
  return v < lo ? lo : v > hi ? hi : v;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = hex.replace("#", "");
  const n = m.length === 3 ? m.split("").map((c) => c + c).join("") : m;
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
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
