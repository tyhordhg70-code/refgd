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
   * SafeReveal v10 — WeakSet persistent-reveal guard + double-rAF timing.
   *
   * v9 fix (double-rAF) solved the transition-skipping bug on Safari but a
   * second issue remained: if the useEffect cleanup fires while elements are
   * in an in-between state (React Strict Mode double-invoke, hot-reload, or
   * a parent re-render that causes dep-array change) the effect re-runs,
   * sees the element is now ABOVE the fold (user already scrolled past) and
   * re-primes it to opacity:0 + 3-D transform — making it vanish on rescroll.
   *
   * v10 fix: a page-level WeakSet (window.__safeRevealed) marks each element
   * permanently once it has been revealed. Any subsequent effect run skips
   * the prime-and-observe loop for marked elements — they stay visible forever.
   *
   * 3-D transforms are also made larger (more dramatic) so the entrance is
   * clearly visible as an animation rather than a subtle fade.
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
        revealed.add(el); // mark permanently revealed

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
        // Do NOT call clearAll — if already triggered, words are at natural
        // state and clearAll is a no-op. If not yet triggered, leave primed
        // so the IO can fire when the element enters view on next render.
      };
    }, [kind, duration, delay]);

    const Comp = Tag as any;
    return (
      <Comp ref={ref} className={className} style={style}>
        {children}
      </Comp>
    );
  }
  