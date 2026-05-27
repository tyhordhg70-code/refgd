"use client";
import {
  useEffect,
  useRef,
  type ReactNode,
  type CSSProperties,
} from "react";

export type RevealKind =
  | "lift"
  | "slideLeft"
  | "slideRight"
  | "fan"
  | "fanLeft"
  | "fanRight"
  | "scale"
  | "wipe"
  | "flip3d"
  | "swingIn"
  | "swingInR"
  | "riseDep"
  | "tiltDown"
  | "twist";

/**
 * SafeReveal v12 — rAF-poll scroll detection (Lenis-safe).
 *
 * All previous versions relied on IntersectionObserver and/or a capture-
 * phase window scroll listener. Neither fires reliably with Lenis:
 *   - IntersectionObserver uses pre-transform layout positions; Lenis scrolls
 *     via CSS transform so elements are "always intersecting" or "never".
 *   - Lenis does not dispatch native scroll events on window.
 * (TrailerTitle3D already documents this: "Lenis broke whileInView's IO".)
 *
 * v12 replaces both with a requestAnimationFrame polling loop that calls
 * getBoundingClientRect() each frame. getBoundingClientRect() returns the
 * VISUAL (post-transform) position — exactly what Lenis shifts around.
 * The loop runs only while the element is unresolved and cancels itself
 * the moment trigger fires or cleanup runs.
 *
 * The second bug fixed here: the double-rAF inside trigger() had
 * `if (!mounted) return` guards. If the useEffect cleanup fired between
 * the two rAF callbacks (dep-array change from admin context loading),
 * mounted became false and the second rAF bailed without clearing opacity/
 * transform — leaving the element permanently invisible. Removed the mounted
 * flag entirely from trigger's inner rAF; a triggered animation always
 * completes (clearing styles on an already-detached element is a safe no-op).
 */
export default function SafeReveal({
  children,
  className = "",
  style,
  delay = 0,
  kind = "lift",
  duration = 0.95,
  as: Tag = "div",
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay?: number;
  kind?: RevealKind;
  amount?: number;
  duration?: number;
  as?: "div" | "section" | "article" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    // Persistent reveal guard — once shown, always shown.
    const revealed: WeakSet<Element> =
      (window as any).__safeRevealed ??
      ((window as any).__safeRevealed = new WeakSet());
    if (revealed.has(el)) return;

    // Always wipe stale inline styles from any previous interrupted run.
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

    // If already in view on mount, mark revealed and skip animation.
    const initialRect = el.getBoundingClientRect();
    if (initialRect.top < window.innerHeight && initialRect.bottom > 0) {
      revealed.add(el);
      return;
    }

    const fromTransform =
      kind === "flip3d"     ? "perspective(700px) rotateX(18deg) translateY(40px)"   :
      kind === "swingIn"    ? "perspective(600px) rotateY(-22deg) translateX(-35px)"  :
      kind === "swingInR"   ? "perspective(600px) rotateY(22deg) translateX(35px)"   :
      kind === "riseDep"    ? "perspective(800px) scale(0.78) translateY(18px)"      :
      kind === "tiltDown"   ? "perspective(600px) rotateX(-25deg) translateY(-35px)"  :
      kind === "twist"      ? "perspective(700px) rotateZ(-12deg) rotateX(10deg) scale(0.80)" :
      kind === "fanLeft"    ? "perspective(500px) rotateY(-20deg) translateX(-40px)"  :
      kind === "fan"        ? "perspective(500px) scale(0.78) translateY(35px)"       :
      kind === "fanRight"   ? "perspective(500px) rotateY(20deg) translateX(40px)"   :
      kind === "slideLeft"  ? "translateX(-20px)"                                     :
      kind === "slideRight" ? "translateX(20px)"                                      :
      "translateY(20px)";

    el.style.opacity = "0";
    el.style.transform = fromTransform;
    el.style.willChange = "opacity, transform";

    let triggered = false;

    const trigger = () => {
      if (triggered) return;
      triggered = true;
      revealed.add(el);

      el.style.transition = `opacity ${duration}s cubic-bezier(0.22,1,0.36,1), transform ${duration}s cubic-bezier(0.22,1,0.36,1)`;
      if (delay > 0) el.style.transitionDelay = `${delay}s`;

      // Double-rAF: first frame paints primed state; second frame clears it
      // so the browser sees a genuine from→to delta and fires the transition.
      // No mounted guard — a triggered animation always completes.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.opacity = "";
          el.style.transform = "";
          window.setTimeout(clearStyles, (delay + duration) * 1000 + 200);
        });
      });
    };

    // Safety: fire after 3 s in case polling misses the element somehow.
    const safety = window.setTimeout(trigger, 3000);

    // rAF poll — checks visual (post-Lenis-transform) position every frame.
    // Much cheaper than it sounds: getBoundingClientRect is cached per-frame
    // by the browser; no forced synchronous layouts.
    let active = true;
    let rafId = 0;

    const poll = () => {
      if (!active) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
        trigger();
        window.clearTimeout(safety);
      } else {
        rafId = requestAnimationFrame(poll);
      }
    };
    rafId = requestAnimationFrame(poll);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      window.clearTimeout(safety);
      // If trigger never fired, reset styles so the next effect run starts clean.
      if (!triggered) clearStyles();
    };
  }, [kind, duration, delay]);

  const Comp = Tag as any;
  return (
    <Comp ref={ref} className={className} style={style}>
      {children}
    </Comp>
  );
}
