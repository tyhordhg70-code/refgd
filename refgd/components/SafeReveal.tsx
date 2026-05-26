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
  | "wipe";

/**
 * SafeReveal v7 — bulletproof CSS-transition entrance.
 *
 * Why v7:
 *   v6 used WAAPI with `fill: backwards`, which makes elements
 *   INVISIBLE during the animation delay. Cards with delay 0.6s
 *   were invisible for 600 ms on scroll-into-view — the "vanish
 *   on rescroll" symptom the user reported.
 *
 * v7 design (every failure mode keeps content visible):
 *   1. SSR + initial client paint: element at REST (opacity:1,
 *      transform:none). If JS never loads, content is fully visible.
 *   2. At mount, JS measures the element's bounding rect:
 *        • Already in viewport (above-fold): leave at REST. No
 *          animation, no flash, no delay-window invisibility.
 *          Page-load content is rock-solid from frame 1.
 *        • Below the fold: prime to invisible state via inline
 *          styles, then attach native IntersectionObserver.
 *          On entry: apply CSS transition + clear inline styles,
 *          element animates from invisible to rest. After the
 *          animation, all inline styles are cleared so element
 *          stays at natural rest (no chance of getting stuck).
 *   3. A 6 s safety timer force-reveals the element even if IO
 *      never fires (Lenis edge case, observer mis-attachment, etc).
 *   4. Reduced-motion: skip everything; element stays at rest.
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
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    // Above-fold check: leave at rest forever — no animation, no flash.
    const rect = el.getBoundingClientRect();
    const inViewport =
      rect.top < window.innerHeight && rect.bottom > 0;
    if (inViewport) return;

    const fromTransform =
      kind === "slideLeft" || kind === "fanLeft"
        ? "translateX(-32px)"
        : kind === "slideRight" || kind === "fanRight"
        ? "translateX(32px)"
        : "translateY(38px)";

    el.style.opacity = "0";
    el.style.transform = fromTransform;
    el.style.willChange = "opacity, transform";

    const clearAll = () => {
      el.style.transition = "";
      el.style.transitionDelay = "";
      el.style.opacity = "";
      el.style.transform = "";
      el.style.willChange = "";
    };

    let cleared = false;
    const trigger = () => {
      if (cleared) return;
      cleared = true;
      el.style.transition = `opacity ${duration}s cubic-bezier(0.22,1,0.36,1), transform ${duration}s cubic-bezier(0.22,1,0.36,1)`;
      if (delay > 0) el.style.transitionDelay = `${delay}s`;
      requestAnimationFrame(() => {
        el.style.opacity = "";
        el.style.transform = "";
      });
      window.setTimeout(clearAll, (delay + duration) * 1000 + 200);
    };

    const safety = window.setTimeout(trigger, 6000);

    if (typeof IntersectionObserver === "undefined") {
      trigger();
      window.clearTimeout(safety);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            trigger();
            window.clearTimeout(safety);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px 5% 0px" },
    );
    io.observe(el);

    return () => {
      io.disconnect();
      window.clearTimeout(safety);
      clearAll();
    };
  }, [kind, duration, delay]);

  const Comp = Tag as any;
  return (
    <Comp ref={ref as React.RefObject<HTMLElement>} className={className} style={style}>
      {children}
    </Comp>
  );
}
