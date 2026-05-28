"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reveal v7 — rAF poll + CSS transitions (same engine as SafeReveal v13).
 *
 * WHY framer-motion whileInView was dropped for the Reveal function:
 *   1. initial={{ y: 36 }} displaced wrapped content DOWN 36 px.
 *      On mobile, buttons at the bottom of tall CTA cards were pushed below
 *      the viewport fold until the 0.52 s animation completed — this read
 *      as "buttons don't show on first scroll".
 *   2. Nested Reveal instances compounded: outer 36 px + inner 36 px = 72 px,
 *      pushing mid-card paragraphs off-screen ("With our exclusive service"
 *      paragraph). The 0.2 s delay on the inner Reveal meant it lagged behind
 *      the outer, briefly hiding the text on every rescroll.
 *   3. framer-motion v11 viewport:{ once:true } has an iOS WebKit race where
 *      elements briefly snap back to initial on scroll-out then refuse to
 *      re-trigger (once:true prevents it), leaving them permanently hidden
 *      after the first rescroll — exact "vanishes on rescroll" symptom.
 *
 * FIX: rAF poll fires when el.getBoundingClientRect().top < window.innerHeight
 * (same as SafeReveal). Opacity + 12 px lift replaces the 36 px displacement.
 * Shared WeakSet (__safeRevealed) means a once-triggered element can never
 * reset even if the component re-renders or React StrictMode double-invokes.
 *
 * ParallaxBlock and Orb still use framer-motion — they are not scroll-reveal
 * components, they are layout/decoration utilities.
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

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    // Shared WeakSet with SafeReveal — once shown, always shown,
    // even if the component re-mounts.
    const set: WeakSet<Element> =
      (window as any).__safeRevealed ??
      ((window as any).__safeRevealed = new WeakSet());
    if (set.has(el)) return;

    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      set.add(el);
      return;
    }

    // Already in view on mount — mark visible, skip animation.
    const initialRect = el.getBoundingClientRect();
    if (initialRect.top < window.innerHeight) {
      set.add(el);
      return;
    }

    // Prime the hidden state — 12 px lift, opacity 0.
    el.style.opacity = "0";
    el.style.transform = "translateY(12px)";
    el.style.willChange = "opacity, transform";

    let triggered = false;
    let active = true;
    let rafId = 0;

    const trigger = () => {
      if (triggered) return;
      triggered = true;
      set.add(el);

      const delayStr = delay > 0 ? `${delay}s ` : "";
      el.style.transition =
        `opacity 0.52s ${delayStr}cubic-bezier(0.22,1,0.36,1), ` +
        `transform 0.52s ${delayStr}cubic-bezier(0.22,1,0.36,1)`;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.opacity = "";
          el.style.transform = "";
          window.setTimeout(() => {
            el.style.transition = "";
            el.style.willChange = "";
          }, (delay + 0.52) * 1000 + 200);
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
      if (!triggered) {
        // Never triggered — element never entered viewport. Clean up primed state.
        el.style.opacity = "";
        el.style.transform = "";
        el.style.transition = "";
        el.style.willChange = "";
      }
      // If triggered: animation is underway or complete — do NOT reset.
    };
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

/** Block that lifts into place on viewport entry. */
export function ParallaxBlock({
  children,
  amount = 60,
  className = "",
}: { children: ReactNode; amount?: number; className?: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? {} : { y: amount * 0.6 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ duration: reduced ? 0 : 0.9, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: "relative" }}
      suppressHydrationWarning
      className={className}
    >
      {children}
    </motion.div>
  );
}

/** Simple gradient orb for backgrounds */
export function Orb({
  className = "",
  color = "rgba(245,185,69,0.35)",
}: { className?: string; color?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`absolute rounded-full blur-3xl ${className}`}
      style={{ background: color }}
    />
  );
}
