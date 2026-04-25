"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { useState } from "react";

interface PathCardProps {
  index: number;
  href: string;
  external?: boolean;
  title: string;
  subtitle: string;
  accent: "gold" | "fuchsia" | "cyan" | "violet" | "orange";
  /** Big stylized icon path / svg children. */
  iconPath: string;
}

const ACCENT_GRADIENTS: Record<PathCardProps["accent"], string> = {
  gold:    "from-amber-300/40 via-amber-500/25 to-transparent",
  fuchsia: "from-fuchsia-400/40 via-fuchsia-600/25 to-transparent",
  cyan:    "from-cyan-300/40 via-cyan-600/25 to-transparent",
  violet:  "from-violet-300/40 via-violet-600/25 to-transparent",
  orange:  "from-orange-300/40 via-orange-500/25 to-transparent",
};

const ACCENT_GLOW: Record<PathCardProps["accent"], string> = {
  gold:    "shadow-[0_0_60px_-10px_rgba(245,185,69,0.55)]",
  fuchsia: "shadow-[0_0_60px_-10px_rgba(219,39,119,0.5)]",
  cyan:    "shadow-[0_0_60px_-10px_rgba(34,211,238,0.5)]",
  violet:  "shadow-[0_0_60px_-10px_rgba(139,92,246,0.5)]",
  orange:  "shadow-[0_0_60px_-10px_rgba(249,115,22,0.5)]",
};

export default function PathCard({ index, href, external, title, subtitle, accent, iconPath }: PathCardProps) {
  const [exploded, setExploded] = useState(false);

  const onEnter = () => setExploded(true);
  const onLeave = () => setExploded(false);

  const Tag: any = external ? "a" : Link;
  const linkProps = external
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : { href };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.5, delay: index * 0.08, ease: [0.25, 0.4, 0.25, 1] }}
      className="group relative"
    >
      <Tag
        {...linkProps}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onEnter}
        onBlur={onLeave}
        className={`relative block h-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${ACCENT_GRADIENTS[accent]} bg-ink-900/60 p-6 backdrop-blur-md transition-all duration-500 hover:border-white/30 hover:bg-ink-800/70 ${ACCENT_GLOW[accent]}`}
      >
        {/* Explosion overlay (12 particles burst on hover) */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          {Array.from({ length: 14 }).map((_, i) => {
            const angle = (i / 14) * Math.PI * 2;
            const dist = exploded ? 90 + Math.random() * 60 : 0;
            return (
              <motion.span
                key={i}
                initial={false}
                animate={{
                  x: Math.cos(angle) * dist,
                  y: Math.sin(angle) * dist,
                  opacity: exploded ? [1, 0.7, 0] : 0,
                  scale: exploded ? [0.6, 1, 0.4] : 0.4,
                }}
                transition={{ duration: 0.9, ease: "easeOut" }}
                className="absolute left-1/2 top-1/2 -ml-1 -mt-1 h-2 w-2 rounded-full"
                style={{
                  background:
                    accent === "gold"
                      ? "radial-gradient(circle,#ffd86b,transparent)"
                      : accent === "fuchsia"
                      ? "radial-gradient(circle,#f472b6,transparent)"
                      : accent === "cyan"
                      ? "radial-gradient(circle,#67e8f9,transparent)"
                      : accent === "violet"
                      ? "radial-gradient(circle,#a78bfa,transparent)"
                      : "radial-gradient(circle,#fdba74,transparent)",
                }}
              />
            );
          })}
        </div>

        {/* Icon */}
        <div className="relative mb-6 grid h-16 w-16 place-items-center rounded-2xl bg-white/5 ring-1 ring-white/10">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-9 w-9 text-white">
            <path d={iconPath} />
          </svg>
        </div>

        <h3 className="heading-display text-2xl font-bold tracking-tight text-white">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/65">{subtitle}</p>

        <div className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-white/85 transition-transform duration-300 group-hover:translate-x-1">
          Learn More
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </div>
      </Tag>
    </motion.div>
  );
}
