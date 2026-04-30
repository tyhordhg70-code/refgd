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
 * shockwave that detonates outward from the centre of the card.
 *
 * Trigger: fires the burst the first time ≥ 50 % of the card is
 * in the viewport. Re-arms when the card fully leaves view so
 * scrolling back replays it.
 *
 * Earlier iterations gated the burst on a 220 ms scroll-idle
 * window, but that gate was incompatible with iOS Safari touch-
 * inertia (scroll events keep firing for 1-2 s after the finger
 * lifts), so the burst effectively never fired on mobile and
 * often missed the scroll-by window on desktop touchpads. The
 * simpler "fire on first in-view, re-arm on exit" model works on
 * every device.
 *
 * The wrapped children render statically at their rest position —
 * no fold-in entrance for the card itself. Only the overlay
 * animates. Honours `prefers-reduced-motion`.
 */
export default function MeshExpansionReveal({
  children,
  className,
  borderRadius = "2.5rem",
  /** how much of the card must be in view to fire the burst. */
  viewportAmount = 0.5,
}: {
  children: ReactNode;
  className?: string;
  borderRadius?: string;
  viewportAmount?: number;
}) {
  const reduced = useReducedMotion();
  // useId() returns colons (e.g. ":r1:") which break SVG IRI
  // references in Safari < 17 — sanitise so url(#mesh-distort-...)
  // always resolves.
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

  // Phase machine for the burst overlay.
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
        // Burst lasts 2.4 s + 0.15 s lead — unmount overlay just
        // after to free GPU layers.
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
        } else if (e.intersectionRatio <= 0.02) {
          // Re-arm when card has fully left viewport.
          setPhase((current) => (current === "done" ? "idle" : current));
        }
      },
      { threshold: [0, 0.02, viewportAmount, 1] },
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
  const overlayStyle: CSSProperties = {
    transformOrigin: "50% 50%",
    borderRadius,
    overflow: "hidden",
    // Insurance: explicit z-index + screen blend so the burst pops
    // visually above ANYTHING inside the card (CTA button, stars,
    // text), against the dark violet backdrop.
    zIndex: 40,
    mixBlendMode: "screen",
  };

  return (
    <div ref={containerRef} className={className} style={wrapperStyle}>
      <div className="relative">
        {children}

        {phase === "playing" && (
          <motion.div
            key={burstKey}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={overlayStyle}
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
                  <stop offset="0%" stopColor="rgba(255, 220, 130, 1)" />
                  <stop offset="50%" stopColor="rgba(192, 132, 252, 1)" />
                  <stop offset="100%" stopColor="rgba(56, 232, 255, 0.95)" />
                </linearGradient>
              </defs>
              <g
                filter={`url(#mesh-distort-${filterId})`}
                stroke={`url(#mesh-stroke-${filterId})`}
                strokeWidth={isMobile ? "0.55" : "0.42"}
                fill="none"
                style={
                  isMobile
                    ? { filter: "drop-shadow(0 0 2px rgba(255, 220, 130, 0.7))" }
                    : { filter: "drop-shadow(0 0 6px rgba(255, 220, 130, 0.85))" }
                }
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
        )}
      </div>
    </div>
  );
}
