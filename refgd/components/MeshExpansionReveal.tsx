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
import MeshEntrance from "./MeshEntrance";
import { useEntranceReady } from "@/lib/loading-screen-gate";

/**
 * MeshExpansionReveal — bright glow flash + distorted wireframe
 * shockwave that detonates over the wrapped card.
 *
 * Trigger model (Round 16, after multiple rounds of "not visible"):
 *   - ALWAYS fires once on mount after 1400 ms — guaranteed first
 *     play even if IO never reports a usable intersection.
 *   - IO re-arms on re-entry (>= 32 % visible after dropping
 *     under 20 %), so casual scroll-ups replay the burst.
 *   - Reduced-motion is NOT a hard block here (the user has
 *     repeatedly insisted on seeing this animation; it's a
 *     one-shot CTA, not a continuous distraction).
 *
 * Two visual layers (no blend modes — direct alpha compositing
 * for guaranteed visibility on every backdrop):
 *   1. Bright radial glow (white → amber → violet → cyan)
 *   2. Distorted wireframe grid on top
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
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const fire = () => {
    if (phaseRef.current !== "idle") return;
    setBurstKey((k) => k + 1);
    setPhase("playing");
    window.setTimeout(() => {
      setPhase((c) => (c === "playing" ? "done" : c));
    }, 2700);
  };

  // ──────────────────────────────────────────────────────────────
  // GUARANTEED FIRST PLAY — fires unconditionally 1400 ms after
  // the loading splash has lifted, regardless of intersection.
  // This bypasses all the IO edge-cases that have been blamed for
  // "burst never plays" in the previous rounds, while ensuring the
  // burst doesn't fire SILENTLY behind the splash overlay (which
  // is what made the home-page entrance invisible to first-time
  // visitors).
  // ──────────────────────────────────────────────────────────────
  const entranceReady = useEntranceReady();
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!entranceReady) return;
    const t = window.setTimeout(() => fire(), 1400);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entranceReady]);

  // ──────────────────────────────────────────────────────────────
  // Re-trigger on viewport re-entry. After the first guaranteed
  // play, this lets users see the burst again every time they
  // scroll back to the CTA.
  // ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    const el = containerRef.current;
    if (!el) return;

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        if (e.intersectionRatio >= viewportAmount) {
          fire();
        } else if (e.intersectionRatio < 0.2) {
          setPhase((c) => (c === "done" ? "idle" : c));
        }
      },
      { threshold: [0, 0.05, 0.2, viewportAmount, 0.5, 1] },
    );
    io.observe(el);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportAmount]);

  const wrapperStyle: CSSProperties = { perspective: "1600px" };

  // Common overlay style for both bright-glow and wireframe layers.
  // z-index 60 is high enough to escape any internal card-content
  // stacking (text overlays, animated boxes, etc.) — these are all
  // at auto z-index inside the wrapped card, so 60 reliably wins.
  const baseOverlay: CSSProperties = {
    transformOrigin: "50% 50%",
    borderRadius,
    overflow: "hidden",
    zIndex: 60,
  };

  return (
    <div ref={containerRef} className={className} style={wrapperStyle}>
      <div className="relative">
        {/* Box-itself entrance: lusion.co-style 3D distorted mesh that
            warps the wrapped card on first viewport entry, then
            settles to the final state with no residual GPU cost. The
            wireframe / glow shockwave layers below still detonate
            on top after the box has formed. */}
        <MeshEntrance
          duration={1200}
          warp={isMobile ? 60 : 95}
          blur={isMobile ? 10 : 16}
          startScale={0.82}
          startRotateX={-18}
        >
          {children}
        </MeshEntrance>

        {phase === "playing" && (
          <>
            {/* Layer 1 — bright glow flash. White core → amber →
                violet → cyan. Solid alpha, no blend mode, guaranteed
                visible. */}
            <motion.div
              key={`glow-${burstKey}`}
              aria-hidden="true"
              data-mesh-burst="glow"
              className="pointer-events-none absolute inset-0"
              style={{
                ...baseOverlay,
                background:
                  "radial-gradient(ellipse at center, rgba(255, 255, 255, 1) 0%, rgba(255, 220, 130, 0.95) 22%, rgba(192, 132, 252, 0.78) 50%, rgba(56, 232, 255, 0.42) 75%, transparent 100%)",
              }}
              initial={{ opacity: 0, scale: 0.2 }}
              animate={{
                opacity: [0, 0.7, 0.55, 0],
                scale: [0.2, 0.85, 1.2, 1.5],
              }}
              transition={{
                duration: 2.4,
                ease: [0.22, 1, 0.36, 1],
                delay: 0.05,
                times: [0, 0.2, 0.55, 1],
              }}
            />

            {/* Layer 2 — distorted wireframe grid on top. */}
            <motion.div
              key={`mesh-${burstKey}`}
              aria-hidden="true"
              data-mesh-burst="wireframe"
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
                    <stop offset="0%" stopColor="rgba(255, 250, 220, 1)" />
                    <stop offset="50%" stopColor="rgba(216, 180, 254, 1)" />
                    <stop offset="100%" stopColor="rgba(125, 211, 252, 1)" />
                  </linearGradient>
                </defs>
                <g
                  filter={`url(#mesh-distort-${filterId})`}
                  stroke={`url(#mesh-stroke-${filterId})`}
                  strokeWidth={isMobile ? "0.95" : "0.6"}
                  fill="none"
                  style={{
                    filter: isMobile
                      ? "drop-shadow(0 0 4px rgba(255, 250, 220, 0.95))"
                      : "drop-shadow(0 0 8px rgba(255, 250, 220, 0.95))",
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

