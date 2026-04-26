"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { useState } from "react";

interface PathCardProps {
  index: number;
  href: string;
  external?: boolean;
  title: string;
  /** Image src (e.g. /images/box-art.png). */
  imageSrc: string;
  accent: "gold" | "fuchsia" | "cyan" | "violet" | "orange";
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

const ACCENT_PARTICLE: Record<PathCardProps["accent"], string> = {
  gold:    "radial-gradient(circle,#ffd86b,transparent)",
  fuchsia: "radial-gradient(circle,#f472b6,transparent)",
  cyan:    "radial-gradient(circle,#67e8f9,transparent)",
  violet:  "radial-gradient(circle,#a78bfa,transparent)",
  orange:  "radial-gradient(circle,#fdba74,transparent)",
};

export default function PathCard({
  index,
  href,
  external,
  title,
  imageSrc,
  accent,
}: PathCardProps) {
  const [exploded, setExploded] = useState(false);
  const onEnter = () => setExploded(true);
  const onLeave = () => setExploded(false);

  // Stagger floating animation phase per card
  const floatDelay = `${(index * 0.6).toFixed(2)}s`;
  const floatDuration = `${5 + (index % 3) * 0.5}s`;

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
      style={{
        animation: `float ${floatDuration} ease-in-out ${floatDelay} infinite`,
      }}
    >
      <Tag
        {...linkProps}
        onMouseEnter={onEnter}
        onMouseLeave={onLeave}
        onFocus={onEnter}
        onBlur={onLeave}
        className={`relative block h-full overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br ${ACCENT_GRADIENTS[accent]} bg-ink-900/60 p-5 backdrop-blur-md transition-all duration-500 hover:border-white/30 hover:bg-ink-800/70 ${ACCENT_GLOW[accent]}`}
      >
        {/* Explosion overlay (14 particles burst on hover) */}
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
                style={{ background: ACCENT_PARTICLE[accent] }}
              />
            );
          })}
        </div>

        {/* Box image — full-width hero, the original site shows these as the
            primary visual and the card title appears below. */}
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-ink-950/40 ring-1 ring-white/10">
          <Image
            src={imageSrc}
            alt={title}
            fill
            sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 18vw"
            className="object-cover transition-transform duration-700 group-hover:scale-105"
            priority={index < 2}
          />
          {/* Inner glow */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 50% 100%, rgba(0,0,0,0.55), transparent 70%)",
            }}
          />
        </div>

        <h3 className="heading-display mt-4 text-center text-lg font-bold tracking-tight text-white sm:text-xl">
          {title}
        </h3>

        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/70 transition-colors group-hover:text-white">
          Learn More
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M5 12h14" />
            <path d="m12 5 7 7-7 7" />
          </svg>
        </div>
      </Tag>
    </motion.div>
  );
}
