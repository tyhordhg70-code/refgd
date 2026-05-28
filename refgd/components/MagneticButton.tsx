"use client";
  import type { ReactNode } from "react";

  /**
   * Magnetic CTA — previously wrapped its <a> in a framer-motion
   * <motion.div> with spring-driven x/y motion values for a cursor
   * pull effect. That spring formatting caused the button to glitch
   * visually on scroll (the SSR transform string and client-formatted
   * one never matched), which read to users as "buttons vanishing
   * on scroll-up + rescroll". v6.14.1 — render a plain <a> in a
   * span wrapper. Same classes, same styling, no springs, no
   * hydration mismatch, no vanish.
   */
  export default function MagneticButton({
    href,
    external = false,
    children,
    variant = "primary",
    className = "",
    "data-testid": testId,
  }: {
    href: string;
    external?: boolean;
    children: ReactNode;
    variant?: "primary" | "ghost" | "outline";
    className?: string;
    pull?: number;
    "data-testid"?: string;
  }) {
    const base =
      "group relative inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-semibold tracking-wide transition will-change-transform";
    const variantCls = {
      primary:
        "text-ink-950 bg-gradient-to-br from-amber-200 via-amber-400 to-amber-600 shadow-[0_18px_60px_-15px_rgba(245,185,69,0.7)] hover:shadow-[0_22px_80px_-15px_rgba(245,185,69,0.95)]",
      ghost:
        "border border-white/15 bg-white/5 text-white/90 backdrop-blur-md hover:bg-white/10",
      outline:
        "border border-amber-300/50 bg-transparent text-amber-100 hover:bg-amber-300/10",
    }[variant];

    return (
      <span className={`inline-block ${className}`} data-cursor="link">
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          data-testid={testId}
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
      </span>
    );
  }
  