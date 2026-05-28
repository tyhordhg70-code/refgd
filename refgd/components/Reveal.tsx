"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reveal (touch-safe edition)
 *
 * Three previous mechanisms (CSS transition, inline opacity:1 forever,
 * CSS @keyframes + fill-mode:both) all failed on iOS Safari due to a
 * GPU compositor cache that cannot be flushed by any declarative
 * state change. Tap-to-reappear confirms the issue.
 *
 * This version disables the reveal animation entirely on touch devices
 * (iOS, Android, etc) and just renders children at their natural
 * visible state. Desktop browsers still get the keyframes animation.
 *
 * Trade-off: mobile users lose the fade-up animation, but elements
 * never vanish on rescroll.
 */
function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById("rv-keyframes")) return;
  const s = document.createElement("style");
  s.id = "rv-keyframes";
  s.textContent =
    "@keyframes rv-lift{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}";
  document.head.appendChild(s);
}

function isTouchDevice() {
  if (typeof window === "undefined") return false;
  if (typeof window.matchMedia !== "function") return false;
  // (hover: none) matches devices without precise hover — i.e. touch.
  return window.matchMedia("(hover: none)").matches;
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
  const duration = 0.52;

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    const revealed: WeakSet<Element> =
      (window as any).__safeRevealed ??
      ((window as any).__safeRevealed = new WeakSet());
    if (revealed.has(el)) return;

    // Touch devices: skip animation entirely. Element renders at
    // natural visible state. No priming, no animation, no vanish bug.
    if (isTouchDevice()) {
      revealed.add(el);
      return;
    }

    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      revealed.add(el);
      return;
    }

    ensureKeyframes();

    const initialRect = el.getBoundingClientRect();
    if (initialRect.top < window.innerHeight) {
      revealed.add(el);
      return;
    }

    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";

    let triggered = false;
    let active = true;
    let rafId = 0;

    const trigger = () => {
      if (triggered) return;
      triggered = true;
      revealed.add(el);
      el.style.animation = `rv-lift ${duration}s cubic-bezier(0.22,1,0.36,1) ${delay}s both`;
      el.style.opacity = "";
      el.style.transform = "";
    };

    const poll = () => {
      if (!active) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) {
        trigger();
      } else {
        rafId = requestAnimationFrame(poll);
      }
    };
    rafId = requestAnimationFrame(poll);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      if (!triggered) {
        el.style.opacity = "";
        el.style.transform = "";
      }
    };
  }, [delay, duration]);

  return (
    <div ref={ref} className={className}>
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
