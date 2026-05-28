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
 * SafeReveal (keyframes edition)
 *
 * iOS Safari GPU compositor caches stale opacity:0 layers when reveals
 * use CSS transitions on inline-style changes. Inline opacity="1" /
 * will-change tweaks could not break the cache.
 *
 * This version uses CSS @keyframes animations with animation-fill-mode:
 * both. Animations are compositor-native — the from→to states are
 * declared up front and the compositor tracks the animation lifecycle.
 * fill-mode:both means the element is held at the `from` state during
 * any delay, and held at the `to` state forever after completion. The
 * compositor cannot revert because the animation's terminal frame is
 * the authoritative source of truth, not the CSS cascade.
 *
 * Result: once the animation starts, the element is permanently visible.
 * No tap-to-reappear bug, no rescroll vanish.
 */

const KINDS: RevealKind[] = [
  "lift",
  "slideLeft",
  "slideRight",
  "fan",
  "fanLeft",
  "fanRight",
  "scale",
  "wipe",
  "flip3d",
  "swingIn",
  "swingInR",
  "riseDep",
  "tiltDown",
  "twist",
];

function fromTransformFor(kind: RevealKind): string {
  switch (kind) {
    case "flip3d":     return "perspective(700px) rotateX(18deg) translateY(40px)";
    case "swingIn":    return "perspective(600px) rotateY(-22deg) translateX(-35px)";
    case "swingInR":   return "perspective(600px) rotateY(22deg) translateX(35px)";
    case "riseDep":    return "perspective(800px) scale(0.78) translateY(18px)";
    case "tiltDown":   return "perspective(600px) rotateX(-25deg) translateY(-35px)";
    case "twist":      return "perspective(700px) rotateZ(-12deg) rotateX(10deg) scale(0.80)";
    case "fanLeft":    return "perspective(500px) rotateY(-20deg) translateX(-40px)";
    case "fan":        return "perspective(500px) scale(0.78) translateY(35px)";
    case "fanRight":   return "perspective(500px) rotateY(20deg) translateX(40px)";
    case "slideLeft":  return "translateX(-20px)";
    case "slideRight": return "translateX(20px)";
    case "scale":      return "scale(0.85)";
    case "wipe":       return "translateY(20px)";
    case "lift":
    default:           return "translateY(20px)";
  }
}

function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById("sr-keyframes")) return;
  const style = document.createElement("style");
  style.id = "sr-keyframes";
  style.textContent = KINDS.map(
    (k) => `@keyframes sr-${k}{from{opacity:0;transform:${fromTransformFor(k)}}to{opacity:1;transform:none}}`,
  ).join("");
  document.head.appendChild(style);
}

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
    ensureKeyframes();
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    // Persistent guard — once shown, always shown for this element.
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

    // Already in viewport on mount — skip animation, just mark revealed.
    const initialRect = el.getBoundingClientRect();
    if (initialRect.top < window.innerHeight) {
      revealed.add(el);
      return;
    }

    // Prime to invisible state inline (so element doesn't flash visible
    // before the animation is applied). The animation will override these
    // once triggered, and fill-mode:both holds the final state forever.
    el.style.opacity = "0";
    el.style.transform = fromTransformFor(kind);

    let triggered = false;
    let active = true;
    let rafId = 0;

    const trigger = () => {
      if (triggered) return;
      triggered = true;
      revealed.add(el);

      // Apply the animation. fill-mode:both holds the `from` state during
      // the delay phase and the `to` state forever after completion. The
      // compositor tracks this explicitly — no stale GPU layer possible.
      el.style.animation = `sr-${kind} ${duration}s cubic-bezier(0.22,1,0.36,1) ${delay}s both`;
      // Clear inline opacity/transform AFTER the animation is applied so
      // animation precedence takes over without a flash.
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
      // If we never triggered, clear the primed inline styles so the
      // element is visible at the CSS cascade default.
      if (!triggered) {
        el.style.opacity = "";
        el.style.transform = "";
      }
    };
  }, [kind, duration, delay]);

  const Comp = Tag as any;
  return (
    <Comp ref={ref} className={className} style={style}>
      {children}
    </Comp>
  );
}
