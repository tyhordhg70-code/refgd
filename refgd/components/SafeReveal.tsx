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
 * SafeReveal v15
 *
 * FIX for "tap to reappear" / iOS compositor cache bug:
 *
 *   When clearStyles() sets el.style.opacity = "" iOS Safari's GPU
 *   compositor ignores the CSS cascade and keeps its cached layer at
 *   opacity:0 — the element stays visually blank. Tapping the element
 *   forces a repaint which flushes the cache and shows the correct value.
 *
 *   Root cause: the compositor uses the inline style value to decide
 *   what to cache. When inline opacity is REMOVED, the compositor falls
 *   back to... nothing, and keeps the previous cached composited value.
 *
 *   Fix: NEVER remove the inline opacity after trigger. clearStyles()
 *   now leaves opacity:"1" permanently on the element. A permanent
 *   inline style is authoritative — the compositor cannot ignore it and
 *   cannot revert to a cached opacity:0 layer.
 *
 *   will-change restored (v14 removed it which broke the transition for
 *   elements inside animated parent layers, e.g. ParallaxChapter).
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

    // Wipe stale styles. NOTE: sets opacity:"1" not "" — see fix note above.
    const clearStyles = () => {
      el.style.opacity = "1";
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

    const fromTransform =
      kind === "flip3d"     ? "perspective(700px) rotateX(18deg) translateY(40px)"    :
      kind === "swingIn"    ? "perspective(600px) rotateY(-22deg) translateX(-35px)"   :
      kind === "swingInR"   ? "perspective(600px) rotateY(22deg) translateX(35px)"    :
      kind === "riseDep"    ? "perspective(800px) scale(0.78) translateY(18px)"       :
      kind === "tiltDown"   ? "perspective(600px) rotateX(-25deg) translateY(-35px)"   :
      kind === "twist"      ? "perspective(700px) rotateZ(-12deg) rotateX(10deg) scale(0.80)" :
      kind === "fanLeft"    ? "perspective(500px) rotateY(-20deg) translateX(-40px)"   :
      kind === "fan"        ? "perspective(500px) scale(0.78) translateY(35px)"        :
      kind === "fanRight"   ? "perspective(500px) rotateY(20deg) translateX(40px)"    :
      kind === "slideLeft"  ? "translateX(-20px)"                                      :
      kind === "slideRight" ? "translateX(20px)"                                       :
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

      // Double-rAF: first frame registers primed state; second frame sets
      // explicit target values. opacity:"1" (not "") so the iOS compositor
      // receives an authoritative value and cannot revert to cached opacity:0.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.opacity = "1";
          el.style.transform = "";
          // clearStyles fires after transition completes. It keeps opacity:"1"
          // permanently so the iOS GPU layer is never left at a stale value.
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
  }, [kind, duration, delay]);

  const Comp = Tag as any;
  return (
    <Comp ref={ref} className={className} style={style}>
      {children}
    </Comp>
  );
}
