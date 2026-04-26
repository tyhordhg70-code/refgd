"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Silly-Bunny-style custom cursor: a tiny dot that tracks the mouse,
 * trailed by a soft circular halo. Halo expands on hover over anything
 * interactive (links, buttons, [data-cursor]). Native cursor is hidden
 * via a body class only after we confirm we're on a fine-pointer device.
 */
export default function CustomCursor() {
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);
  const labelRef = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only on fine-pointer (mouse) devices, not touch.
    const mq = window.matchMedia("(pointer: fine)");
    if (!mq.matches) return;
    setEnabled(true);
    document.body.classList.add("cursor-none");

    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let rx = mx;
    let ry = my;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      mx = e.clientX;
      my = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mx}px, ${my}px, 0) translate(-50%, -50%)`;
      }
      if (labelRef.current) {
        labelRef.current.style.transform = `translate3d(${mx + 18}px, ${my + 18}px, 0)`;
      }
    };

    const tick = () => {
      rx += (mx - rx) * 0.18;
      ry += (my - ry) * 0.18;
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${rx}px, ${ry}px, 0) translate(-50%, -50%)`;
      }
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
  }, []);

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
