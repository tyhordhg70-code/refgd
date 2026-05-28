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
 * SafeReveal (glass-card-reveal pattern — iOS-eviction-safe).
 * See Reveal.tsx for full strategy doc. Uses a CSS custom property
 * `--sr-from` to share one keyframe/class across all 14 kinds.
 */

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

function ensureCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("sr-css")) return;
  const s = document.createElement("style");
  s.id = "sr-css";
  // Single keyframe and class via CSS custom property --sr-from.
  // Variable resolves at the from-keyframe's concrete value, then
  // interpolates to none. Browser support: all modern browsers.
  s.textContent = `
.sr-base{opacity:1;transform:none}
.sr-pending{opacity:0;transform:var(--sr-from, translateY(20px))}
@keyframes sr-go{from{opacity:0;transform:var(--sr-from, translateY(20px))}to{opacity:1;transform:none}}
.sr-go{animation:sr-go var(--sr-dur, 0.95s) cubic-bezier(0.22,1,0.36,1) backwards}
@media (prefers-reduced-motion: reduce){
  .sr-pending{opacity:1;transform:none}
  .sr-go{animation:none}
}`;
  document.head.appendChild(s);
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
    ensureCSS();
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    const done: WeakSet<Element> =
      (window as any).__srDone ??
      ((window as any).__srDone = new WeakSet());
    if (done.has(el)) return;

    // Set the per-element variables so keyframe + pending use this kind.
    el.style.setProperty("--sr-from", fromTransformFor(kind));
    el.style.setProperty("--sr-dur", `${duration}s`);

    const initialRect = el.getBoundingClientRect();
    const inViewOnMount =
      initialRect.top < window.innerHeight && initialRect.bottom > 0;

    if (inViewOnMount) {
      done.add(el);
      return;
    }

    el.classList.add("sr-pending");

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            done.add(el);
            if (delay > 0) el.style.animationDelay = `${delay}s`;
            el.classList.remove("sr-pending");
            el.classList.add("sr-go");
            observer.disconnect();
          }
        }
      },
      { threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [kind, duration, delay]);

  const Comp = Tag as any;
  return (
    <Comp ref={ref} className={`sr-base ${className}`} style={style}>
      {children}
    </Comp>
  );
}
