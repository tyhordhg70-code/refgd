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
 * ── Trigger ───────────────────────────────────────────────────
 * Earlier versions used framer-motion's `whileInView`, which fired
 * the burst the instant the card crossed 25 % into the viewport.
 * The user reported (correctly) that the burst then plays while
 * their eye is still tracking the scroll past it — they barely
 * register that anything happened.
 *
 * The new trigger fires the burst only when BOTH:
 *
 *   • The card is ≥ 50 % visible in the viewport
 *     (IntersectionObserver, threshold list).
 *
 *   • The page has been scroll-idle for ≥ 400 ms
 *     (debounced `scroll` listener).
 *
 * In other words, the burst waits until the user has actually
 * SETTLED on the card — they have stopped scrolling, the card is
 * centred in their view, and only then does the shockwave fire.
 *
 * After the burst plays, the overlay unmounts and stays unmounted
 * until the card leaves the viewport entirely (intersectionRatio
 * → 0). When the user later scrolls back to the card, the trigger
 * re-arms and the burst plays again on next settle.
 *
 * ── Card pose ─────────────────────────────────────────────────
 * The wrapped children render statically at their rest position
 * from the very first paint. There is NO fold-in / scale-up
 * entrance for the card itself — only the overlay animates. This
 * means the card is always visible and never appears "missing"
 * before the burst fires.
 *
 * ── Mobile ────────────────────────────────────────────────────
 * Mobile gets the same burst with cheaper SVG params:
 *   • baseFrequency 0.06 (was 0.035) — smaller noise cells
 *   • numOctaves 1 (was 2) — halves displacement compute cost
 *   • feDisplacementMap scale 3 (was 6)
 *   • 8×8 grid lines (was 13×13) — 60 % fewer line segments
 *   • drop-shadow filter disabled (gradient stroke already glows)
 *
 * Honours `prefers-reduced-motion` (renders a plain wrapper, no
 * overlay).
 */
export default function MeshExpansionReveal({
  children,
  className,
  borderRadius = "2.5rem",
  /** ms of scroll idleness required before the burst is allowed to fire. */
  idleDelay = 400,
  /** how much of the card must be in view to count as "settled" (0-1). */
  viewportAmount = 0.5,
}: {
  children: ReactNode;
  className?: string;
  borderRadius?: string;
  idleDelay?: number;
  viewportAmount?: number;
}) {
  const reduced = useReducedMotion();
  const filterId = useId();
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
  //   idle    — overlay invisible, waiting for trigger conditions
  //   playing — burst is currently animating
  //   done    — burst finished; overlay stays unmounted until the
  //             card leaves view, at which point we re-arm to idle
  const [phase, setPhase] = useState<"idle" | "playing" | "done">("idle");
  // Bump key on every replay so framer re-runs the keyframes from
  // the start instead of holding the previous end-state.
  const [burstKey, setBurstKey] = useState(0);

  useEffect(() => {
    if (reduced) return;
    if (typeof window === "undefined") return;
    const el = containerRef.current;
    if (!el) return;

    let inView = false;
    let scrollIdle = false;
    let scrollTimer = 0;
    let cancelled = false;

    const tryFire = () => {
      if (cancelled) return;
      if (inView && scrollIdle) {
        // Use functional update to avoid stale closure on `phase`.
        setPhase((current) => {
          if (current !== "idle") return current;
          setBurstKey((k) => k + 1);
          // After the burst plays out (~1.6 s + 0.15 s delay), mark
          // it done so the overlay unmounts and stops costing paint.
          window.setTimeout(() => {
            if (!cancelled) setPhase("done");
          }, 1900);
          return "playing";
        });
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        inView = e.isIntersecting && e.intersectionRatio >= viewportAmount;
        if (e.intersectionRatio === 0) {
          // Card has fully left the viewport — re-arm so the next
          // return scroll plays the burst again.
          setPhase((current) => (current === "done" ? "idle" : current));
        } else if (inView) {
          tryFire();
        }
      },
      { threshold: [0, 0.25, viewportAmount, 0.75, 1] },
    );
    io.observe(el);

    const onScroll = () => {
      scrollIdle = false;
      window.clearTimeout(scrollTimer);
      scrollTimer = window.setTimeout(() => {
        scrollIdle = true;
        tryFire();
      }, idleDelay);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // Bootstrap: if the user is already idle when the component
    // mounts (e.g. they scrolled directly to a deep link), the
    // `scroll` event will never fire — kick off an idle timer
    // immediately so the burst can still play once it's in view.
    scrollTimer = window.setTimeout(() => {
      scrollIdle = true;
      tryFire();
    }, idleDelay);

    return () => {
      cancelled = true;
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.clearTimeout(scrollTimer);
    };
  }, [reduced, idleDelay, viewportAmount]);

  // Reduced-motion users get a plain wrapper, no overlay ever.
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
  };

  return (
    <div ref={containerRef} className={className} style={wrapperStyle}>
      <div className="relative">
        {children}

        {/* Distorted mesh overlay — only mounted while phase ===
            "playing". After the burst settles it unmounts entirely
            so it never costs a single paint frame of overhead. */}
        {phase === "playing" && (
          <motion.div
            key={burstKey}
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={overlayStyle}
            initial={{ opacity: 0, scale: 0.1 }}
            animate={{ opacity: [0, 0.85, 0], scale: 1.6 }}
            transition={{
              duration: 1.6,
              ease: [0.16, 1, 0.3, 1],
              delay: 0.15,
              times: [0, 0.45, 1],
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
                  x="-25%"
                  y="-25%"
                  width="150%"
                  height="150%"
                >
                  <feTurbulence
                    type="fractalNoise"
                    baseFrequency={isMobile ? "0.06" : "0.035"}
                    numOctaves={isMobile ? "1" : "2"}
                    seed="7"
                  />
                  <feDisplacementMap
                    in="SourceGraphic"
                    scale={isMobile ? "3" : "6"}
                  />
                </filter>
                <linearGradient
                  id={`mesh-stroke-${filterId}`}
                  x1="0"
                  x2="1"
                  y1="0"
                  y2="1"
                >
                  <stop offset="0%" stopColor="rgba(255, 215, 130, 0.95)" />
                  <stop offset="55%" stopColor="rgba(167, 139, 250, 0.85)" />
                  <stop offset="100%" stopColor="rgba(34, 211, 238, 0.75)" />
                </linearGradient>
              </defs>
              <g
                filter={`url(#mesh-distort-${filterId})`}
                stroke={`url(#mesh-stroke-${filterId})`}
                strokeWidth={isMobile ? "0.4" : "0.3"}
                fill="none"
                style={
                  isMobile
                    ? undefined
                    : { filter: "drop-shadow(0 0 4px rgba(255, 215, 130, 0.6))" }
                }
              >
                {(() => {
                  const N = isMobile ? 8 : 13;
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
