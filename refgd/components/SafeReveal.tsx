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
   * SafeReveal v9 — double-rAF timing fix + new 3-D kinds.
   *
   * v8 used void getBoundingClientRect() to force layout commit before
   * clearing primed styles. On Safari inside complex compositing contexts
   * (e.g. pages with pinned backgrounds, backdrop-filters elsewhere) the
   * forced reflow was sometimes insufficient — the browser batched the
   * style changes and skipped the transition entirely.
   *
   * v9 fix: double requestAnimationFrame. First rAF fires after the
   * browser has painted the primed state (opacity:0 + 3-D transform).
   * Second rAF fires in the next paint cycle — we clear inline styles
   * here so the browser sees a genuine from→to delta and runs the CSS
   * transition. Same technique used by GSAP and Framer Motion internals.
   *
   * New 3-D kinds added: flip3d, swingIn, swingInR, riseDep, tiltDown,
   * twist. All use perspective() as a transform function — no parent
   * element needs perspective:Npx or transform-style:preserve-3d.
   *
   * CRITICAL: never put backdrop-filter or backdropFilter on any element
   * inside a SafeReveal wrapper — that triggers the Safari compositor bug
   * where ALL opacity transitions on the page stop working.
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

      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) return;

      const fromTransform =
        kind === "flip3d"     ? "perspective(800px) rotateX(12deg) translateY(28px)"  :
        kind === "swingIn"    ? "perspective(700px) rotateY(-16deg) translateX(-25px)" :
        kind === "swingInR"   ? "perspective(700px) rotateY(16deg) translateX(25px)"  :
        kind === "riseDep"    ? "perspective(1000px) scale(0.85) translateY(10px)"    :
        kind === "tiltDown"   ? "perspective(800px) rotateX(-12deg) translateY(-22px)" :
        kind === "twist"      ? "perspective(900px) rotateZ(-5deg) scale(0.90)"        :
        kind === "fanLeft"    ? "perspective(600px) rotateY(-10deg) translateX(-22px)" :
        kind === "fan"        ? "perspective(600px) scale(0.88) translateY(22px)"      :
        kind === "fanRight"   ? "perspective(600px) rotateY(10deg) translateX(22px)"  :
        kind === "slideLeft"  ? "translateX(-20px)"                                    :
        kind === "slideRight" ? "translateX(20px)"                                     :
        "translateY(20px)";

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
      let mounted = true;

      const trigger = () => {
        if (triggered) return;
        triggered = true;

        el.style.transition = `opacity ${duration}s cubic-bezier(0.22,1,0.36,1), transform ${duration}s cubic-bezier(0.22,1,0.36,1)`;
        if (delay > 0) el.style.transitionDelay = `${delay}s`;

        requestAnimationFrame(() => {
          if (!mounted) return;
          requestAnimationFrame(() => {
            if (!mounted) return;
            el.style.opacity = "";
            el.style.transform = "";
            window.setTimeout(clearAll, (delay + duration) * 1000 + 200);
          });
        });
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
        mounted = false;
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
  