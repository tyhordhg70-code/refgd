"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Reveal — bulletproof CSS-transition reveal.
 *
 * Six prior approaches using CSS @keyframes (with various fill-modes,
 * IntersectionObserver replay, classList mutation, React-state
 * className, etc.) all suffered the same fundamental iOS Safari bug:
 * under GPU compositing-memory pressure (preserve-3d ancestors +
 * many will-change layers), iOS evicts the animation property and
 * the element falls back to whatever CSS cascade resolves — which
 * was unreliable across re-renders and parent transforms.
 *
 * This version uses CSS TRANSITIONS instead of @keyframes:
 *   • The element's natural state is visible (opacity:1, transform:none).
 *   • A `.rv-hidden` class overrides to opacity:0 / transform:translateY.
 *   • Removing `.rv-hidden` causes the browser to transition to the
 *     natural state. After the transition completes, the element has
 *     no animation property — it's just sitting in its declared CSS
 *     state. iOS Safari has nothing to evict, nothing to cache wrong.
 *   • If anything goes wrong (eviction, re-render, etc.), the worst
 *     possible outcome is the element snaps to its visible natural
 *     state. It cannot vanish.
 */
function ensureCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("rv-css")) return;
  const s = document.createElement("style");
  s.id = "rv-css";
  s.textContent = `
.rv{opacity:1;transform:none;transition:opacity 0.55s cubic-bezier(0.22,1,0.36,1),transform 0.55s cubic-bezier(0.22,1,0.36,1)}
.rv.rv-hidden{opacity:0;transform:translate3d(0,20px,0)}
@media (prefers-reduced-motion: reduce){
  .rv{transition:none}
  .rv.rv-hidden{opacity:1;transform:none}
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
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    ensureCSS();
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    const r = el.getBoundingClientRect();
    if (r.top < (window.innerHeight || 0) * 0.95 && r.bottom > 0) {
      requestAnimationFrame(() => setRevealed(true));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`rv ${revealed ? "" : "rv-hidden"} ${className}`}
      style={{ transitionDelay: delay ? `${delay}s` : undefined }}
    >
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
