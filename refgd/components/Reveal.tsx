"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reveal v9 — applies the same iOS compositor fix as SafeReveal v14.
 *
 * Root cause of "vanish on rescroll":
 *   iOS Safari caches the element's GPU layer at opacity:0. When we
 *   set el.style.opacity = "" the inline style is removed but the GPU
 *   compositor does NOT re-query the CSS cascade — it reuses its cached
 *   opacity:0. The element stays blank.
 *
 *   Fix: set el.style.opacity = "1" and el.style.transform = "none"
 *   explicitly. An explicit value change forces the compositor to update.
 *
 *   Also dropped will-change from priming (globals.css ~1976 documents
 *   that too many will-change layers causes iOS to evict transitions,
 *   leaving elements at opacity:0 permanently).
 */
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

    // Shared WeakSet with SafeReveal — once shown, always shown.
    const revealed: WeakSet<Element> =
      (window as any).__safeRevealed ??
      ((window as any).__safeRevealed = new WeakSet());
    if (revealed.has(el)) return;

    // Wipe any stale inline styles from a previous interrupted run.
    const clearStyles = () => {
      el.style.opacity = "";
      el.style.transform = "";
      el.style.transition = "";
      el.style.transitionDelay = "";
      el.style.willChange = "";
    };
    clearStyles();

    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      revealed.add(el);
      return;
    }

    // Already in view on mount — skip.
    const initialRect = el.getBoundingClientRect();
    if (initialRect.top < window.innerHeight) {
      revealed.add(el);
      return;
    }

    // No will-change — prevents iOS layer-budget exhaustion.
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";

    let triggered = false;
    let active = true;
    let rafId = 0;

    const trigger = () => {
      if (triggered) return;
      triggered = true;
      revealed.add(el);

      el.style.transition = `opacity ${duration}s cubic-bezier(0.22,1,0.36,1), transform ${duration}s cubic-bezier(0.22,1,0.36,1)`;
      if (delay > 0) el.style.transitionDelay = `${delay}s`;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Explicit "1" and "none" — force the iOS GPU compositor to update
          // its cached layer values (removing inline styles is insufficient).
          el.style.opacity = "1";
          el.style.transform = "none";
          window.setTimeout(clearStyles, (delay + duration) * 1000 + 200);
        });
      });
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
      if (!triggered) clearStyles();
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
