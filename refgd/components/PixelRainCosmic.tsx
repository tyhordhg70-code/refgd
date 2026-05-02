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
  /** When true, the moment the user gives ANY scroll-input gesture
   *  inside the rain section we smoothly auto-scroll the page past
   *  the rain runway instead of forcing the visitor to scroll the
   *  full 160 svh themselves. Honours prefers-reduced-motion. */
  autoScrollAfterFirstNudge?: boolean;
};

const GLYPHS = "0123456789ABCDEFアイウエオカキクケコサシスセソタチツテトナニヌネノハ▣▤▥▦◇◆░▒▓".split("");

export default function PixelRainCosmic({
  scrollLength = 1.0,
  accent = "#7dd3fc",
  className = "",
  autoScrollAfterFirstNudge = true,
}: Props) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const progressRef = useRef(0);
  const timeRef = useRef(0);
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
      timeRef.current = 0;
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
      { rootMargin: "600px 0px 1200px 0px" }
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

      // Active rows-window scales with progress (density control).
      const aliveRows = (h / cellH) * (0.15 + 0.85 * p);

      ctx!.font = "600 14px JetBrains Mono, ui-monospace, SFMono-Regular, monospace";
      ctx!.textBaseline = "top";

      // timeRef advances every rAF tick — decoupled from scroll so rain
      // keeps falling at natural speed even when the user stops scrolling.
      const tf = timeRef.current;
      // screenRows: total visible rows on screen. cycleLen: one full column
      // cycle (screen + trail buffer) so the head wraps back to the top
      // instead of growing off-screen unboundedly.
      const screenRows = Math.ceil(h / cellH);
      const trailBuf = Math.max(8, Math.floor(aliveRows));

      for (let i = 0; i < cols; i++) {
        const c = columns[i];
        const x = i * cellW + cellW * 0.5;

        // Head position: time-driven with MODULO wrap so each column
        // cycles 0 → screenRows → 0 → … continuously.
        const cycleLen = screenRows + trailBuf + 4;
        const headRow = ((tf * c.speed * 0.45 + c.flicker * cycleLen) % cycleLen);
        const trailLen = trailBuf;

        for (let k = 0; k < trailLen; k++) {
          const row = headRow - k;
          const y = row * cellH;
          if (y < -cellH || y > h + cellH) continue;

          const t = 1 - k / trailLen;
          const a =
            c.alphaPeak *
            p *                 // p=0 → invisible; p=1 → full density
            t *
            (0.6 + 0.4 * Math.sin((c.flicker + k) * 1.7 + tf * 0.02));

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
      // Always advance progress (so off-screen drains back to 0).
      tickProgress();
      if (!visibleRef.current && progressRef.current <= 0) {
        if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        return;
      }
      // Advance time every frame — rain always falls regardless of scroll.
      timeRef.current += 1;
      draw();
      rafRef.current = requestAnimationFrame(loop);
    }

    // ── Auto-progress driver ──
    // The rain now AUTO-PLAYS the moment the section enters the viewport.
    // No scroll input required: progress ramps 0 → 1 over ~700ms once
    // visible, then stays at full density. This was a user request:
    // they should never have to scroll inside the rain to see the effect.
    let entryTime: number | null = null;
    const RAMP_MS = 700;
    function tickProgress() {
      if (!visibleRef.current) {
        // Not in view → drain back to 0 so re-entry replays nicely.
        entryTime = null;
        progressRef.current = Math.max(0, progressRef.current - 0.04);
        return;
      }
      if (entryTime == null) entryTime = performance.now();
      const elapsed = performance.now() - entryTime;
      progressRef.current = clamp(elapsed / RAMP_MS, 0, 1);
    }

    if (reduce) {
      progressRef.current = 0.6;
      draw();
    } else {
      loop();
    }

    return () => {
      ro.disconnect();
      io.disconnect();
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [accent, scrollLength]);

  // ── AUTO-SCROLL after first nudge ───────────────────────────────
  // The rain runway is ~160 svh tall. Without help, the visitor has
  // to scroll the full runway themselves while staring at the rain.
  // This effect listens for the FIRST scroll-input gesture (wheel,
  // touchmove, keyboard arrow / page-down / space) inside the rain
  // section, then smoothly auto-scrolls the page past the runway in
  // ~1.4s via rAF. We then disconnect — it only fires once per page
  // load, so the visitor can freely scroll back up afterwards.
  useEffect(() => {
    if (!autoScrollAfterFirstNudge) return;
    const wrap = wrapRef.current;
    if (!wrap) return;
    if (typeof window === "undefined") return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // no auto-scroll for reduced-motion users

    let armed = false;          // section is in view → ready to fire
    let triggered = false;      // user nudged → animation started
    let rafId: number | null = null;

    const io = new IntersectionObserver(
      ([e]) => {
        // Arm only when the TOP of the section is at/above the
        // viewport top (i.e. the rain has just become the dominant
        // thing on screen). Using rootMargin of -10% top so we don't
        // arm prematurely while the previous section is still mostly
        // visible.
        armed = e.isIntersecting;
        if (!armed && !triggered) cancelPending();
      },
      { rootMargin: "-10% 0px -50% 0px", threshold: 0 }
    );
    io.observe(wrap);

    function cancelPending() {
      if (rafId != null) cancelAnimationFrame(rafId);
      rafId = null;
    }

    function easeInOutCubic(t: number) {
      return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function startAutoScroll() {
      triggered = true;
      const rect = wrap!.getBoundingClientRect();
      const pageY = window.scrollY || window.pageYOffset;
      // Target: bottom of the rain wrapper, minus a small overlap so
      // the next section's top edge enters view as we land.
      const targetY = pageY + rect.bottom - window.innerHeight + 8;
      const startY = pageY;
      const dist = targetY - startY;
      if (dist <= 0) return;
      const dur = Math.min(2200, Math.max(1100, dist * 0.9));
      const t0 = performance.now();

      function step(now: number) {
        const t = Math.min(1, (now - t0) / dur);
        const y = startY + dist * easeInOutCubic(t);
        window.scrollTo(0, y);
        if (t < 1) {
          rafId = requestAnimationFrame(step);
        } else {
          rafId = null;
        }
      }
      rafId = requestAnimationFrame(step);
    }

    // Two-phase state machine to avoid the "same-gesture cancel"
    // race the first version had. A physical wheel-spin or
    // touchmove emits MANY events — using "second event = cancel"
    // means the same gesture that started the auto-scroll
    // immediately cancels it.
    //
    // Phase 1 (armed=true, fired=false): listening for the first
    //   real input. On fire → start auto-scroll AND immediately
    //   detach the wheel/touchmove/keydown listeners so the rest of
    //   the gesture stream can't talk to us.
    //
    // Phase 2 (fired=true): the only thing that can cancel the
    //   auto-scroll is a pointerdown (a deliberate finger/mouse
    //   press) — that's a clear "I want control back" signal that
    //   no continuous gesture would emit.
    let fired = false;

    function detachInputListeners() {
      window.removeEventListener("wheel", onNudge);
      window.removeEventListener("touchmove", onNudge);
      window.removeEventListener("keydown", onKey);
    }

    function onNudge(ev: Event) {
      if (!armed || fired) return;
      // Ignore tiny zero-delta wheel events (some trackpads emit them).
      if (ev.type === "wheel") {
        const we = ev as WheelEvent;
        if (Math.abs(we.deltaY) < 2) return;
      }
      fired = true;
      detachInputListeners();
      startAutoScroll();
    }

    function onKey(ev: KeyboardEvent) {
      if (ev.key === "ArrowDown" || ev.key === "PageDown" || ev.key === " ") {
        onNudge(ev);
      }
    }

    function onPointerDown() {
      // Only fires post-trigger (an explicit press = "give me back
      // control"). After cancelling we keep the section alive so it
      // doesn't re-arm — auto-scroll is one-shot per page load.
      if (fired) {
        cancelPending();
        cleanup();
      }
    }

    function cleanup() {
      detachInputListeners();
      window.removeEventListener("pointerdown", onPointerDown);
      io.disconnect();
    }

    window.addEventListener("wheel", onNudge, { passive: true });
    window.addEventListener("touchmove", onNudge, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointerDown, { passive: true });

    return () => {
      cancelPending();
      cleanup();
    };
  }, [autoScrollAfterFirstNudge]);

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
