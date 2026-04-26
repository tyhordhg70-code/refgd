"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Custom cursor — silly-bunny inspired. A bright halo + dot tracks the
 * pointer. The halo expands and tints when over interactive content.
 * Only enabled on fine-pointer (mouse) devices; on touch we leave the
 * native cursor behaviour alone.
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

  // Set up tracking + listeners only after the divs have mounted (so refs
  // are available). This effect runs after `enabled` flips true.
  useEffect(() => {
    if (!enabled) return;
    document.body.classList.add("cursor-none");

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;

    // Initial position so it's visible before the first mouse move.
    if (dotRef.current) {
      dotRef.current.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      dotRef.current.style.opacity = "1";
    }
    if (ringRef.current) {
      ringRef.current.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      ringRef.current.style.opacity = "1";
    }

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      const d = dotRef.current;
      if (d) d.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      const lbl = labelRef.current;
      if (lbl) lbl.style.transform = `translate3d(${mx + 18}px, ${my + 18}px, 0)`;
    };

    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      const r = ringRef.current;
      if (r) r.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const setHover = (kind: string | null, label?: string) => {
      const ring = ringRef.current;
      const lbl = labelRef.current;
      if (!ring) return;
      if (kind) ring.dataset.hover = kind;
      else delete ring.dataset.hover;
      if (lbl) lbl.textContent = label || "";
    };

    const onOver = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
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
