"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reveal (keyframes edition)
 *
 * Uses a CSS @keyframes animation with animation-fill-mode:both instead
 * of a CSS transition. Animations are compositor-native: the from→to
 * states are declared in keyframes and tracked by the compositor as a
 * first-class lifecycle. fill-mode:both holds the `to` state forever
 * after completion, so the iOS Safari GPU compositor cannot revert to
 * a cached opacity:0 layer — the animation's terminal frame is the
 * authoritative source of truth, not the CSS cascade.
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
    ensureKeyframes();
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    // Shared WeakSet with SafeReveal — once shown, always shown.
    const revealed: WeakSet<Element> =
      (window as any).__safeRevealed ??
      ((window as any).__safeRevealed = new WeakSet());
    if (revealed.has(el)) return;

    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      revealed.add(el);
      return;
    }

    const initialRect = el.getBoundingClientRect();
    if (initialRect.top < window.innerHeight) {
      revealed.add(el);
      return;
    }

    // Prime invisible inline (animation will override once triggered).
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";

    let triggered = false;
    let active = true;
    let rafId = 0;

    const trigger = () => {
      if (triggered) return;
      triggered = true;
      revealed.add(el);

      // CSS @keyframes animation with fill-mode:both — compositor holds
      // the `to` state (opacity:1, transform:none) permanently. The iOS
      // GPU layer cache cannot show opacity:0 because the animation's
      // terminal frame is authoritative.
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

// ─── ParallaxBlock ──────────────────────────────────────────────────────────
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

// ─── Orb ────────────────────────────────────────────────────────────────────
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
