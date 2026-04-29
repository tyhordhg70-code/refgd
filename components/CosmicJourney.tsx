"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import KineticText from "./KineticText";

/**
 * CosmicJourney — load-once cinematic welcome.
 *
 * ── This rewrite removes the source of the stutter ────────────
 *
 * Two things were causing stutter on scroll, and both are gone:
 *
 * 1) Custom JS smooth-scroll loop. The previous version intercepted
 *    every wheel/touch/key and ran its own requestAnimationFrame
 *    loop calling `window.scrollTo(0, y)` 60 times per second.
 *    That can never beat the browser's native scroll, which runs
 *    on the compositor thread with sub-pixel precision and is
 *    aggressively optimised. Mixing the two also competes with
 *    every other component on the page that listens to scroll.
 *
 *    → We now use NATIVE browser scroll. No wheel interception,
 *      no rAF scroll loop. The page scrolls the way every other
 *      page on the internet scrolls.
 *
 * 2) Heavy compositor effects on the animated stage. The exit
 *    animation rotated the whole stage in 3D (rotateX + scale +
 *    translate). The stage contained `filter: blur(40px)` (nebula)
 *    and `mix-blend-mode: screen` (pulse). Both force the browser
 *    to RE-RASTERISE the entire layer on every frame of the
 *    transform — completely defeating GPU compositing and
 *    saturating the main thread.
 *
 *    → Heavy effects (nebula, pulse) are now SIBLINGS of the
 *      stage, not children, so they don't get transformed at all.
 *      The stage exit is now a simple opacity + small scale fade
 *      (no rotateX, no translate, no blur inside) that the
 *      compositor can handle with zero re-rasterisation.
 *
 * Visual changes you'll notice:
 *   - Scrolling is now native and smooth — no snap, no JS scroll.
 *   - As you scroll past ~15 % of the viewport, the hero fades
 *     out (0.6 s ease-out). Scroll back and it fades in.
 *   - The planet, halo, headline and scroll hint still play their
 *     mount entrance animations. Mount warp streaks are kept (a
 *     single one-shot CSS keyframe burst).
 *   - Exit warp streaks and white flash are removed — they were
 *     visual noise that depended on the (now-removed) snap.
 */
