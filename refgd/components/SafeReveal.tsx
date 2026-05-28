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
 * SafeReveal (IntersectionObserver + iOS replay edition).
 * See Reveal.tsx for the full animation strategy doc — same pattern,
 * 14 kinds via the KINDS table.
 */

const KINDS: RevealKind[] = [
  "lift", "slideLeft", "slideRight", "fan", "fanLeft", "fanRight",
  "scale", "wipe", "flip3d", "swingIn", "swingInR", "riseDep",
  "tiltDown", "twist",
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
    (k) =>
      `@keyframes sr-${k}{from{opacity:0;transform:${fromTransformFor(k)}}to{opacity:1;transform:none}}`,
  ).join("");
  document.head.appendChild(style);
}

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    ((navigator as any).platform === "MacIntel" &&
      (navigator as any).maxTouchPoints > 1)
  );
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
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    ensureKeyframes();
    const ios = isIOS();

    const initialRect = el.getBoundingClientRect();
    const inViewOnMount =
      initialRect.top < window.innerHeight && initialRect.bottom > 0;

    let firstTrigger = !inViewOnMount;

    if (!inViewOnMount) {
      el.style.opacity = "0";
      el.style.transform = fromTransformFor(kind);
    }

    const play = (d: number) => {
      el.style.animation = "none";
      void el.offsetHeight;
      el.style.opacity = "";
      el.style.transform = "";
      el.style.animation = `sr-${kind} ${duration}s cubic-bezier(0.22,1,0.36,1) ${d}s both`;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (firstTrigger) {
              firstTrigger = false;
              play(delay);
            } else if (ios) {
              play(0);
            }
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
    <Comp ref={ref} className={className} style={style}>
      {children}
    </Comp>
  );
}
