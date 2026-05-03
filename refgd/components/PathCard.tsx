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
  /**
   * Suppress the framer-motion entrance reveal entirely.
   *
   * Used by `PathsHorizontalReveal` for the mobile carousel. Inside a
   * horizontally-scrolling snap container, only 1-2 cards are ever in
   * the window viewport at once; cards waiting in the queue are
   * positioned at large positive x offsets and never trigger the
   * `whileInView` IntersectionObserver, which would otherwise leave
   * them permanently stuck at their initial transform (the original
   * "cards cut off from the top" bug). The carousel instead asks
   * PathCard to render in its final visual state from the start, so
   * snapping to any card always shows the card correctly with no
   * dependency on viewport observation.
   */
  noReveal?: boolean;
  /** Forward to PathIllustration — false freezes animations on hidden slides. */
  animated?: boolean;
}

const ACCENT_GLOW: Record<PathCardProps["accent"], string> = {
  gold:    "hover:shadow-[0_50px_120px_-30px_rgba(245,185,69,0.85)]",
  fuchsia: "hover:shadow-[0_50px_120px_-30px_rgba(219,39,119,0.85)]",
  cyan:    "hover:shadow-[0_50px_120px_-30px_rgba(34,211,238,0.85)]",
  violet:  "hover:shadow-[0_50px_120px_-30px_rgba(139,92,246,0.85)]",
  orange:  "hover:shadow-[0_50px_120px_-30px_rgba(249,115,22,0.85)]",
};

/** Continuous pulsating accent-color glow per card so each one breathes
 *  in its own colour even when the user isn't hovering. */
const ACCENT_PULSE: Record<PathCardProps["accent"], string> = {
  gold:    "pulse-glow-gold",
  fuchsia: "pulse-glow-fuchsia",
  cyan:    "pulse-glow-cyan",
  violet:  "pulse-glow-violet",
  orange:  "pulse-glow-orange",
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
  gold:    "from-amber-500/30 via-amber-700/15 to-ink-950/55",
  fuchsia: "from-fuchsia-500/32 via-fuchsia-700/15 to-ink-950/55",
  cyan:    "from-cyan-500/32 via-cyan-700/15 to-ink-950/55",
  violet:  "from-violet-500/32 via-violet-700/15 to-ink-950/55",
  orange:  "from-orange-500/32 via-orange-700/15 to-ink-950/55",
};

