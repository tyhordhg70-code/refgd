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
 * SafeReveal v6 — Web Animations API + native IntersectionObserver.
 *
 * Bulletproof rules:
 *   1. SSR + initial client render: element is at REST (opacity:1,
 *      transform:none). If JS never loads, element is fully visible —
 *      no vanishing under any failure mode.
 *   2. Entrance animation is played via WAAPI (`element.animate(...)`),
 *      not via a persistent CSS class. WAAPI animations are TRANSIENT
 *      — when they finish, the element returns to its natural CSS
 *      state. The element can NEVER end up stuck in an invisible
 *      keyframe state.
 *   3. Scroll trigger uses native IntersectionObserver (not framer's
 *      `whileInView`). Native IO measures element bounding rect vs
 *      layout viewport; it is not confused by Lenis smooth-scroll's
 *      virtualization transforms.
 *   4. Once per mount — observer disconnects after the first fire.
 *      No replay on rescroll-up, no risk of mid-animation strand.
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
  const playedRef = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || playedRef.current) return;
    if (typeof window === "undefined") return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    if (typeof (el as HTMLElement).animate !== "function") return;

    const kf =
      kind === "slideLeft"
        ? [
            { opacity: 0, transform: "translateX(-32px)" },
            { opacity: 1, transform: "translateX(0)" },
          ]
        : kind === "slideRight"
        ? [
            { opacity: 0, transform: "translateX(32px)" },
            { opacity: 1, transform: "translateX(0)" },
          ]
        : [
            { opacity: 0, transform: "translateY(38px)" },
            { opacity: 1, transform: "translateY(0)" },
          ];

    const play = () => {
      if (playedRef.current) return;
      playedRef.current = true;
      try {
        (el as HTMLElement).animate(kf, {
          duration: duration * 1000,
          delay: delay * 1000,
          easing: "cubic-bezier(0.22, 1, 0.36, 1)",
          fill: "backwards",
        });
      } catch {
        /* element stays at rest state — still fully visible */
      }
    };

    if (typeof IntersectionObserver === "undefined") {
      play();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            play();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.05, rootMargin: "0px 0px -5% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [kind, duration, delay]);

  const Comp = Tag as any;
  return (
    <Comp
      ref={ref as React.RefObject<HTMLElement>}
      className={className}
      style={style}
    >
      {children}
    </Comp>
  );
}
