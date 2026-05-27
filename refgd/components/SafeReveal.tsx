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
   * SafeReveal v11
   *
   * Three fixes over v10:
   *
   * FIX 1 — stale-opacity ghost:
   *   v10 removed clearAll() from cleanup. If the effect re-ran (admin-ctx dep
   *   change, Strict-Mode double-invoke) while an element was already primed
   *   (opacity:0) AND the element happened to be in the viewport at that moment,
   *   the above-fold guard marked it "revealed" and returned — leaving it stuck at
   *   opacity:0 forever. Fix: wipe any stale inline styles at the TOP of every
   *   effect run, before the above-fold check. Also, cleanup now resets inline
   *   styles when trigger has NOT yet fired so the next run starts clean.
   *
   * FIX 2 — Lenis scroll interception:
   *   Lenis sets overflow:hidden on the root and scrolls via CSS transform.
   *   IntersectionObserver uses layout positions (pre-transform), so elements may
   *   appear "always intersecting" or "never intersecting." A capture-phase scroll
   *   listener that calls getBoundingClientRect() (post-transform, visual position)
   *   is used as a secondary trigger that fires correctly with Lenis.
   *
   * FIX 3 — WeakSet only after trigger:
   *   Elements are only added to window.__safeRevealed after trigger() fires, never
   *   speculatively. This avoids permanently skipping elements that never animated.
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

      // Skip permanently-revealed elements.
      const revealed: WeakSet<Element> =
        (window as any).__safeRevealed ??
        ((window as any).__safeRevealed = new WeakSet());
      if (revealed.has(el)) return;

      // FIX 1: Wipe any stale inline styles left by a previous interrupted run.
      const clearStyles = () => {
        el.style.opacity = "";
        el.style.transform = "";
        el.style.transition = "";
        el.style.transitionDelay = "";
        el.style.willChange = "";
      };
      clearStyles();

      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) { revealed.add(el); return; }

      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        revealed.add(el);
        return;
      }

      const fromTransform =
        kind === "flip3d"     ? "perspective(700px) rotateX(18deg) translateY(40px)"   :
        kind === "swingIn"    ? "perspective(600px) rotateY(-22deg) translateX(-35px)"  :
        kind === "swingInR"   ? "perspective(600px) rotateY(22deg) translateX(35px)"   :
        kind === "riseDep"    ? "perspective(800px) scale(0.78) translateY(18px)"      :
        kind === "tiltDown"   ? "perspective(600px) rotateX(-25deg) translateY(-35px)"  :
        kind === "twist"      ? "perspective(700px) rotateZ(-12deg) rotateX(10deg) scale(0.80)" :
        kind === "fanLeft"    ? "perspective(500px) rotateY(-20deg) translateX(-40px)"  :
        kind === "fan"        ? "perspective(500px) scale(0.78) translateY(35px)"       :
        kind === "fanRight"   ? "perspective(500px) rotateY(20deg) translateX(40px)"   :
        kind === "slideLeft"  ? "translateX(-20px)"                                     :
        kind === "slideRight" ? "translateX(20px)"                                      :
        "translateY(20px)";

      el.style.opacity = "0";
      el.style.transform = fromTransform;
      el.style.willChange = "opacity, transform";

      let triggered = false;
      let mounted = true;

      const trigger = () => {
        if (triggered) return;
        triggered = true;
        revealed.add(el); // Only mark AFTER trigger fires.

        el.style.transition = `opacity ${duration}s cubic-bezier(0.22,1,0.36,1), transform ${duration}s cubic-bezier(0.22,1,0.36,1)`;
        if (delay > 0) el.style.transitionDelay = `${delay}s`;

        requestAnimationFrame(() => {
          if (!mounted) return;
          requestAnimationFrame(() => {
            if (!mounted) return;
            el.style.opacity = "";
            el.style.transform = "";
            window.setTimeout(clearStyles, (delay + duration) * 1000 + 200);
          });
        });
      };

      const safety = window.setTimeout(trigger, 4000);

      // IO (works for native scroll).
      let io: IntersectionObserver | null = null;
      if (typeof IntersectionObserver !== "undefined") {
        io = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                trigger();
                window.clearTimeout(safety);
                io!.disconnect();
                break;
              }
            }
          },
          { threshold: 0.05, rootMargin: "0px 0px 5% 0px" },
        );
        io.observe(el);
      }

      // FIX 2: Scroll listener — getBoundingClientRect() sees Lenis transforms.
      const onScroll = () => {
        if (triggered) return;
        const r = el.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.95 && r.bottom > 0) {
          trigger();
          window.clearTimeout(safety);
          io?.disconnect();
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true, capture: true });

      return () => {
        mounted = false;
        io?.disconnect();
        window.clearTimeout(safety);
        window.removeEventListener("scroll", onScroll, true);
        // FIX 1 cont: if trigger never fired, reset so next run starts clean.
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
  