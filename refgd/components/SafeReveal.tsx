"use client";
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";
import { isMobileLike } from "@/lib/iosCheck";

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
 * SafeReveal — CSS-transition entrance, iOS-Safari-bypassed.
 * See lib/iosCheck.ts and Reveal.tsx for full doc.
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
.sr{opacity:1;transform:none;transition:opacity var(--sr-dur, 0.95s) cubic-bezier(0.22,1,0.36,1),transform var(--sr-dur, 0.95s) cubic-bezier(0.22,1,0.36,1)}
.sr.sr-hidden{opacity:0;transform:var(--sr-from, translateY(20px))}
@media (prefers-reduced-motion: reduce){
  .sr{transition:none}
  .sr.sr-hidden{opacity:1;transform:none}
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
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (isMobileLike()) return;
    ensureCSS();
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    const r = el.getBoundingClientRect();
    if (r.top < (window.innerHeight || 0) * 0.95 && r.bottom > 0) return;
    setHidden(true);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setHidden(false);
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

  const mergedStyle: CSSProperties = hidden
    ? {
        ...(style || {}),
        ["--sr-from" as any]: fromTransformFor(kind),
        ["--sr-dur" as any]: `${duration}s`,
      }
    : {
        ...(style || {}),
        ["--sr-from" as any]: fromTransformFor(kind),
        ["--sr-dur" as any]: `${duration}s`,
        transitionDelay: delay ? `${delay}s` : undefined,
      };

  const Comp = Tag as any;
  return (
    <Comp
      ref={ref}
      className={`sr ${hidden ? "sr-hidden" : ""} ${className}`}
      style={mergedStyle}
    >
      {children}
    </Comp>
  );
}
