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
 * SafeReveal v8 — CSS-transition entrance with forced-reflow fix.
 *
 * Root cause of "all animations gone" in v7:
 *   The CSS transition was being set and the inline styles cleared
 *   inside the same microtask/rAF queue flush, so the browser
 *   batched them together and showed the final state instantly —
 *   no transition ever fired.
 *
 * v8 fix: `void el.getBoundingClientRect()` between setting the
 *   transition and clearing the primed styles forces the browser to
 *   commit the current layout (opacity:0 / transform:offset) BEFORE
 *   the style change. The browser then sees a genuine style delta and
 *   runs the CSS transition. One extra line — no rAF, no WAAPI.
 *
 * Other guarantees preserved from v7:
 *   • SSR + initial paint: element at REST (visible). JS-free fallback.
 *   • Above-fold elements skipped: rect check at mount, no prime,
 *     no flash for page-load content.
 *   • 6 s safety timer force-reveals in case IO never fires.
 *   • Reduced-motion: no-op — element stays at rest.
 *   • After animation: all inline styles cleared so element stays at
 *     its natural CSS rest state forever.
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

    // Above-fold: already visible at mount — leave at rest, no animation.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;

    const fromTransform =
      kind === "slideLeft" || kind === "fanLeft"
        ? "translateX(-32px)"
        : kind === "slideRight" || kind === "fanRight"
        ? "translateX(32px)"
        : "translateY(38px)";

    // Prime: set initial invisible/offset state
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

    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;

      el.style.transition = `opacity ${duration}s cubic-bezier(0.22,1,0.36,1), transform ${duration}s cubic-bezier(0.22,1,0.36,1)`;
      if (delay > 0) el.style.transitionDelay = `${delay}s`;

      // *** THE FIX ***
      // Force the browser to commit the current primed layout
      // (opacity:0 + transform:offset) BEFORE we clear the styles.
      // Without this, the browser batches the transition + clear into
      // one paint and the transition never fires ("animations gone").
      void el.getBoundingClientRect();

      // Clear inline overrides — browser now sees a genuine style delta
      // and runs the CSS transition from the committed primed state.
      el.style.opacity = "";
      el.style.transform = "";

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
    <Comp ref={ref} className={className} style={style}>
      {children}
    </Comp>
  );
}
