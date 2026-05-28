"use client";
import { useEffect, useRef } from "react";

/**
 * LedTicker — LED matrix-style horizontal scrolling text bar with
 * fly-in entry animation (IntersectionObserver + iOS replay edition).
 *
 * The framer-motion `whileInView` wrapper was leaving the ticker
 * invisible on iOS Safari because the initial inline opacity:0 / x:80
 * was being cached by the GPU compositor and the in-view transition
 * never visually applied. The fix swaps framer-motion for a vanilla
 * CSS keyframe animation orchestrated by IntersectionObserver, with
 * iOS-only replay on viewport re-entry to defeat the compositor cache.
 *
 * The marquee scroll inside (.led-ticker-track) is unchanged — pure
 * CSS animation, always running.
 */

function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById("lt-keyframes")) return;
  const s = document.createElement("style");
  s.id = "lt-keyframes";
  s.textContent =
    "@keyframes lt-fly{from{opacity:0;transform:translateX(80px) scaleX(0.92)}to{opacity:1;transform:none}}";
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

export default function LedTicker({
  items,
  speed = 90,
  accent = "#f59e0b",
  className = "",
}: {
  items: string[];
  speed?: number;
  accent?: string;
  className?: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const w = el.scrollWidth / 2;
    const duration = w / speed;
    el.style.setProperty("--led-duration", `${duration}s`);
  }, [speed, items]);

  useEffect(() => {
    const el = wrapRef.current;
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
      el.style.transform = "translateX(80px) scaleX(0.92)";
    }

    const play = () => {
      el.style.animation = "none";
      void el.offsetHeight;
      el.style.opacity = "";
      el.style.transform = "";
      // Slight overshoot via cubic-bezier with negative end control.
      el.style.animation =
        "lt-fly 0.85s cubic-bezier(0.22, 1.2, 0.36, 1) 0s both";
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (firstTrigger) {
              firstTrigger = false;
              play();
            } else if (ios) {
              play();
            }
          }
        }
      },
      { threshold: 0.05 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`led-ticker relative w-full overflow-hidden border-y border-white/[0.07] ${className}`}
      style={{
        ["--led-accent" as string]: accent,
        transformOrigin: "right center",
      }}
    >
      <div className="led-ticker-mask">
        <div ref={trackRef} className="led-ticker-track">
          <div className="led-ticker-group">
            {items.map((t, i) => (
              <span key={`a-${i}`} className="led-ticker-item">
                {t}
                <i className="led-ticker-sep" aria-hidden>
                  ◆
                </i>
              </span>
            ))}
          </div>
          <div className="led-ticker-group" aria-hidden="true">
            {items.map((t, i) => (
              <span key={`b-${i}`} className="led-ticker-item">
                {t}
                <i className="led-ticker-sep" aria-hidden>
                  ◆
                </i>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
