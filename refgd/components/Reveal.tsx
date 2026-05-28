"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * Reveal (IntersectionObserver + iOS replay edition)
 *
 * Animation pipeline:
 *   1. IntersectionObserver fires when element enters viewport.
 *   2. On FIRST entry the keyframe animation plays with the configured
 *      delay — element fades up from translateY(20px) -> 0 / opacity 0 -> 1.
 *   3. animation-fill-mode:both holds the final visible state.
 *   4. On iOS Safari, every SUBSEQUENT viewport re-entry replays the
 *      animation (delay = 0). This defeats the GPU compositor cache:
 *      no matter what stale bitmap the compositor was holding, the
 *      next paint runs the animation again, ending at the visible
 *      terminal frame. Non-iOS browsers animate once.
 */
function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById("rv-keyframes")) return;
  const s = document.createElement("style");
  s.id = "rv-keyframes";
  s.textContent =
    "@keyframes rv-lift{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}";
  document.head.appendChild(s);
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

export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const duration = 0.52;

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

    // Prime to hidden only if off-screen on mount, so the first scroll
    // into view gets the full reveal effect.
    if (!inViewOnMount) {
      el.style.opacity = "0";
      el.style.transform = "translateY(20px)";
    }

    const play = (d: number) => {
      el.style.animation = "none";
      // sync reflow so the animation restart actually re-runs
      void el.offsetHeight;
      el.style.opacity = "";
      el.style.transform = "";
      el.style.animation = `rv-lift ${duration}s cubic-bezier(0.22,1,0.36,1) ${d}s both`;
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (firstTrigger) {
              firstTrigger = false;
              play(delay);
            } else if (ios) {
              // iOS compositor cache defeat: replay on every re-entry.
              play(0);
            }
          }
        }
      },
      { threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [delay]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}

export function ParallaxBlock({
  children,
  amount = 60,
  className = "",
}: {
  children: ReactNode;
  amount?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={reduced ? {} : { y: amount * 0.6 }}
      whileInView={{ y: 0 }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{ type: "spring", stiffness: 60, damping: 20 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function Orb({
  color,
  size = 320,
  className = "",
}: {
  color: string;
  size?: number;
  className?: string;
}) {
  return (
    <div
      aria-hidden
      style={{ width: size, height: size, background: color }}
      className={`absolute rounded-full blur-3xl ${className}`}
    />
  );
}
