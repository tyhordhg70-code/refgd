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
 * SafeReveal v14
 *
 * FIX for "vanish on rescroll" (iOS Safari compositor cache bug):
 *   Setting el.style.opacity = "" removes the inline style and lets
 *   the CSS cascade supply opacity:1. On iOS Safari the GPU compositor
 *   caches the element at opacity:0 and does NOT re-query the cascade
 *   when the inline style is removed — the visual stays at 0 forever.
 *
 *   Fix: set el.style.opacity = "1" and el.style.transform = "none"
 *   EXPLICITLY so the compositor receives an unambiguous value-changed
 *   signal and recomposites the layer.
 *
 *   Also removed will-change from priming. globals.css comment (line
 *   ~1976) documents that too many will-change'd layers causes iOS to
 *   evict/drop running transitions entirely, leaving elements at their
 *   from-state (opacity:0). Without will-change the transition runs on
 *   the CPU rasteriser — slightly less smooth but 100% reliable.
 *
 * Everything else from v13 preserved:
 *   - clearStyles() at top of every effect run
 *   - rAF poll (no safety timer)
 *   - shared __safeRevealed WeakSet
 *   - cleanup resets styles only if trigger never fired
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

    // No will-change: omitting it prevents iOS from promoting this element
    // to a dedicated GPU layer. Too many will-change layers causes iOS to
    // drop transitions entirely (documented in globals.css ~line 1976).
    el.style.opacity = "0";
    el.style.transform = fromTransform;

    let triggered = false;

    const trigger = () => {
      if (triggered) return;
      triggered = true;
      revealed.add(el);

      el.style.transition = `opacity ${duration}s cubic-bezier(0.22,1,0.36,1), transform ${duration}s cubic-bezier(0.22,1,0.36,1)`;
      if (delay > 0) el.style.transitionDelay = `${delay}s`;

      // Double-rAF: first frame paints the primed state; second frame
      // sets EXPLICIT target values so the iOS GPU compositor receives
      // an unambiguous value-changed signal (setting "" relies on the
      // CSS cascade which iOS ignores when it has a cached GPU layer).
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.opacity = "1";
          el.style.transform = "none";
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