export default function PathCard({
  index,
  href,
  external,
  title,
  illustration,
  accent,
  size = "md",
  noReveal = false,
  animated = true,
}: PathCardProps) {
  const Tag: any = external ? "a" : Link;
  const linkProps = external
    ? { href, target: "_blank", rel: "noopener noreferrer" }
    : { href };

  const floatDelay = `${(index * 0.55).toFixed(2)}s`;
  const floatDuration = `${7 + (index % 3) * 0.6}s`;
  const aspect = size === "lg" ? "aspect-[4/5]" : size === "sm" ? "aspect-[3/4]" : "aspect-[3/4]";
  const radius = size === "sm" ? "rounded-[1.25rem]" : "rounded-[2rem]";
  const titleClass =
    size === "sm"
      ? "text-base md:text-lg lg:text-xl xl:text-2xl"
      : "text-2xl sm:text-3xl";
  const labelClass = size === "sm" ? "mt-2 text-[9px] tracking-[0.22em]" : "mt-3 text-[10px] tracking-[0.3em]";
  const chipClass = size === "sm" ? "px-2 py-0.5 text-[9px] tracking-[0.18em]" : "px-3 py-1 text-[11px] tracking-[0.25em]";
  const textPad = size === "sm" ? "p-3 md:p-4 xl:p-5" : "p-6";
  // `noReveal` and `size === "sm"` BOTH disable the entrance reveal.
  // The mobile carousel passes `noReveal` to keep the default `md`
  // visual styling (fonts, padding, radius, aspect) while still
  // dropping the viewport-triggered animation that would otherwise
  // strand off-screen-x cards at their initial transform.
  //
  // v6.10 (2026-05): the previous loading-screen entrance gate was
  // REMOVED here. The home page paths section sits BELOW the
  // CosmicJourney hero (the welcome scene takes the full first
  // viewport), so the cards are never above-the-fold on first paint
  // — `whileInView` reliably fires when the user scrolls down to
  // them and the splash is long gone by then. Adding the gate on
  // top of that combo was stranding the cards at their `initial`
  // transform (opacity 0, y 80, scale 0.85) when the loading flag
  // hadn't propagated yet, which is what the user reported as "path
  // cards not scrollable, illustrations gone".
  const revealProps =
    noReveal || size === "sm"
      ? {
          initial: false as const,
          animate: undefined,
          transition: undefined,
        }
      : {
          initial: { opacity: 0, y: 80, scale: 0.85, rotateX: 18 },
          whileInView: { opacity: 1, y: 0, scale: 1, rotateX: 0 },
          viewport: { once: true, amount: 0.05 },
          transition: {
            duration: 1.0,
            delay: index * 0.12,
            ease: [0.22, 1, 0.36, 1],
          },
        };

  // floatSlow is disabled in two cases:
  //   • size === "sm" — small dense grids look busy when floating.
  //   • noReveal — used by the mobile horizontal scroll-snap
  //     carousel. The carousel track has `overflow-y: hidden` so
  //     a 12 px upward float would clip the top edge of the card
  //     ("path cards still cut off during floating"). On the
  //     mobile carousel we keep the cards perfectly still — the
  //     swipe motion itself supplies all the kinaesthetic
  //     feedback, and removing the float also frees the GPU from
  //     animating ten extra translateY keyframes per second.
  const floatDisabled = size === "sm" || noReveal;

  /* ── Mobile carousel path: render a flat, layer-light card ──
   * The mobile horizontal carousel passes `noReveal: true`. On
   * iOS we then skip:
   *   • framer-motion `motion.div` wrapper (it forces a separate
   *     compositor layer for transform animation),
   *   • Tilt3D (4 springs + nested motion.div + preserve-3d
   *     wrapper per card — wasted on a touch-only device that
   *     can't tilt with the cursor),
   *   • the outer perspective:1200px / preserve-3d 3D context,
   *   • the floatSlow keyframe (already gated by floatDisabled).
   * What's left is a plain anchor with the visual styling intact
   * (gradient ring, illustration, chip, title). One DOM tree, no
   * extra compositor layers, no per-frame work — this is the
   * cheapest the card can possibly be while still looking the
   * same. Combined with the carousel's flat (no scale/opacity)
   * rendering, this removes all the GPU pressure that was
   * causing the "path cards still laggy and cut off both
   * directions swipe" report. */
  if (noReveal) {
    return (
      <div
        data-testid={`path-card-${index + 1}`}
        className="group relative h-full"
        data-cursor="hover"
        data-cursor-label={title}
        // v6.13.7 — Float restored as a *non-translating* breathing
        // pulse. Earlier attempts (floatSlow 14 px, floatSlowMobile
        // 5 px) both used translateY inside a prism face whose
        // overflow:hidden clips any vertical movement at the chip
        // and bottom-title edges. floatBreathe replaces the
        // translation with scale 1 → 1.035 + rotateZ 0.35° so the
        // card visibly "breathes" but its centre never moves —
        // physically impossible to clip the face. Stagger via
        // floatDelay keeps neighbouring cards out of phase.
        style={{
          animation: `floatBreathe ${floatDuration} ease-in-out ${floatDelay} infinite`,
          transformOrigin: "center center",
          willChange: "transform",
        }}
      >
        <Tag
          {...linkProps}
          data-testid={`path-card-${index + 1}-link`}
          className={`relative block h-full overflow-hidden ${radius} glass-strong ${ACCENT_PULSE[accent]}`}
          style={{
            // FULLY OPAQUE — the mobile prism stacks 5 cards in 3D
            // space; any transparency in the active card lets the
            // back faces of the prism bleed through. The user
            // reported this as "I can see swiped cards behind".
            // Solid colours + solid SVG illustration on top = no
            // bleed-through, ever.
            background:
              "linear-gradient(180deg, rgb(18,16,30), rgb(8,8,16))",
            boxShadow:
              "0 20px 40px -12px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.07) inset",
          }}
          // v6.13.17 — Restored accent-coloured pulse glow on the
          // mobile carousel branch too. Body stays solid (no
          // bleed-through of swiped cards behind, that fix from
          // v6.13.13 is preserved by the opaque gradient + inner
          // boxShadow above) but the OUTER halo is now in the
          // card's accent colour, matching the desktop look the
          // user just asked to bring back.
          data-mobile-glow
        >
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 ${radius} bg-gradient-to-br ${ACCENT_RING[accent]} opacity-60`}
            style={{
              padding: "1px",
              WebkitMask:
                "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)",
              WebkitMaskComposite: "xor",
              maskComposite: "exclude",
            }}
          />
          {/*
            Mobile carousel inner content fills the ENTIRE Swiper cube
            face. Previously this used `aspect-[3/4]` (=0.75 ratio)
            inside a Swiper slide that the mobile cube sizes at
            ~1/1.42 (=0.70 ratio) — so the inner block was ~88 % of
            the slide height and sat anchored to the top, leaving
            ~30 px of empty glass-strong gradient at the bottom of
            every card. The user reported that as "path cards still
            missing illustrations": the illustration WAS rendering,
            it just wasn't filling the visible card face on mobile,
            so the bottom third of each card looked blank. Switching
            to `h-full w-full` makes the illustration + tint + chip +
            title fill the whole card face every time.
          */}
          <div className={`relative h-full w-full overflow-hidden ${radius}`}>
            <div className={`absolute inset-0 bg-gradient-to-br ${BG_TINT[accent]}`} />
            <PathIllustration
              kind={illustration}
              accent={accent}
              animated={animated}
              noFilter
            />
            <div
              aria-hidden="true"
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, transparent 30%, rgba(5,6,10,0.55) 70%, rgba(5,6,10,0.92) 100%)",
              }}
            />
            <div className="absolute left-5 top-5">
              <span
                data-testid={`path-card-${index + 1}-number`}
                className={`heading-display rounded-full ${chipClass} font-semibold uppercase ring-1 ${ACCENT_CHIP[accent]}`}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
            </div>
            <div className={`absolute inset-x-0 bottom-0 ${textPad}`}>
              <h3
                data-testid={`path-card-${index + 1}-title`}
                className={`heading-display text-balance ${titleClass} font-bold uppercase leading-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.85)]`}
              >
                {title}
              </h3>
              <div
                data-testid={`path-card-${index + 1}-enter-label`}
                className={`${labelClass} inline-flex items-center justify-center gap-1.5 font-semibold uppercase text-white/70`}
              >
                Enter
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              </div>
            </div>
          </div>
        </Tag>
      </div>
    );
  }

  return (
    <motion.div
      data-testid={`path-card-${index + 1}`}
      {...revealProps}
      suppressHydrationWarning
      className="group relative h-full"
      style={{ transformStyle: "preserve-3d", perspective: "1200px" }}
      data-cursor="hover"
      data-cursor-label={title}
    >
      {/*
       * floatSlow restored for `md` cards (the default and the
       * mobile carousel size). Only disabled for size === "sm" to
       * keep dense small-card grids from feeling busy. The mobile
       * sticky-pin carousel does NOT clip vertically — cards live
       * inside a position:sticky / overflow:hidden 100vh container
       * with the cards vertically centered and ample headroom — so
       * the floatSlow ~12 px lift breathes correctly without ever
       * touching an edge.
       */}
      <div style={{ animation: floatDisabled ? "none" : `floatSlow ${floatDuration} ease-in-out ${floatDelay} infinite` }} className="h-full">
        <Tilt3D intensity={0.85} className="h-full">
          <Tag
            {...linkProps}
            data-testid={`path-card-${index + 1}-link`}
            // v6.13.17 — REVERSED v6.13.15. User clarified that the
            // black-outline cards looked dead; they want the
            // accent-coloured glow back. Re-enabled the continuous
            // ACCENT_PULSE halo + the ACCENT_GLOW hover drop-shadow.
            // Kept the solid dark gradient base from v6.13.15 so the
            // card body itself still reads as opaque (no
            // GalaxyBackground bleed-through), but the surrounding
            // halo is now back in each card's accent colour.
            className={`relative block h-full overflow-hidden ${radius} glass-strong transition-all duration-500 ${ACCENT_PULSE[accent]} ${ACCENT_GLOW[accent]}`}
            style={{
              background:
                "linear-gradient(180deg, rgb(18,16,30), rgb(8,8,16))",
            }}
          >
            {/* Animated gradient ring */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-0 ${radius} bg-gradient-to-br ${ACCENT_RING[accent]} opacity-60 transition-opacity duration-500 group-hover:opacity-100`}
              style={{ padding: "1px", WebkitMask: "linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0)", WebkitMaskComposite: "xor", maskComposite: "exclude" }}
            />

            <div
              className={`relative ${aspect} overflow-hidden ${radius}`}
              style={{ transform: "translateZ(28px)", transformStyle: "preserve-3d" }}
            >
              {/* Vector illustration backdrop — renders inline SVG with
                  scene-specific shapes, gradients and floating accents. No
                  raster image (so no visible photo borders / pixel edges). */}
              <div className={`absolute inset-0 bg-gradient-to-br ${BG_TINT[accent]}`} />
              <PathIllustration kind={illustration} accent={accent} animated={animated} />
              <div
                aria-hidden="true"
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, transparent 30%, rgba(5,6,10,0.55) 70%, rgba(5,6,10,0.92) 100%)",
                }}
              />
              {/* Inner shimmer on hover — toned WAY down (was via-white/25
                  which produced an obvious white strip across the card
                  even at low scroll velocities). 8% white + a slower
                  sweep keeps the polish without the laundry-bar look. */}
              <div
                aria-hidden="true"
                className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/[0.08] to-transparent opacity-0 transition-all duration-[1400ms] group-hover:translate-x-full group-hover:opacity-100"
              />
              {/* Index chip */}
              <div
                className="absolute left-5 top-5"
                style={{ transform: "translateZ(40px)" }}
              >
                <span data-testid={`path-card-${index + 1}-number`} className={`heading-display rounded-full ${chipClass} font-semibold uppercase ring-1 backdrop-blur-md ${ACCENT_CHIP[accent]}`}>
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>
              {/* Label */}
              <div
                className={`absolute inset-x-0 bottom-0 ${textPad}`}
                style={{ transform: "translateZ(56px)" }}
              >
                <h3 data-testid={`path-card-${index + 1}-title`} className={`heading-display text-balance ${titleClass} font-bold uppercase leading-tight text-white drop-shadow-[0_2px_18px_rgba(0,0,0,0.85)]`}>
                  {title}
                </h3>
                <div data-testid={`path-card-${index + 1}-enter-label`} className={`${labelClass} inline-flex items-center justify-center gap-1.5 font-semibold uppercase text-white/70 transition-all duration-300 group-hover:gap-3 group-hover:text-white`}>
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
