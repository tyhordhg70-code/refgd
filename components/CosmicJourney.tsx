"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { type CSSProperties } from "react";
import { useReducedMotion } from "framer-motion";
import KineticText from "./KineticText";

/**
 * CosmicJourney — load-once cinematic warp + INPUT-INTERCEPTING
 * bidirectional snap to/from the paths section.
 *
 * ── Architecture: 100% compositor-thread animation ─────────────
 *
 * Every visual animation in this hero — mount streaks, planet
 * entrance, halo entrance, ambient pulse, headline reveal, scroll
 * hint, stage exit, warp streaks, white flash — is implemented as
 * a CSS @keyframes animation or CSS transition on transform/opacity.
 * That means the GPU compositor handles them; the main thread is
 * free for the rAF smooth-scroll loop and React state updates.
 *
 * The previous version used framer-motion for these animations,
 * which interpolates each property on the JS main thread every rAF
 * tick. With ~38 motion components mounted (36 mount streaks + an
 * infinite ambient pulse + headline + scroll hint + stage), the
 * main thread was doing thousands of style writes per second. When
 * the user wheel-scrolled, the scroll rAF had to compete for time
 * with all of that work — hence the visible stutter at the start
 * of every scroll-down and scroll-up.
 *
 * Direction-aware stage transition:
 *   Exit  → 1.1 s cubic-in-out — cinematic, weighty
 *   Return → 0.65 s cubic-out — eager rush back so the hero is
 *           visible early during scroll-up, no blank space.
 */
