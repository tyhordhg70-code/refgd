"use client";
  import { motion, useReducedMotion } from "framer-motion";
  import { type ReactNode, type CSSProperties } from "react";

  /**
   * SafeReveal — viewport-triggered lift that NEVER hides content via
   * opacity:0 in SSR HTML. Only translates Y, so content is always
   * readable even if framer-motion hasn't hydrated yet. Replays on
   * scroll-back (`once:false`) and respects `prefers-reduced-motion`.
   */
  export default function SafeReveal({
    children,
    className = "",
    style,
    delay = 0,
    y = 28,
    as: Tag = "div",
  }: {
    children: ReactNode;
    className?: string;
    style?: CSSProperties;
    delay?: number;
    y?: number;
    as?: "div" | "section" | "article" | "li";
  }) {
    const reduced = useReducedMotion();
    if (reduced) {
      const Static = Tag as any;
      return (
        <Static className={className} style={style}>
          {children}
        </Static>
      );
    }
    const M = motion[Tag] as any;
    return (
      <M
        className={className}
        style={style}
        initial={{ y }}
        whileInView={{ y: 0 }}
        viewport={{ once: false, amount: 0.15 }}
        transition={{ duration: 0.8, delay, ease: [0.22, 1, 0.36, 1] }}
        suppressHydrationWarning
      >
        {children}
      </M>
    );
  }
  