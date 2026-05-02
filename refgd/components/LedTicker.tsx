"use client";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

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

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const w = el.scrollWidth / 2;
    const duration = w / speed;
    el.style.setProperty("--led-duration", `${duration}s`);
  }, [speed, items]);

  return (
    <motion.div
      initial={{ opacity: 0, x: 80, scaleX: 0.92 }}
      whileInView={{ opacity: 1, x: 0, scaleX: 1 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ type: "spring", stiffness: 110, damping: 14, mass: 0.9 }}
      className={`led-ticker relative w-full overflow-hidden border-y border-white/[0.07] ${className}`}
      style={{ ["--led-accent" as string]: accent, transformOrigin: "right center" }}
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
    </motion.div>
  );
}