export default function CosmicJourney({ kicker }: { kicker: string }) {
  const reduced = useReducedMotion();
  const [exiting, setExiting] = useState(false);
  const [exitKey, setExitKey] = useState(0);
  const exitingRef = useRef(false);

  // 36 mount streaks — radial expansion during the welcome's load-in.
  // Driven by CSS @keyframes (per-element CSS variables for end pos).
  const streaks = useMemo(() => {
    const colors = ["#ffe28a", "#a78bfa", "#7be7ff", "#f0abfc", "#ffffff"];
    return Array.from({ length: 36 }, (_, i) => {
      const angle = (i / 36) * Math.PI * 2;
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
        delay: 0.1 + (i % 14) * 0.04,
      };
    });
  }, []);

  // 20 exit warp streaks — also CSS @keyframes.
  const warpStreaks = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => {
        const angle = (i / 20) * Math.PI * 2;
        return {
          dx: Math.cos(angle) * 120,
          dy: Math.sin(angle) * 120,
          rotateDeg: (angle * 180) / Math.PI,
        };
      }),
    [],
  );

  // ── Input-intercepting snap controller ─────────────────────
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (reduced) return;

    let isAnimating = false;
    let activeRAF = 0;

    function smoothScrollTo(targetY: number, duration: number) {
      const startY = window.scrollY;
      const dist = targetY - startY;
      if (Math.abs(dist) < 4) return;
      isAnimating = true;
      cancelAnimationFrame(activeRAF);
      const start = performance.now();
      function step(now: number) {
        const t = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - t, 3);
        window.scrollTo(0, startY + dist * eased);
        if (t < 1) {
          activeRAF = requestAnimationFrame(step);
        } else {
          window.setTimeout(() => {
            isAnimating = false;
          }, 180);
        }
      }
      activeRAF = requestAnimationFrame(step);
    }

    function getTargets() {
      const innerH = window.innerHeight;
      return {
        pathsTarget: innerH - 20,
        exitThreshold: Math.max(60, innerH * 0.08),
      };
    }

    function onScroll() {
      const y = window.scrollY;
      const { exitThreshold } = getTargets();
      const next = y > exitThreshold;
      if (next !== exitingRef.current) {
        exitingRef.current = next;
        if (next) setExitKey((k) => k + 1);
        setExiting(next);
      }
    }

    function onWheel(e: WheelEvent) {
      if (e.ctrlKey || e.metaKey) return;
      if (Math.abs(e.deltaY) < 1) return;
      const y = window.scrollY;
      const { pathsTarget } = getTargets();

      if (y < pathsTarget - 4) {
        e.preventDefault();
        if (isAnimating) return;
        if (e.deltaY > 0) smoothScrollTo(pathsTarget, 900);
        else if (e.deltaY < 0 && y > 8) smoothScrollTo(0, 900);
      } else if (y < pathsTarget + 12 && e.deltaY < 0) {
        e.preventDefault();
        if (isAnimating) return;
        smoothScrollTo(0, 900);
      }
    }

    let touchStartY = 0;
    let touchActive = false;
    let touchTriggered = false;

    function onTouchStart(e: TouchEvent) {
      if (e.touches.length !== 1) return;
      const y = window.scrollY;
      const { pathsTarget } = getTargets();
      touchActive = y < pathsTarget + 12;
      touchStartY = e.touches[0].clientY;
      touchTriggered = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (!touchActive || e.touches.length !== 1) return;
      const y = window.scrollY;
      const { pathsTarget } = getTargets();
      e.preventDefault();
      if (isAnimating || touchTriggered) return;
      const currentY = e.touches[0].clientY;
      const swipeDelta = touchStartY - currentY;
      if (Math.abs(swipeDelta) < 12) return;
      touchTriggered = true;
      if (swipeDelta > 0 && y < pathsTarget - 4) smoothScrollTo(pathsTarget, 900);
      else if (swipeDelta < 0 && y > 8) smoothScrollTo(0, 900);
    }

    function onTouchEnd() {
      touchActive = false;
    }

    function onKey(e: KeyboardEvent) {
      const y = window.scrollY;
      const { pathsTarget } = getTargets();
      const isDown =
        e.key === "PageDown" ||
        e.key === "ArrowDown" ||
        e.key === " " ||
        e.key === "End";
      const isUp =
        e.key === "PageUp" || e.key === "ArrowUp" || e.key === "Home";
      if (isDown && y < pathsTarget - 4) {
        e.preventDefault();
        if (!isAnimating) smoothScrollTo(pathsTarget, 900);
      } else if (isUp && y < pathsTarget + 12 && y > 8) {
        e.preventDefault();
        if (!isAnimating) smoothScrollTo(0, 900);
      }
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("keydown", onKey);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("keydown", onKey);
      cancelAnimationFrame(activeRAF);
    };
  }, [reduced]);

  // CSS-transition stage style — direction-aware easing.
  const stageStyle: CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "grid",
    placeItems: "center",
    transformStyle: "preserve-3d",
    transformOrigin: "50% 28%",
    willChange: "transform, opacity",
    transform: exiting
      ? "scale(0.08) rotateX(-55deg) translate3d(0, -200px, 0)"
      : "scale(1) rotateX(0deg) translate3d(0, 0, 0)",
    opacity: exiting ? 0 : 1,
    transition: reduced
      ? "none"
      : exiting
        ? "transform 1.1s cubic-bezier(0.65, 0, 0.35, 1), opacity 0.95s cubic-bezier(0.65, 0, 0.35, 1)"
        : "transform 0.65s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease-out",
  };

  return (
    <section
      data-testid="cosmic-journey"
      className="relative grid w-full place-items-center overflow-hidden"
      style={{
        height: "100svh",
        contain: "layout paint",
        perspective: "1400px",
        transform: "translate3d(0,0,0)",
      }}
    >
      <style jsx>{`
        /* ── Mount entrance keyframes (compositor-only) ── */
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
          0%, 100% { opacity: 0.55; transform: scale(1); }
          25%, 75% { opacity: 0.85; transform: scale(1.04); }
          50% { opacity: 0.55; transform: scale(1); }
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

        /* ── Exit-time keyframes (compositor-only) ── */
        @keyframes cj-flash {
          0% { opacity: 0; }
          40% { opacity: 0.45; }
          90%, 100% { opacity: 0; }
        }
        @keyframes cj-streak {
          0% { transform: translate3d(0, 0, 0) scaleX(0.5); opacity: 0; }
          50% {
            transform: translate3d(
                calc(var(--cj-dx) / 2),
                calc(var(--cj-dy) / 2),
                0
              )
              scaleX(8);
            opacity: 1;
          }
          100% {
            transform: translate3d(var(--cj-dx), var(--cj-dy), 0) scaleX(14);
            opacity: 0;
          }
        }

        .cj-nebula {
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 28% 32%, rgba(167, 139, 250, 0.5) 0%, transparent 45%),
            radial-gradient(ellipse at 75% 60%, rgba(34, 211, 238, 0.42) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 80%, rgba(245, 185, 69, 0.35) 0%, transparent 50%);
          filter: blur(40px);
          opacity: 0;
          animation: cj-fade 0.8s ease-out forwards;
          pointer-events: none;
        }

        .cj-mount-streak-rotor {
          position: absolute;
          width: 0;
          height: 0;
          transform-origin: 0% 50%;
        }
        .cj-mount-streak {
          display: block;
          opacity: 0;
          transform-origin: 0% 50%;
          animation: cj-mount-streak 1.8s cubic-bezier(0.16, 0.9, 0.3, 1) forwards;
          will-change: transform, opacity;
        }

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
          box-shadow: 0 0 140px 50px rgba(245, 185, 69, 0.4),
            0 0 260px 90px rgba(167, 139, 250, 0.28);
          opacity: 0;
          transform: scale(0.18);
          animation: cj-planet-in 1.4s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
          will-change: transform, opacity;
        }

        .cj-pulse {
          position: absolute;
          width: 60vmin;
          height: 60vmin;
          border-radius: 9999px;
          background: radial-gradient(
            circle,
            rgba(255, 255, 255, 0.35) 0%,
            transparent 60%
          );
          mix-blend-mode: screen;
          opacity: 0;
          /* delay 2s, then infinite 8s loop */
          animation: cj-fade 0.5s ease-out 2s forwards,
            cj-pulse 8s ease-in-out 2.5s infinite;
          will-change: transform, opacity;
          pointer-events: none;
        }

        .cj-halo {
          position: absolute;
          width: 88vmin;
          height: 88vmin;
          border-radius: 9999px;
          border: 1px solid rgba(255, 225, 140, 0.4);
          box-shadow: inset 0 0 90px rgba(245, 185, 69, 0.18),
            0 0 140px rgba(167, 139, 250, 0.2);
          opacity: 0;
          transform: scale(0.55);
          animation: cj-halo-in 2s ease-out 0.4s forwards;
          will-change: transform, opacity;
          pointer-events: none;
        }

        .cj-headline-wrap {
          opacity: 0;
          transform: translate3d(0, 32px, 0) scale(0.95);
          animation: cj-headline-in 1s cubic-bezier(0.16, 1, 0.3, 1) 1s forwards;
          will-change: transform, opacity;
        }

        .cj-hint {
          opacity: 0;
          animation: cj-hint-in 0.7s ease-out 2s forwards;
          transition: opacity 0.4s ease-out;
        }
        .cj-hint--gone {
          opacity: 0 !important;
        }

        /* Exit-time effects */
        .cj-flash {
          position: absolute;
          inset: 0;
          background: #fff;
          opacity: 0;
          animation: cj-flash 0.85s ease-out forwards;
          will-change: opacity;
        }
        .cj-warp-rotor {
          position: absolute;
          width: 0;
          height: 0;
          transform-origin: 0% 50%;
        }
        .cj-warp-streak {
          display: block;
          width: 110px;
          height: 2px;
          background: linear-gradient(
            to right,
            transparent 0%,
            rgba(255, 255, 255, 0.95) 50%,
            transparent 100%
          );
          box-shadow: 0 0 14px rgba(255, 230, 180, 0.85);
          opacity: 0;
          transform-origin: 0% 50%;
          animation: cj-streak 1s cubic-bezier(0.16, 0.9, 0.3, 1) forwards;
          will-change: transform, opacity;
        }

        @media (prefers-reduced-motion: reduce) {
          .cj-nebula,
          .cj-planet,
          .cj-halo,
          .cj-pulse,
          .cj-headline-wrap,
          .cj-hint,
          .cj-mount-streak,
          .cj-warp-streak,
          .cj-flash {
            animation: none !important;
            opacity: 1;
            transform: none;
          }
          .cj-pulse,
          .cj-flash,
          .cj-warp-streak,
          .cj-mount-streak {
            display: none;
          }
        }
      `}</style>

      {/* Scene stage — pure CSS transition, off-main-thread */}
      <div style={stageStyle} suppressHydrationWarning>
        {/* 1. Nebula backdrop */}
        <div aria-hidden="true" className="cj-nebula" />

        {/* 2. Mount warp streaks */}
        {!reduced && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 grid place-items-center"
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

        {/* 3. Central planet */}
        <div className="cj-planet" suppressHydrationWarning />

        {/* 3b. Ambient pulse — CSS infinite, GPU compositor */}
        {!reduced && <div aria-hidden="true" className="cj-pulse" />}

        {/* 4. Halo ring */}
        {!reduced && <div aria-hidden="true" className="cj-halo" />}

        {/* 5. WELCOME headline */}
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

        {/* 6. Scroll hint */}
        <div
          data-testid="hero-scroll-indicator"
          className={`cj-hint absolute bottom-12 z-[6] flex flex-col items-center gap-3 text-white${
            exiting ? " cj-hint--gone" : ""
          }`}
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

      {/* Exit-time cinematic effects — CSS animations, replay via key */}
      {exiting && !reduced && (
        <div
          key={`exit-fx-${exitKey}`}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[18]"
        >
          <div className="cj-flash" />
          <div className="absolute inset-0 grid place-items-center">
            {warpStreaks.map((s, i) => (
              <span
                key={`warp-${i}`}
                className="cj-warp-rotor"
                style={{ transform: `rotate(${s.rotateDeg}deg)` }}
              >
                <span
                  className="cj-warp-streak"
                  style={
                    {
                      "--cj-dx": `${s.dx}vmin`,
                      "--cj-dy": `${s.dy}vmin`,
                    } as CSSProperties
                  }
                />
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