export default function CosmicJourney({ kicker }: { kicker: string }) {
  const reduced = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  const exitingRef = useRef(false);

  // Mount-time radial streaks — CSS @keyframes, fired once.
  const streaks = useMemo(() => {
    const colors = ["#ffe28a", "#a78bfa", "#7be7ff", "#f0abfc", "#ffffff"];
    return Array.from({ length: 24 }, (_, i) => {
      const angle = (i / 24) * Math.PI * 2;
      const reachVw = 60 + ((i * 13) % 40);
      const dx = Math.cos(angle) * reachVw;
      const dy = Math.sin(angle) * reachVw;
      const rotateDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
      return {
        dx,
        dy,
        rotateDeg,
        color: colors[i % colors.length],
        width: 1 + (i % 3),
        length: 70 + (i % 6) * 18,
        delay: 0.1 + (i % 12) * 0.04,
      };
    });
  }, []);

  // Passive, rAF-throttled scroll listener — only toggles a
  // boolean state when the threshold is crossed. Cheap.
  useEffect(() => {
    if (typeof window === "undefined") return;

    let ticking = false;
    let rafId = 0;

    function check() {
      const y = window.scrollY;
      const threshold = Math.max(60, window.innerHeight * 0.15);
      const next = y > threshold;
      if (next !== exitingRef.current) {
        exitingRef.current = next;
        setExiting(next);
      }
      ticking = false;
    }

    function onScroll() {
      if (!ticking) {
        ticking = true;
        rafId = requestAnimationFrame(check);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    check();

    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, []);

  // Stage style — opacity + tiny scale fade. NO rotateX, NO translate,
  // NO blur, NO mix-blend-mode in this layer. The compositor can
  // animate this without re-rasterising.
  const stageStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    willChange: "transform, opacity",
    transform: exiting ? "scale(0.94)" : "scale(1)",
    opacity: exiting ? 0 : 1,
    transition: reduced
      ? "none"
      : "opacity 0.6s ease-out, transform 0.6s ease-out",
  };

  return (
    <section
      data-testid="cosmic-journey"
      className="relative grid w-full place-items-center overflow-hidden"
      style={{ height: "100svh" }}
    >
      <style jsx>{`
        /* Mount-time keyframes (compositor-only) */
        @keyframes cj-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes cj-planet-in {
          from { opacity: 0; transform: scale(0.18); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes cj-halo-in {
          0% { opacity: 0; transform: scale(0.55); }
          50% { opacity: 0.75; transform: scale(0.9); }
          100% { opacity: 0.4; transform: scale(1); }
        }
        @keyframes cj-pulse {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.04); }
        }
        @keyframes cj-mount-streak {
          0% { transform: translate3d(0, 0, 0) scaleX(0.2); opacity: 0; }
          45% {
            transform: translate3d(
                calc(var(--cj-dx) * 0.6),
                calc(var(--cj-dy) * 0.6),
                0
              )
              scaleX(1);
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--cj-dx), var(--cj-dy), 0) scaleX(1.6);
            opacity: 0;
          }
        }
        @keyframes cj-headline-in {
          from { opacity: 0; transform: translate3d(0, 32px, 0) scale(0.95); }
          to { opacity: 1; transform: translate3d(0, 0, 0) scale(1); }
        }
        @keyframes cj-hint-in {
          from { opacity: 0; transform: translate3d(0, 10px, 0); }
          to { opacity: 1; transform: translate3d(0, 0, 0); }
        }

        /* Backdrop nebula — sibling of stage, NOT animated by exit.
           Uses layered radial gradients for soft falloff INSTEAD of
           filter:blur(), which is a known compositor killer. */
        .cj-nebula {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(
              ellipse 70% 60% at 28% 32%,
              rgba(167, 139, 250, 0.42) 0%,
              rgba(167, 139, 250, 0.18) 40%,
              transparent 70%
            ),
            radial-gradient(
              ellipse 60% 55% at 75% 60%,
              rgba(34, 211, 238, 0.34) 0%,
              rgba(34, 211, 238, 0.14) 40%,
              transparent 70%
            ),
            radial-gradient(
              ellipse 65% 60% at 50% 80%,
              rgba(245, 185, 69, 0.3) 0%,
              rgba(245, 185, 69, 0.12) 40%,
              transparent 70%
            );
          opacity: 0;
          animation: cj-fade 0.8s ease-out forwards;
          pointer-events: none;
        }

        /* Mount streaks live OUTSIDE the stage — they finish in ~2 s
           and the user is unlikely to be scrolling yet. */
        .cj-mount-streak-rotor {
          position: absolute;
          width: 0;
          height: 0;
          transform-origin: 0% 50%;
          left: 50%;
          top: 50%;
        }
        .cj-mount-streak {
          display: block;
          opacity: 0;
          transform-origin: 0% 50%;
          animation: cj-mount-streak 1.8s cubic-bezier(0.16, 0.9, 0.3, 1) forwards;
        }

        /* Ambient pulse — sibling of stage, NOT animated by exit.
           No mix-blend-mode (compositor killer). Plain opacity. */
        .cj-pulse {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 60vmin;
          height: 60vmin;
          margin: -30vmin 0 0 -30vmin;
          border-radius: 9999px;
          background: radial-gradient(
            circle,
            rgba(255, 240, 200, 0.25) 0%,
            rgba(255, 240, 200, 0.08) 50%,
            transparent 75%
          );
          opacity: 0;
          animation: cj-fade 0.5s ease-out 2s forwards,
            cj-pulse 8s ease-in-out 2.5s infinite;
          pointer-events: none;
        }

        /* Planet — large box-shadow reduced from 140 + 260 px blur to
           80 + 150 px. Still glowy, much cheaper to rasterise. */
        .cj-planet {
          position: absolute;
          width: 60vmin;
          height: 60vmin;
          border-radius: 9999px;
          background: radial-gradient(
            circle at 30% 28%,
            rgba(255, 237, 180, 1) 0%,
            rgba(245, 185, 69, 0.85) 22%,
            rgba(167, 139, 250, 0.62) 55%,
            rgba(34, 211, 238, 0.32) 85%,
            transparent 100%
          );
          box-shadow: 0 0 80px 30px rgba(245, 185, 69, 0.32),
            0 0 150px 60px rgba(167, 139, 250, 0.22);
          opacity: 0;
          transform: scale(0.18);
          animation: cj-planet-in 1.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
        }

        /* Halo — softer shadows */
        .cj-halo {
          position: absolute;
          width: 88vmin;
          height: 88vmin;
          border-radius: 9999px;
          border: 1px solid rgba(255, 225, 140, 0.35);
          box-shadow: inset 0 0 50px rgba(245, 185, 69, 0.14),
            0 0 80px rgba(167, 139, 250, 0.16);
          opacity: 0;
          transform: scale(0.55);
          animation: cj-halo-in 2s ease-out 0.4s forwards;
          pointer-events: none;
        }

        .cj-headline-wrap {
          opacity: 0;
          transform: translate3d(0, 32px, 0) scale(0.95);
          animation: cj-headline-in 1s cubic-bezier(0.16, 1, 0.3, 1) 1s forwards;
        }

        .cj-hint {
          opacity: 0;
          animation: cj-hint-in 0.7s ease-out 2s forwards;
        }

        @media (prefers-reduced-motion: reduce) {
          .cj-nebula,
          .cj-planet,
          .cj-halo,
          .cj-pulse,
          .cj-headline-wrap,
          .cj-hint,
          .cj-mount-streak {
            animation: none !important;
            opacity: 1;
            transform: none;
          }
          .cj-pulse,
          .cj-mount-streak {
            display: none;
          }
        }
      `}</style>

      {/* Sibling layers — NOT inside the animated stage. They keep
          the cosmic atmosphere visible at all scroll positions. */}
      <div aria-hidden="true" className="cj-nebula" />
      {!reduced && <div aria-hidden="true" className="cj-pulse" />}

      {/* Mount streaks — fire once at mount, also outside the stage */}
      {!reduced && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
        >
          {streaks.map((s, i) => (
            <span
              key={`mount-streak-${i}`}
              className="cj-mount-streak-rotor"
              style={{ transform: `rotate(${s.rotateDeg}deg)` }}
            >
              <span
                className="cj-mount-streak"
                style={
                  {
                    width: s.length,
                    height: s.width,
                    backgroundColor: s.color,
                    boxShadow: `0 0 ${s.width * 6}px ${s.color}`,
                    animationDelay: `${s.delay}s`,
                    "--cj-dx": `${s.dx}vmin`,
                    "--cj-dy": `${s.dy}vmin`,
                  } as CSSProperties
                }
              />
            </span>
          ))}
        </div>
      )}

      {/* Stage — only opacity + small scale, no heavy effects inside.
          The compositor can animate this for free. */}
      <div style={stageStyle} suppressHydrationWarning>
        <div className="cj-planet" suppressHydrationWarning />
        {!reduced && <div aria-hidden="true" className="cj-halo" />}

        <div className="cj-headline-wrap container-wide pointer-events-none relative z-[5] flex flex-col items-center justify-center text-center">
          <KineticText
            as="h1"
            text={kicker}
            className="editorial-display text-balance uppercase text-white text-[clamp(2.5rem,9vw,7rem)] leading-[0.95] tracking-[-0.015em]"
            style={{
              textShadow:
                "0 4px 50px rgba(0,0,0,0.95), 0 0 60px rgba(245,185,69,0.45), 0 2px 14px rgba(0,0,0,0.95)",
            }}
            stagger={0.08}
            delay={1.1}
          />
        </div>

        <div
          data-testid="hero-scroll-indicator"
          className="cj-hint absolute bottom-12 z-[6] flex flex-col items-center gap-3 text-white"
        >
          <span
            className="heading-display text-xs font-bold uppercase tracking-[0.5em] sm:text-sm"
            style={{
              textShadow:
                "0 2px 14px rgba(0,0,0,0.95), 0 0 22px rgba(255,237,180,0.65)",
            }}
          >
            scroll
          </span>
          <span
            className="block h-14 w-[2px] animate-pulseGlow rounded-full bg-gradient-to-b from-amber-200 via-white/80 to-transparent"
            style={{ boxShadow: "0 0 14px rgba(255,237,180,0.7)" }}
          />
        </div>
      </div>
    </section>
  );
}
