"use client";
import { motion, useReducedMotion } from "framer-motion";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
  type CSSProperties,
} from "react";

/**
 * MeshExpansionReveal — wraps a card with a distorted wireframe
 * shockwave PLUS a bright glow flash that detonates outward from
 * the centre of the card.
 *
 * The visual is two-layered:
 *   1. A bright radial-gradient glow (solid colour, no blend mode)
 *      that flashes 0 → 0.55 → 0 across the burst. Guaranteed
 *      visibility on every backdrop.
 *   2. The distorted wireframe grid on top — adds the "tearing
 *      mesh" texture the design called for.
 *
 * Trigger model: fires the moment ≥ 32 % of the card is in the
 * viewport. Re-arms aggressively (any time the card drops under
 * 20 % visible AFTER a burst completes), so users see the burst
 * multiple times during typical scrolling.
 *
 * Honours `prefers-reduced-motion`.
 */
export default function MeshExpansionReveal({
  children,
  className,
  borderRadius = "2.5rem",
  viewportAmount = 0.32,
}: {
  children: ReactNode;
  className?: string;
  borderRadius?: string;
  viewportAmount?: number;
}) {
  const reduced = useReducedMotion();
  // Sanitise useId() colons so url(#mesh-distort-...) IRI refs
  // resolve in Safari < 17.
  const filterId = useId().replace(/:/g, "");
  const containerRef = useRef<HTMLDivElement>(null);

  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    if (reduced) return;
    if (typeof window === "undefined") return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    let doneTimer = 0;

    const fire = () => {
      if (cancelled) return;
      setPhase((current) => {
        if (current !== "idle") return current;
        setBurstKey((k) => k + 1);
        doneTimer = window.setTimeout(() => {
          if (!cancelled) setPhase("done");
        }, 2700);
        return "playing";
      });
    };

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        if (e.intersectionRatio >= viewportAmount) {
          fire();
        } else if (e.intersectionRatio < 0.2) {
          // Aggressive re-arm: drop back to idle whenever the box
          // is mostly out of view AFTER the burst completed. So a
          // small scroll past + scroll back will replay the burst.
          setPhase((current) => (current === "done" ? "idle" : current));
        }
      },
      { threshold: [0, 0.05, 0.2, viewportAmount, 0.5, 1] },
    );
    io.observe(el);

    return () => {
      cancelled = true;
      io.disconnect();
      window.clearTimeout(doneTimer);
    };
  }, [reduced, viewportAmount]);

  if (reduced) {
    return (
      <div ref={containerRef} className={className}>
        {children}
      </div>
    );
  }

  const wrapperStyle: CSSProperties = { perspective: "1600px" };

  // Both overlay layers share these style basics (rounded clip,
  // sit on top of the card, no pointer events, dedicated z-index).
  // NOTE: NO mix-blend-mode — direct alpha compositing only, so
  // visibility is guaranteed on any backdrop.
  const baseOverlay: CSSProperties = {
    transformOrigin: "50% 50%",
    borderRadius,
    overflow: "hidden",
    zIndex: 40,
  };

  return (
    <div ref={containerRef} className={className} style={wrapperStyle}>
      <div className="relative">
        {children}

        {phase === "playing" && (
          <>
            {/* Layer 1 — bright glow flash. Solid radial gradient,
                guaranteed visible. Scales from 0.2 → 1.4 over the
                burst, opacity peaks at 0.55 mid-burst then fades. */}
            <motion.div
              key={`glow-${burstKey}`}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                ...baseOverlay,
                background:
                  "radial-gradient(ellipse at center, rgba(255, 220, 130, 0.95) 0%, rgba(192, 132, 252, 0.65) 35%, rgba(56, 232, 255, 0.30) 65%, transparent 100%)",
              }}
              initial={{ opacity: 0, scale: 0.2 }}
              animate={{
                opacity: [0, 0.55, 0.45, 0],
                scale: [0.2, 0.85, 1.2, 1.5],
              }}
              transition={{
                duration: 2.4,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.1,
                times: [0, 0.2, 0.55, 1],
              }}
            />

            {/* Layer 2 — distorted wireframe grid on top. */}
            <motion.div
              key={`mesh-${burstKey}`}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={baseOverlay}
              initial={{ opacity: 0, scale: 0.1 }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0.1, 0.7, 1.25, 1.7],
              }}
              transition={{
                duration: 2.4,
                ease: [0.16, 1, 0.3, 1],
                delay: 0.15,
                times: [0, 0.18, 0.6, 1],
              }}
            >
              <svg
                className="h-full w-full overflow-visible"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
              >
                <defs>
                  <filter
                    id={`mesh-distort-${filterId}`}
                    x="-30%"
                    y="-30%"
                    width="160%"
                    height="160%"
                  >
                    <feTurbulence
                      type="fractalNoise"
                      baseFrequency={isMobile ? "0.06" : "0.04"}
                      numOctaves={isMobile ? "1" : "2"}
                      seed="7"
                    />
                    <feDisplacementMap
                      in="SourceGraphic"
                      scale={isMobile ? "4" : "8"}
                    />
                  </filter>
                  <linearGradient
                    id={`mesh-stroke-${filterId}`}
                    x1="0"
                    x2="1"
                    y1="0"
                    y2="1"
                  >
                    <stop offset="0%" stopColor="rgba(255, 240, 180, 1)" />
                    <stop offset="50%" stopColor="rgba(216, 180, 254, 1)" />
                    <stop offset="100%" stopColor="rgba(125, 211, 252, 1)" />
                  </linearGradient>
                </defs>
                <g
                  filter={`url(#mesh-distort-${filterId})`}
                  stroke={`url(#mesh-stroke-${filterId})`}
                  strokeWidth={isMobile ? "0.85" : "0.55"}
                  fill="none"
                  style={{
                    filter: isMobile
                      ? "drop-shadow(0 0 3px rgba(255, 240, 180, 0.95))"
                      : "drop-shadow(0 0 8px rgba(255, 240, 180, 0.95))",
                  }}
                >
                  {(() => {
                    const N = isMobile ? 9 : 14;
                    const last = N - 1;
                    const verticals = Array.from({ length: N }, (_, i) => {
                      const x = (i / last) * 100;
                      return (
                        <line key={`v-${i}`} x1={x} y1={-10} x2={x} y2={110} />
                      );
                    });
                    const horizontals = Array.from({ length: N }, (_, i) => {
                      const y = (i / last) * 100;
                      return (
                        <line key={`h-${i}`} x1={-10} y1={y} x2={110} y2={y} />
                      );
                    });
                    return (
                      <>
                        {verticals}
                        {horizontals}
                      </>
                    );
                  })()}
                  <line x1="-5" y1="-5" x2="105" y2="105" />
                  <line x1="105" y1="-5" x2="-5" y2="105" />
                </g>
              </svg>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
