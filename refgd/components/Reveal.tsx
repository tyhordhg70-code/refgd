"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Reveal — React-state-driven className (GlassCard pattern).
 *
 * Previous versions added the .rv-go / .rv-pending classes imperatively
 * via classList.add/remove in useEffect. The bug: when React re-renders
 * the component (parent state change, scroll-driven state, Lenis tick,
 * etc.), React's reconciler resets className to the value in JSX and
 * wipes out the imperatively-added classes — leaving the element with
 * only .rv-base, or worse, with the stale .rv-pending lingering and
 * the iOS compositor caching the hidden state.
 *
 * This version drives the className from React state (useState), so
 * every re-render outputs the correct class string declaratively.
 * Matches the proven GlassCard / glass-card-reveal pattern.
 */
function ensureCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("rv-css")) return;
  const s = document.createElement("style");
  s.id = "rv-css";
  s.textContent = `
.rv-base{opacity:1;transform:none;will-change:transform,opacity}
.rv-pending{opacity:0;transform:translate3d(0,20px,0)}
@keyframes rv-lift{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:none}}
.rv-go{animation:rv-lift 0.52s cubic-bezier(0.22,1,0.36,1) backwards}
@media (prefers-reduced-motion: reduce){
  .rv-pending{opacity:1;transform:none}
  .rv-go{animation:none}
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
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    ensureCSS();
    const el = ref.current;
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

  const stateCls = revealed ? "rv-go" : "rv-pending";
  return (
    <div
      ref={ref}
      className={`rv-base ${stateCls} ${className}`}
      style={{ animationDelay: delay ? `${delay}s` : undefined }}
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
