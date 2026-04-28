"use client";
import { useMemo } from "react";

/**
 * Sparse "liquid-glass" abstract orbs. Replaces the dense particle
 * fields that cluttered the old hero. Each orb is a translucent,
 * refractive blob with an inner highlight, rim light, and a slow
 * organic drift — the page now has plenty of room to breathe.
 *
 * Pure CSS animation (one cheap keyframe per orb), no JS per-frame
 * cost, deterministic positions for SSR safety. Sits absolute inside
 * its parent (which must clip overflow).
 */
export default function LiquidGlassOrbs({
  count = 7,
  className = "",
  paletteOverride,
}: {
  count?: number;
  className?: string;
  paletteOverride?: string[];
}) {
  // Theme palette — keeps the orbs in family with the cosmic gold /
  // violet / cyan accent system used everywhere else on the site.
  const PAL = useMemo(
    () =>
      paletteOverride ?? [
        "245, 185, 69",   // amber gold
        "167, 139, 250",  // violet
        "103, 232, 249",  // cyan
        "244, 114, 182",  // pink (used sparingly)
      ],
    [paletteOverride],
  );

  const orbs = useMemo(() => {
    return Array.from({ length: count }, (_, i) => {
      // Deterministic pseudo-random — keeps SSR & hydration aligned.
      const s = (i + 1) * 9301 + 49297;
      const r1 = (s % 233280) / 233280;
      const r2 = ((s * 7) % 233280) / 233280;
      const r3 = ((s * 13) % 233280) / 233280;
      const r4 = ((s * 19) % 233280) / 233280;
      const r5 = ((s * 31) % 233280) / 233280;
      const c = PAL[Math.floor(r5 * PAL.length)];
      return {
        left: `${(r1 * 90 + 5).toFixed(2)}%`,
        top: `${(r2 * 90 + 5).toFixed(2)}%`,
        // Bigger, fewer orbs — visual breathing room is the goal.
        size: 180 + r3 * 220,
        rgb: c,
        dur: 26 + r3 * 22,
        delay: -r4 * 20,
        driftX: (r2 - 0.5) * 90,
        driftY: (r3 - 0.5) * 80,
        rot: (r1 - 0.5) * 50,
      };
    });
  }, [count, PAL]);

  return (
    <div
      aria-hidden="true"
      data-testid="liquid-glass-orbs"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      {orbs.map((o, i) => (
        <span
          key={i}
          className="lg-orb absolute rounded-full"
          style={{
            left: o.left,
            top: o.top,
            width: o.size,
            height: o.size,
            // Layered radial gradient: deep core, refractive rim, soft halo.
            background: `
              radial-gradient(circle at 30% 28%,
                rgba(255,255,255,0.55) 0%,
                rgba(${o.rgb}, 0.38) 18%,
                rgba(${o.rgb}, 0.18) 42%,
                rgba(${o.rgb}, 0.06) 70%,
                transparent 78%)`,
            // Glassy refractive feel — soft blur + faint rim shadow.
            // backdrop-filter is intentionally OMITTED here: it's the
            // single biggest cause of scroll-jitter on mobile (every
            // frame re-blurs everything beneath the orb). The radial
            // gradient + filter:blur(2px) gives the same liquid-glass
            // look at a fraction of the GPU cost.
            boxShadow: `
              inset 0 0 60px rgba(255,255,255,0.12),
              inset 0 0 14px rgba(${o.rgb}, 0.45),
              0 30px 90px -10px rgba(${o.rgb}, 0.30)`,
            filter: "blur(2px)",
            mixBlendMode: "screen",
            opacity: 0.78,
            ["--lg-x" as never]: `${o.driftX}px`,
            ["--lg-y" as never]: `${o.driftY}px`,
            ["--lg-r" as never]: `${o.rot}deg`,
            ["--lg-dur" as never]: `${o.dur}s`,
            ["--lg-delay" as never]: `${o.delay}s`,
            transform: "translate3d(0, 0, 0)",
            willChange: "transform, opacity",
          }}
        />
      ))}
      <style jsx>{`
        .lg-orb {
          animation: lg-glass-drift var(--lg-dur, 30s) ease-in-out
            var(--lg-delay, 0s) infinite alternate;
        }
        @keyframes lg-glass-drift {
          0% {
            transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
          }
          50% {
            transform: translate3d(
                calc(var(--lg-x) * 0.6),
                calc(var(--lg-y) * 0.7),
                0
              )
              rotate(calc(var(--lg-r) * 0.5)) scale(1.06);
          }
          100% {
            transform: translate3d(var(--lg-x), var(--lg-y), 0)
              rotate(var(--lg-r)) scale(0.96);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .lg-orb {
            animation: none;
          }
        }
      `}</style>
    </div>
  );
}
