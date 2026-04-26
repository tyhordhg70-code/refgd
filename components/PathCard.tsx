"use client";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import Tilt3D from "./Tilt3D";

interface PathCardProps {
  index: number;
  href: string;
  external?: boolean;
  title: string;
  imageSrc: string;
  accent: "gold" | "fuchsia" | "cyan" | "violet" | "orange";
}

const ACCENT_GLOW: Record<PathCardProps["accent"], string> = {
  gold:    "shadow-[0_30px_80px_-30px_rgba(245,185,69,0.65)] group-hover:shadow-[0_40px_120px_-30px_rgba(245,185,69,0.9)]",
  fuchsia: "shadow-[0_30px_80px_-30px_rgba(219,39,119,0.6)] group-hover:shadow-[0_40px_120px_-30px_rgba(219,39,119,0.9)]",
  cyan:    "shadow-[0_30px_80px_-30px_rgba(34,211,238,0.6)] group-hover:shadow-[0_40px_120px_-30px_rgba(34,211,238,0.9)]",
  violet:  "shadow-[0_30px_80px_-30px_rgba(139,92,246,0.6)] group-hover:shadow-[0_40px_120px_-30px_rgba(139,92,246,0.9)]",
  orange:  "shadow-[0_30px_80px_-30px_rgba(249,115,22,0.6)] group-hover:shadow-[0_40px_120px_-30px_rgba(249,115,22,0.9)]",
};

const ACCENT_RING: Record<PathCardProps["accent"], string> = {
  gold:    "from-amber-300/60 via-amber-400/20 to-transparent",
  fuchsia: "from-fuchsia-300/60 via-fuchsia-500/20 to-transparent",
  cyan:    "from-cyan-300/60 via-cyan-500/20 to-transparent",
  violet:  "from-violet-300/60 via-violet-500/20 to-transparent",
  orange:  "from-orange-300/60 via-orange-500/20 to-transparent",
};

export default function PathCard({
  index,
  href,
  external,
  title,
  imageSrc,
  accent,
}: PathCardProps) {
  const Tag: any = external ? "a" : Link;
  const linkProps = external
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : { href };

  // Stagger floating animation phase per card
  const floatDelay = `${(index * 0.55).toFixed(2)}s`;
  const floatDuration = `${7 + (index % 3) * 0.6}s`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay: index * 0.08, ease: [0.25, 0.4, 0.25, 1] }}
      className="group relative"
    >
      {/* Inner wrapper owns the floatSlow CSS animation so framer-motion's
          y-transform on the parent doesn't fight a competing CSS transform. */}
      <div style={{ animation: `floatSlow ${floatDuration} ease-in-out ${floatDelay} infinite` }}>
      <Tilt3D intensity={0.85}>
        <Tag
          {...linkProps}
          className={`relative block h-full overflow-hidden rounded-3xl bg-ink-900/40 backdrop-blur-md transition-all duration-500 ${ACCENT_GLOW[accent]}`}
        >
          {/* Animated gradient ring */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-br ${ACCENT_RING[accent]} opacity-50 transition-opacity duration-500 group-hover:opacity-100`}
            style={{ padding: "1px", WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }}
          />

          {/* Image — depth layer with z-translate */}
          <div
            className="relative aspect-[3/4] overflow-hidden rounded-3xl"
            style={{ transform: "translateZ(28px)", transformStyle: "preserve-3d" }}
          >
            <Image
              src={imageSrc}
              alt={title}
              fill
              sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 20vw"
              className="object-cover transition-transform duration-700 group-hover:scale-110"
              priority={index < 2}
            />
            {/* Gradient veil for label legibility */}
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, transparent 30%, rgba(5,6,10,0.5) 65%, rgba(5,6,10,0.95) 100%)",
              }}
            />
            {/* Inner shimmer on hover */}
            <div
              aria-hidden="true"
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-0 transition-all duration-1000 group-hover:translate-x-full group-hover:opacity-100"
            />
            {/* Label, lifted in Z for AR feel */}
            <div
              className="absolute inset-x-0 bottom-0 p-5 text-center"
              style={{ transform: "translateZ(56px)" }}
            >
              <h3 className="heading-display text-lg font-bold uppercase tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.85)] sm:text-xl">
                {title}
              </h3>
              <div className="mt-2 inline-flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/65 transition-colors group-hover:text-white">
                Enter
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </Tag>
      </Tilt3D>
      </div>
    </motion.div>
  );
}
