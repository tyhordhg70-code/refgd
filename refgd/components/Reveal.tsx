"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { isMobileLike } from "@/lib/iosCheck";

/**
 * Reveal — CSS-transition entrance, iOS-Safari-bypassed.
 *
 * See lib/iosCheck.ts for why iOS Safari skips the animation entirely.
 * On every other browser (desktop, Android, etc.) the CSS-transition
 * reveal runs normally: element starts at `.rv-hidden` (opacity:0,
 * translateY 20px), IntersectionObserver triggers a class swap, the
 * browser transitions to the natural state (opacity:1, transform:none).
 */
function ensureCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("rv-css")) return;
  const s = document.createElement("style");
  s.id = "rv-css";
  s.textContent = `
.rv{opacity:1;transform:none;transition:opacity 0.55s cubic-bezier(0.22,1,0.36,1),transform 0.55s cubic-bezier(0.22,1,0.36,1)}
.rv.rv-hidden{opacity:0;transform:translateY(20px)}
@media (prefers-reduced-motion: reduce){
  .rv{transition:none}
  .rv.rv-hidden{opacity:1;transform:none}
}`;
  document.head.appendChild(s);
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
  // `hidden` starts FALSE so initial paint shows the visible state.
  // On iOS Safari we never flip it true — element stays visible.
  // On non-iOS, useEffect briefly sets it true for off-screen
  // elements, then IO flips it back to false on scroll-in.
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (isMobileLike()) return;
    ensureCSS();
    const el = ref.current;
    if (!el || typeof window === "undefined") return;

    const r = el.getBoundingClientRect();
    if (r.top < (window.innerHeight || 0) * 0.95 && r.bottom > 0) {
      return;
    }
    setHidden(true);

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setHidden(false);
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

  return (
    <div
      ref={ref}
      className={`rv ${hidden ? "rv-hidden" : ""} ${className}`}
      style={hidden ? undefined : { transitionDelay: delay ? `${delay}s` : undefined }}
    >
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
