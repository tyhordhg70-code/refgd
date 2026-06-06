"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Custom cursor — bright halo + dot tracks the pointer with a snappy
 * ring follow-through. Only enabled on fine-pointer (mouse) devices.
 *
 *   – Dot eases toward the cursor with LIGHT damping (alpha 0.7): it
 *     catches up in ~2 frames, so a dropped compositor frame reads as a
 *     tiny ease instead of a visible stutter. Subtle enough that it still
 *     sits essentially on the pointer.
 *   – Ring eases toward the cursor at a softer follow factor.
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
  const layerRef = useRef<HTMLDivElement | null>(null);
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

  // Promote the cursor into the browser top layer via the Popover API so it
  // always paints above 3D-transformed (preserve-3d / perspective) sections —
  // those otherwise cover a plain position:fixed overlay regardless of
  // z-index, making the cursor vanish behind cards in admin edit mode. The
  // top layer ignores those stacking quirks. No-ops where unsupported.
  useEffect(() => {
    if (!enabled) return;
    const el = layerRef.current as (HTMLDivElement & {
      showPopover?: () => void;
      hidePopover?: () => void;
    }) | null;
    if (!el || typeof el.showPopover !== "function") return;
    try {
      el.setAttribute("popover", "manual");
      el.showPopover();
    } catch {
      /* ignore — falls back to plain fixed positioning */
    }
    return () => {
      try {
        if (el.matches?.(":popover-open")) el.hidePopover?.();
      } catch {
        /* noop */
      }
    };
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    document.body.classList.add("cursor-none");

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    // Eased dot position (chases the raw pointer mx/my with light damping).
    let dx = mx;
    let dy = my;
    let raf = 0;
    let running = false;
    // The dot is snapped straight to the pointer on the very first move so it
    // never visibly catches up from screen-center; damping applies afterwards.
    let seeded = false;

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
      // Light damping on the dot (alpha 0.7) — chases the raw pointer so a
      // skipped compositor frame eases instead of jumping. The ring trails
      // more softly behind it as before.
      dx += (mx - dx) * 0.7;
      dy += (my - dy) * 0.7;
      const d = dotRef.current;
      if (d) {
        d.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
      }
      rx += (mx - rx) * 0.35;
      ry += (my - ry) * 0.35;
      const r = ringRef.current;
      if (r) {
        r.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      }
      // Idle as soon as BOTH dot and ring are close enough to the cursor that
      // further frames would be visually indistinguishable. This frees the
      // main thread until the next mousemove restarts the loop.
      if (
        Math.abs(mx - rx) < 0.4 &&
        Math.abs(my - ry) < 0.4 &&
        Math.abs(mx - dx) < 0.4 &&
        Math.abs(my - dy) < 0.4
      ) {
        running = false;
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const onMove = (e: MouseEvent | PointerEvent) => {
      // Only update the TARGET; the eased dot/ring positions are written in
      // tick() so the damping curve applies (see above).
      mx = e.clientX;
      my = e.clientY;
      if (!seeded) {
        // First pointer event: snap the eased dot exactly onto the pointer and
        // paint it now, so it doesn't sweep in from screen-center. Every move
        // after this one goes through the normal damping curve in tick().
        seeded = true;
        dx = mx;
        dy = my;
        const d0 = dotRef.current;
        if (d0)
          d0.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
      }
      const lbl = labelRef.current;
      if (lbl) lbl.style.transform = `translate3d(${mx + 18}px, ${my + 18}px, 0)`;
      startLoop();
    };

    // Prefer `pointerrawupdate` when available — it delivers raw,
    // un-coalesced pointer samples at the highest rate the hardware
    // provides (before the browser batches them into `mousemove`),
    // which trims input latency so the dot sits as close to the real
    // pointer as a drawn cursor can. Falls back to `mousemove`.
    const moveEvent =
      typeof window !== "undefined" && "onpointerrawupdate" in window
        ? "pointerrawupdate"
        : "mousemove";

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

    window.addEventListener(moveEvent, onMove as EventListener, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(moveEvent, onMove as EventListener);
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
    <div ref={layerRef} aria-hidden="true" className="custom-cursor-layer">
      <div
        ref={ringRef}
        aria-hidden="true"
        className="custom-cursor-ring"
      />
      <div ref={dotRef} aria-hidden="true" className="custom-cursor-dot" />
      <div ref={labelRef} aria-hidden="true" className="custom-cursor-label" />
    </div>
  );
}
