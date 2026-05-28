"use client";
import {
  useEffect,
  useRef,
  useState,
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
 * SafeReveal — React-state-driven className (GlassCard pattern).
 * See Reveal.tsx for full doc on why imperative classList mutation
 * doesn't survive React re-renders. Uses CSS custom property
 * --sr-from set via React's style prop (also declarative).
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
  s.textContent = `
.sr-base{opacity:1;transform:none;will-change:transform,opacity}
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
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    ensureCSS();
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    const r = el.getBoundingClientRect();
    const inView =
      r.top < (window.innerHeight || 0) * 0.95 && r.bottom > 0;
    if (inView) {
      setRevealed(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const stateCls = revealed ? "sr-go" : "sr-pending";
  const mergedStyle: CSSProperties = {
    ...(style || {}),
    ["--sr-from" as any]: fromTransformFor(kind),
    ["--sr-dur" as any]: `${duration}s`,
    animationDelay: delay ? `${delay}s` : undefined,
  };

  const Comp = Tag as any;
  return (
    <Comp
      ref={ref}
      className={`sr-base ${stateCls} ${className}`}
      style={mergedStyle}
    >
      {children}
    </Comp>
  );
}
