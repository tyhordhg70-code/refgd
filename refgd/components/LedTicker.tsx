"use client";
import { useEffect, useRef, useState } from "react";

/**
 * LedTicker — React-state-driven className (GlassCard pattern).
 * See Reveal.tsx for full doc. Marquee inside is unchanged pure-CSS.
 */

function ensureCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("lt-css")) return;
  const s = document.createElement("style");
  s.id = "lt-css";
  s.textContent = `
.lt-base{opacity:1;transform:none;will-change:transform,opacity}
.lt-pending{opacity:0;transform:translate3d(80px,0,0) scaleX(0.92)}
@keyframes lt-fly{from{opacity:0;transform:translateX(80px) scaleX(0.92)}to{opacity:1;transform:none}}
.lt-go{animation:lt-fly 0.85s cubic-bezier(0.22,1.2,0.36,1) backwards;transform-origin:right center}
@media (prefers-reduced-motion: reduce){
  .lt-pending{opacity:1;transform:none}
  .lt-go{animation:none}
}`;
  document.head.appendChild(s);
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
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const w = el.scrollWidth / 2;
    const duration = w / speed;
    el.style.setProperty("--led-duration", `${duration}s`);
  }, [speed, items]);

  useEffect(() => {
    ensureCSS();
    const el = wrapRef.current;
    if (!el || typeof window === "undefined") return;

    const r = el.getBoundingClientRect();
    const inView =
      r.top < (window.innerHeight || 0) * 0.95 && r.bottom > 0;
    if (inView) {
      setRevealed(true);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0.05 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const stateCls = revealed ? "lt-go" : "lt-pending";

  return (
    <div
      ref={wrapRef}
      className={`led-ticker lt-base ${stateCls} relative w-full overflow-hidden border-y border-white/[0.07] ${className}`}
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
