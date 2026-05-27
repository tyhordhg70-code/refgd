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
 * SafeReveal v13
 *
 * ROOT CAUSE OF "NO ANIMATIONS" (found by reading SmoothScroll.tsx):
 *   The layout mounts a LoadingScreen that blocks all scroll until the
 *   galaxy worker + hero canvas boot. That can take several seconds.
 *   Every version since v9 set a 3–6 second safety timer. The timer
 *   fired WHILE THE LOADING SCREEN WAS STILL UP — triggering all
 *   below-fold elements, playing their opacity/transform transitions
 *   completely hidden behind the loading overlay. By the time the
 *   loading screen lifted and the user could scroll, every element
 *   was already at its natural visible state. Scrolling produced no
 *   animation whatsoever.
 *
 * FIX: safety timer removed. The rAF poll (introduced in v12)
 *   fires every frame and calls getBoundingClientRect() which returns
 *   the correct visual position. Lenis on this site drives window.scrollY
 *   (not CSS transforms), so getBoundingClientRect() works perfectly.
 *   Elements are triggered exactly when they enter the visible viewport,
 *   no earlier, regardless of how long the loading screen is up.
 *
 * All other fixes from v11/v12 are preserved:
 *   - clearStyles() at top of every effect run (stale-opacity ghost)
 *   - cleanup resets styles only if trigger never fired
 *   - WeakSet entry only after trigger fires
 *   - No mounted guard inside trigger rAF (animation always completes)
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
    if (initialRect.top < window.innerHeight && initialRect.bottom > 0) {
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

      // Double-rAF: first frame paints the primed state so the browser
      // registers the starting values; second frame clears them so the
      // browser fires the CSS transition from the primed values to natural.
      // No mounted guard — a triggered animation always completes.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.opacity = "";
          el.style.transform = "";
          window.setTimeout(clearStyles, (delay + duration) * 1000 + 200);
        });
      });
    };

    // rAF poll: checks visual (post-scroll) position every frame.
    // No safety timer — firing behind the LoadingScreen was killing
    // all animations by revealing elements before the user could see them.
    let active = true;
    let rafId = 0;

    const poll = () => {
      if (!active) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
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
