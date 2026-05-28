"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reveal v8 — mirrors SafeReveal v13's exact mechanism.
 *
 * v7 was broken: it did NOT call clearStyles() at the top of the
 * effect, and embedded the delay into the transition shorthand
 * rather than using a separate transitionDelay property. On iOS
 * Safari these two differences caused the CSS transition to silently
 * fail on certain compositor stacking contexts (inside ParallaxChapter's
 * `relative z-10` containment div), leaving elements permanently at
 * opacity:0.
 *
 * Fix: adopt SafeReveal v13's exact pattern verbatim:
 *   1. clearStyles() at top of every effect run — wipes any stale
 *      inline values from interrupted or re-run effects.
 *   2. transitionDelay as a separate CSS property — more reliable
 *      than embedding delay in the transition shorthand on iOS.
 *   3. duration in dependency array — re-triggers clearStyles() if
 *      the animation config ever changes on re-render.
 *
 * ParallaxBlock and Orb keep their framer-motion implementations.
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
    // This is the key fix over v7 — without this, a re-run can inherit
    // opacity:0 / transform from a previous priming and never escape it.
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

    // Already in view on mount — mark revealed and skip.
    const initialRect = el.getBoundingClientRect();
    if (initialRect.top < window.innerHeight) {
      revealed.add(el);
      return;
    }

    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.willChange = "opacity, transform";

    let triggered = false;

    const trigger = () => {
      if (triggered) return;
      triggered = true;
      revealed.add(el);

      el.style.transition = `opacity ${duration}s cubic-bezier(0.22,1,0.36,1), transform ${duration}s cubic-bezier(0.22,1,0.36,1)`;
      if (delay > 0) el.style.transitionDelay = `${delay}s`;

      // Double-rAF: first frame paints the primed state so the browser
      // registers the starting values; second frame clears them so the
      // browser fires the CSS transition from the primed values to natural.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.opacity = "";
          el.style.transform = "";
          window.setTimeout(clearStyles, (delay + duration) * 1000 + 200);
        });
      });
    };

    let active = true;
    let rafId = 0;

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
