"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import Tilt3D from "./Tilt3D";
import PathIllustration, { type PathIllustrationKind } from "./PathIllustration";

interface PathCardProps {
  index: number;
  href: string;
  external?: boolean;
  title: string;
  illustration: PathIllustrationKind;
  accent: "gold" | "fuchsia" | "cyan" | "violet" | "orange";
  size?: "sm" | "md" | "lg";
}

const ACCENT_GLOW: Record<PathCardProps["accent"], string> = {
  gold:    "hover:shadow-[0_50px_120px_-30px_rgba(245,185,69,0.85)]",
  fuchsia: "hover:shadow-[0_50px_120px_-30px_rgba(219,39,119,0.85)]",
  cyan:    "hover:shadow-[0_50px_120px_-30px_rgba(34,211,238,0.85)]",
  violet:  "hover:shadow-[0_50px_120px_-30px_rgba(139,92,246,0.85)]",
  orange:  "hover:shadow-[0_50px_120px_-30px_rgba(249,115,22,0.85)]",
};

const ACCENT_RING: Record<PathCardProps["accent"], string> = {
  gold:    "from-amber-300/70 via-amber-400/15 to-transparent",
  fuchsia: "from-fuchsia-300/70 via-fuchsia-500/15 to-transparent",
  cyan:    "from-cyan-300/70 via-cyan-500/15 to-transparent",
  violet:  "from-violet-300/70 via-violet-500/15 to-transparent",
  orange:  "from-orange-300/70 via-orange-500/15 to-transparent",
};

const ACCENT_CHIP: Record<PathCardProps["accent"], string> = {
  gold:    "text-amber-200 bg-amber-300/15 ring-amber-300/30",
  fuchsia: "text-fuchsia-200 bg-fuchsia-400/15 ring-fuchsia-300/30",
  cyan:    "text-cyan-200 bg-cyan-300/15 ring-cyan-300/30",
  violet:  "text-violet-200 bg-violet-300/15 ring-violet-300/30",
  orange:  "text-orange-200 bg-orange-300/15 ring-orange-300/30",
};

const BG_TINT: Record<PathCardProps["accent"], string> = {
  gold:    "from-amber-500/20 via-amber-500/5 to-transparent",
  fuchsia: "from-fuchsia-500/22 via-fuchsia-600/5 to-transparent",
  cyan:    "from-cyan-500/22 via-cyan-600/5 to-transparent",
  violet:  "from-violet-500/22 via-violet-600/5 to-transparent",
  orange:  "from-orange-500/22 via-orange-600/5 to-transparent",
};

export default function PathCard({
  index,
  href,
  external,
  title,
  illustration,
  accent,
  size = "md",
}: PathCardProps) {
  const Tag: any = external ? "a" : Link;
  const linkProps = external
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : { href };

  const floatDelay = `${(index * 0.55).toFixed(2)}s`;
  const floatDuration = `${7 + (index % 3) * 0.6}s`;
  const aspect = size === "lg" ? "aspect-[4/5]" : size === "sm" ? "aspect-[3/4]" : "aspect-[3/4]";

  return (
    <motion.div
      initial={{ opacity: 0, y: 50 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.8, delay: index * 0.1, ease: [0.25, 0.4, 0.25, 1] }}
      className="group relative h-full"
      data-cursor="hover"
      data-cursor-label={title}
    >
      <div style={{ animation: `floatSlow ${floatDuration} ease-in-out ${floatDelay} infinite` }} className="h-full">
        <Tilt3D intensity={0.85} className="h-full">
          <Tag
            {...linkProps}
            className={`relative block h-full overflow-hidden rounded-[2rem] glass-strong transition-all duration-500 ${ACCENT_GLOW[accent]}`}
          >
            {/* Animated gradient ring */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 rounded-[2rem] bg-gradient-to-br ${ACCENT_RING[accent]} opacity-60 transition-opacity duration-500 group-hover:opacity-100`}
              style={{ padding: "1px", WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }}
            />

            <div
              className={`relative ${aspect} overflow-hidden rounded-[2rem]`}
              style={{ transform: "translateZ(28px)", transformStyle: "preserve-3d" }}
            >
              {/* Vector illustration backdrop — renders inline SVG with
                  scene-specific shapes, gradients and floating accents. No
                  raster image (so no visible photo borders / pixel edges). */}
              <div className={`absolute inset-0 bg-gradient-to-br ${BG_TINT[accent]}`} />
              <PathIllustration kind={illustration} accent={accent} />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 30%, rgba(5,6,10,0.55) 70%, rgba(5,6,10,0.92) 100%)",
                }}
              />
              {/* Inner shimmer on hover */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-0 transition-all duration-1000 group-hover:translate-x-full group-hover:opacity-100"
              />
              {/* Index chip */}
              <div
                className="absolute left-5 top-5"
                style={{ transform: "translateZ(40px)" }}
              >
                <span className={`heading-display rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] ring-1 backdrop-blur-md ${ACCENT_CHIP[accent]}`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              {/* Label */}
              <div
                className="absolute inset-x-0 bottom-0 p-6"
                style={{ transform: "translateZ(56px)" }}
              >
                <h3 className="heading-display text-balance text-2xl font-bold uppercase leading-tight tracking-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.85)] sm:text-3xl">
                  {title}
                </h3>
                <div className="mt-3 inline-flex items-center justify-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/70 transition-all duration-300 group-hover:gap-3 group-hover:text-white">
                  Enter
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
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
