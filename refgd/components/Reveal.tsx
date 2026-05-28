"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reveal (glass-card-reveal pattern — iOS-eviction-safe).
 *
 * Adopts the same pattern proven on .glass-card-reveal in globals.css
 * to defeat the iOS Safari "compositing-memory pressure animation
 * eviction" bug. Three earlier approaches (CSS transition, keyframes
 * + fill-mode:both, IntersectionObserver replay) all failed because
 * when iOS evicts the animation, the element falls back to its CSS
 * cascade — and if the base style doesn't EXPLICITLY declare
 * opacity:1 / transform:none, the previously-applied FROM keyframe
 * state (opacity:0, transform:translateY(...)) lingers.
 *
 * Strategy:
 *   • `.rv-base` always present — declares opacity:1 / transform:none
 *     so iOS-evicted animations fall back to a visible state.
 *   • `.rv-pending` applied if element is off-screen on mount — sets
 *     opacity:0 so the element doesn't flash before IO triggers.
 *   • On IntersectionObserver fire, swap `.rv-pending` → `.rv-go`.
 *   • `.rv-go` uses `animation-fill-mode: backwards` — holds `from`
 *     during delay, animates, then DROPS the state on completion so
 *     the visible base CSS takes over.
 */

function ensureCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("rv-css")) return;
  const s = document.createElement("style");
  s.id = "rv-css";
  s.textContent = `
.rv-base{opacity:1;transform:none}
.rv-pending{opacity:0;transform:translate3d(0,20px,0)}
@keyframes rv-lift{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
.rv-go{animation:rv-lift 0.52s cubic-bezier(0.22,1,0.36,1) backwards}
@media (prefers-reduced-motion: reduce){
  .rv-pending{opacity:1;transform:none}
  .rv-go{animation:none}
}`;
  document.head.appendChild(s);
}

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ensureCSS();
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    const done: WeakSet<Element> =
      (window as any).__rvDone ??
      ((window as any).__rvDone = new WeakSet());
    if (done.has(el)) return;

    const initialRect = el.getBoundingClientRect();
    const inViewOnMount =
      initialRect.top < window.innerHeight && initialRect.bottom > 0;

    if (inViewOnMount) {
      // Already visible — no animation, base CSS keeps it visible.
      done.add(el);
      return;
    }

    el.classList.add("rv-pending");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            done.add(el);
            if (delay > 0) el.style.animationDelay = `${delay}s`;
            el.classList.remove("rv-pending");
            el.classList.add("rv-go");
            observer.disconnect();
          }
        }
      },
      { threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={`rv-base ${className}`}>
      {children}
    </div>
  );
}

export function ParallaxBlock({
  children,
  amount = 60,
  className = "",
}: {
  children: ReactNode;
  amount?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? {} : { y: amount * 0.6 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ type: "spring", stiffness: 60, damping: 20 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Orb({
  color,
  size = 320,
  className = "",
}: {
  color: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      style={{ width: size, height: size, background: color }}
      className={`absolute rounded-full blur-3xl ${className}`}
    />
  );
}
