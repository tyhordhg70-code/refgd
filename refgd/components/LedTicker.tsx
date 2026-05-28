"use client";
import { useEffect, useRef } from "react";

/**
 * LedTicker — LED matrix-style horizontal scrolling text bar.
 *
 * The track auto-duplicates to make the loop seamless. The LED
 * appearance is built from a layered gradient + radial dot
 * background applied via CSS, so no images are needed.
 *
 * On first scroll into view the entire bar performs a one-shot
 * "fly-in" — slides in from the right with a subtle overshoot —
 * so the visitor's eye is drawn to it just as the marquee text
 * (e.g. "Cashback up to 100%") starts to scroll.
 *
 * v2 — entrance was previously a framer-motion <motion.div> with
 * initial={{ opacity: 0, x: 80, scaleX: 0.92 }} + whileInView.
 * On iOS Safari, framer-motion's IntersectionObserver-backed
 * whileInView failed to fire reliably, leaving the ticker
 * permanently invisible on first scroll. Fix: rAF poll (same
 * engine as SafeReveal v13 / Reveal v7) — fires the moment the
 * ticker's top edge enters window.innerHeight, then applies a CSS
 * transition for the fly-in. No framer-motion dependency.
 */
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
  const trackRef = useRef<HTMLDivElement | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  // Compute scroll duration from track width so loops are smooth.
  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const w = el.scrollWidth / 2;
    const duration = w / speed;
    el.style.setProperty("--led-duration", `${duration}s`);
  }, [speed, items]);

  // Entrance: rAF poll → CSS transition (fly-in from right).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof window === "undefined") return;

    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return; // skip entrance, ticker is already visible (no priming done)
    }

    // Already in view on mount — no fly-in needed.
    const rect = el.getBoundingClientRect();
    if (rect.top < window.innerHeight) return;

    // Prime: position off to the right, collapsed, invisible.
    el.style.opacity = "0";
    el.style.transform = "translateX(80px) scaleX(0.92)";
    el.style.transformOrigin = "right center";
    el.style.willChange = "opacity, transform";

    let active = true;
    let rafId = 0;
    let triggered = false;

    const trigger = () => {
      if (triggered) return;
      triggered = true;
      el.style.transition =
        "opacity 0.55s cubic-bezier(0.22,1,0.36,1), " +
        "transform 0.55s cubic-bezier(0.22,1,0.36,1)";
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.style.opacity = "";
          el.style.transform = "";
          window.setTimeout(() => {
            el.style.transition = "";
            el.style.willChange = "";
          }, 800);
        });
      });
    };

    const poll = () => {
      if (!active) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight) {
        trigger();
      } else {
        rafId = requestAnimationFrame(poll);
      }
    };
    rafId = requestAnimationFrame(poll);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      if (!triggered) {
        el.style.opacity = "";
        el.style.transform = "";
        el.style.transition = "";
        el.style.willChange = "";
      }
    };
  }, []);

  return (
    <div
      ref={wrapRef}
      className={`led-ticker relative w-full overflow-hidden border-y border-white/[0.07] ${className}`}
      style={{ ["--led-accent" as string]: accent }}
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
