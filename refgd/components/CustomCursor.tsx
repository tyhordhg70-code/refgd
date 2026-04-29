"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Custom cursor — bright halo + dot tracks the pointer with a snappy
 * ring follow-through. Only enabled on fine-pointer (mouse) devices.
 *
 *   – Dot tracks the cursor 1:1 (no smoothing).
 *   – Ring eases toward the dot at a high follow factor.
 *   – Animation uses transform-only (compositor-fast).
 *   – On touch devices we render nothing.
 *
 * ── Idle the rAF loop when the ring has caught up ─────────────────
 *
 * The previous version ran a rAF tick on EVERY frame the page was
 * mounted, even while the user was just scrolling and the cursor
 * was stationary. That's a ~16ms slot of main-thread work per frame
 * spent doing absolutely nothing visible. On a page with WebGL,
 * fixed overlays and ~10 framer-motion `useScroll` subscriptions,
 * that one extra frame budget really mattered.
 *
 * The rewrite stops the rAF as soon as the ring is within 0.4 px of
 * the dot AND the cursor hasn't moved. Any subsequent `mousemove`
 * restarts it, lets it run until the ring catches up, then idles
 * again. Net effect: the rAF loop only runs while the ring is
 * actually animating — typically <100 ms per pointer motion — and
 * scroll frames get their full main-thread budget back.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(pointer: fine)");
    if (!mq.matches) return;
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    document.body.classList.add("cursor-none");

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;
    let running = false;

    if (dotRef.current) {
      dotRef.current.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      dotRef.current.style.opacity = "1";
    }
    if (ringRef.current) {
      ringRef.current.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      ringRef.current.style.opacity = "1";
    }

    const startLoop = () => {
      if (running) return;
      running = true;
      raf = requestAnimationFrame(tick);
    };

    const tick = () => {
      rx += (mx - rx) * 0.35;
      ry += (my - ry) * 0.35;
      const r = ringRef.current;
      if (r) {
        r.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      }
      // Idle as soon as we're close enough to the cursor that further
      // frames would be visually indistinguishable. This frees the
      // main thread until the next mousemove restarts the loop.
      if (Math.abs(mx - rx) < 0.4 && Math.abs(my - ry) < 0.4) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      const d = dotRef.current;
      if (d) d.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      const lbl = labelRef.current;
      if (lbl) lbl.style.transform = `translate3d(${mx + 18}px, ${my + 18}px, 0)`;
      startLoop();
    };

    // Hover detection — rate-limited via rAF so even a fast mouse
    // dragging across the page doesn't fire `closest()` 1000+ times
    // per second. The browser already coalesces events in modern
    // engines but this is belt-and-braces.
    let hoverScheduled = false;
    let lastHoverTarget: HTMLElement | null = null;
    const setHover = (kind: string | null, label?: string) => {
      const ring = ringRef.current;
      const lbl = labelRef.current;
      if (!ring) return;
      if (kind) ring.dataset.hover = kind;
      else delete ring.dataset.hover;
      if (lbl) lbl.textContent = label || "";
    };
    const checkHover = () => {
      hoverScheduled = false;
      const t = lastHoverTarget;
      if (!t || !t.closest) return;
      const cursorEl = t.closest<HTMLElement>("[data-cursor]");
      if (cursorEl) {
        setHover(cursorEl.dataset.cursor || "hover", cursorEl.dataset.cursorLabel);
        return;
      }
      const a = t.closest("a, button, [role=button], input, textarea, select, summary");
      if (a) setHover("link");
      else setHover(null);
    };
    const onOver = (e: MouseEvent) => {
      lastHoverTarget = e.target as HTMLElement | null;
      if (hoverScheduled) return;
      hoverScheduled = true;
      requestAnimationFrame(checkHover);
    };

    const onDown = () => { ringRef.current?.classList.add("is-down"); };
    const onUp = () => { ringRef.current?.classList.remove("is-down"); };
    const onLeave = () => {
      if (dotRef.current) dotRef.current.style.opacity = "0";
      if (ringRef.current) ringRef.current.style.opacity = "0";
    };
    const onEnter = () => {
      if (dotRef.current) dotRef.current.style.opacity = "1";
      if (ringRef.current) ringRef.current.style.opacity = "1";
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.body.classList.remove("cursor-none");
    };
  }, [enabled]);

  if (!enabled) return null;
  return (
    <>
      <div
        ref={ringRef}
        aria-hidden="true"
        className="custom-cursor-ring"
      />
      <div ref={dotRef} aria-hidden="true" className="custom-cursor-dot" />
      <div ref={labelRef} aria-hidden="true" className="custom-cursor-label" />
    </>
  );
}
