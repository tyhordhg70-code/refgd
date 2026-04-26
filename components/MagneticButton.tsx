"use client";
import { motion, useMotionValue, useSpring, useReducedMotion } from "framer-motion";
import { useRef, type ReactNode, type MouseEvent } from "react";

/**
 * Magnetic CTA — the button gently pulls toward the cursor when hovered.
 * Wraps an `<a>`. Adds a glowing aura that pulses on hover.
 */
export default function MagneticButton({
  href,
  external = false,
  children,
  variant = "primary",
  className = "",
  pull = 0.4,
}: {
  href: string;
  external?: boolean;
  children: ReactNode;
  variant?: "primary" | "ghost" | "outline";
  className?: string;
  pull?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduced = useReducedMotion();
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const xs = useSpring(x, { stiffness: 250, damping: 20 });
  const ys = useSpring(y, { stiffness: 250, damping: 20 });

  function onMove(e: MouseEvent<HTMLDivElement>) {
    if (reduced || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * pull);
    y.set((e.clientY - (r.top + r.height / 2)) * pull);
  }
  function onLeave() { x.set(0); y.set(0); }

  const base =
    "group relative inline-flex w-full items-center justify-center gap-2 rounded-full px-7 py-3.5 font-semibold tracking-wide transition will-change-transform";
  const variantCls = {
    primary:
      "text-ink-950 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-[0_18px_60px_-15px_rgba(245,185,69,0.7)] hover:shadow-[0_22px_80px_-15px_rgba(245,185,69,0.95)]",
    ghost:
      "border border-white/15 bg-white/5 text-white/90 backdrop-blur-md hover:bg-white/10",
    outline:
      "border border-amber-300/50 bg-transparent text-amber-100 hover:bg-amber-300/10",
  }[variant];

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ x: xs, y: ys }}
      className={`inline-block ${className}`}
      data-cursor="link"
    >
      <a
        href={href}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
        className={`${base} ${variantCls}`}
      >
        <span className="relative z-10 flex items-center gap-2">{children}</span>
        {variant === "primary" && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(circle at 50% 50%, rgba(255,225,140,0.4) 0%, transparent 70%)",
            }}
          />
        )}
      </a>
    </motion.div>
  );
}
