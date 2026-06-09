"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import KineticText from "./KineticText";

/**
 * CosmicJourney — first-scroll timed cinematic hero.
 *
 * Earlier versions mounted a ~23 MB Spline WebGL galaxy, then a 101-frame WebP
 * <canvas> sequence. This version plays a single pre-rendered cinematic clip
 * (`/hero-cinematic.webm`) — the perfected portal fly-in recorded on the
 * owner's GPU — through a <video> element. No WebGL, no per-frame canvas work.
 *
 * The clip is driven like a short film, NOT scrubbed:
 *
 *   • Desktop: the hero holds on the opening frame. The user's FIRST downward
 *     scroll TRIGGERS the clip, which plays through on its own while the page is
 *     held still; when it ends, the page AUTO-SCROLLS down to the paths section.
 *     One scroll = the whole cinematic + hand-off. Scroll back to the very top
 *     and it re-arms.
 *   • Mobile: the clip auto-plays once when the hero is on screen, with no
 *     scroll-locking and no auto-scroll (the page scrolls normally).
 *   • prefers-reduced-motion: a single static opening frame, no motion at all.
 */

// H.264 MP4 is hardware-decoded in every browser → smooth playback. The webm is
// kept only as a fallback for the rare engine without MP4 support.
const VIDEO_SRC_MP4 = "/hero-cinematic.mp4";
const VIDEO_SRC_WEBM = "/hero-cinematic.webm";

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export default function CosmicJourney({ kicker }: { kicker: string }) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const sectionRef = useRef<HTMLElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const headlineRef = useRef<HTMLDivElement | null>(null);
  const cueRef = useRef<HTMLDivElement | null>(null);
  const reducedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    reducedRef.current = !!reduced;
  }, [reduced]);

  // Viewport size watcher (mobile uses the no-jack autoplay path).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ── Wire the cinematic driver ──
  useEffect(() => {
    if (typeof window === "undefined" || !mounted) return;
    const video = videoRef.current;
    if (!video) return;

    // Apply the visual fades for a given clip progress (0..1).
    const applyFades = (e: number) => {
      const headline = headlineRef.current;
      if (headline) {
        headline.style.opacity = clamp01(1 - e / 0.18).toFixed(3);
        headline.style.transform = `translateY(${(e * -60).toFixed(1)}px)`;
      }
      const cue = cueRef.current;
      if (cue) cue.style.opacity = clamp01(1 - e / 0.1).toFixed(3);
    };
    const restoreFades = () => {
      const headline = headlineRef.current;
      if (headline) {
        headline.style.opacity = "1";
        headline.style.transform = "translateY(0px)";
      }
      const cue = cueRef.current;
      if (cue) cue.style.opacity = "1";
    };

    // Hold the clip on its opening frame until playback is triggered.
    try {
      video.pause();
      video.currentTime = 0;
    } catch {
      /* noop */
    }

    // Announce readiness for the loading screen (harmless if home isn't gated).
    let announced = false;
    const announce = () => {
      if (announced) return;
      announced = true;
      try {
        window.dispatchEvent(new Event("refgd:scene-ready"));
      } catch {
        /* noop */
      }
    };
    const onLoadedData = () => {
      try {
        if (video.currentTime !== 0) video.currentTime = 0;
      } catch {
        /* noop */
      }
      announce();
    };
    if (video.readyState >= 2) onLoadedData();
    else video.addEventListener("loadeddata", onLoadedData);

    // ── Reduced motion: one static frame, nothing else ──
    if (reducedRef.current) {
      return () => {
        video.removeEventListener("loadeddata", onLoadedData);
      };
    }

    const setHeroFlight = (on: boolean) => {
      try {
        document.documentElement.classList.toggle("hero-flight", on);
      } catch {
        /* noop */
      }
    };

    // ── Shared timed playback ──
    type State = "idle" | "playing" | "done";
    let state: State = "idle";
    let flightRaf = 0;
    let blockOn = false;

    const lenis = () =>
      (window as unknown as { __lenis?: { stop?: () => void; start?: () => void; scrollTo?: (t: unknown, o?: unknown) => void } }).__lenis;

    // Capture-phase swallow of scroll input during the locked desktop flight.
    const swallow = (ev: Event) => {
      if (ev.cancelable) ev.preventDefault();
      ev.stopPropagation();
    };
    const blockKeys = (ev: KeyboardEvent) => {
      const k = ev.key;
      if (
        k === "ArrowDown" || k === "ArrowUp" || k === "PageDown" ||
        k === "PageUp" || k === " " || k === "Home" || k === "End"
      ) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    };
    const attachBlock = () => {
      if (blockOn) return;
      blockOn = true;
      window.addEventListener("wheel", swallow, { passive: false, capture: true });
      window.addEventListener("touchmove", swallow, { passive: false, capture: true });
      window.addEventListener("keydown", blockKeys, { capture: true });
    };
    const releaseBlock = () => {
      if (!blockOn) return;
      blockOn = false;
      window.removeEventListener("wheel", swallow, { capture: true } as EventListenerOptions);
      window.removeEventListener("touchmove", swallow, { capture: true } as EventListenerOptions);
      window.removeEventListener("keydown", blockKeys, { capture: true } as EventListenerOptions);
    };

    const handoffDesktop = () => {
      state = "done";
      releaseBlock();
      setHeroFlight(false);
      const l = lenis();
      const target = document.getElementById("paths");
      if (l && l.start) l.start();
      if (l && l.scrollTo && target) {
        l.scrollTo(target, {
          offset: 0,
          duration: 0.7,
          easing: (t: number) => 1 - Math.pow(1 - t, 3),
        });
      } else if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
    };

    const finish = () => {
      if (state !== "playing") return;
      flightRaf = 0;
      applyFades(1);
      if (isMobile) {
        state = "done";
        setHeroFlight(false);
      } else {
        handoffDesktop();
      }
    };

    // Drive the headline/cue fades from the clip's own playback position.
    const tick = () => {
      if (state !== "playing") return;
      const dur = video.duration || 6;
      const e = clamp01(video.currentTime / dur);
      applyFades(e);
      if (video.ended || e >= 0.999) {
        finish();
        return;
      }
      flightRaf = requestAnimationFrame(tick);
    };

    const onEnded = () => finish();
    video.addEventListener("ended", onEnded);

    const startPlayback = (lock: boolean) => {
      if (state !== "idle") return;
      state = "playing";
      setHeroFlight(true);
      if (lock) {
        const l = lenis();
        if (l && l.stop) l.stop();
        window.scrollTo(0, 0);
        attachBlock();
      }
      try {
        video.currentTime = 0;
        const p = video.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      } catch {
        /* noop */
      }
      cancelAnimationFrame(flightRaf);
      flightRaf = requestAnimationFrame(tick);
    };

    // ── Desktop: trigger on first downward intent, then play locked ──
    let cleanupTriggers = () => {};
    if (!isMobile) {
      const atTop = () => window.scrollY <= 2;
      const onWheel = (ev: WheelEvent) => {
        if (state !== "idle") return;
        if (ev.deltaY > 0 && atTop()) {
          if (ev.cancelable) ev.preventDefault();
          startPlayback(true);
        }
      };
      const onKey = (ev: KeyboardEvent) => {
        if (state !== "idle" || !atTop()) return;
        if (
          ev.key === "ArrowDown" || ev.key === "PageDown" ||
          ev.key === " " || ev.key === "End"
        ) {
          ev.preventDefault();
          startPlayback(true);
        }
      };
      // Fallback for scrollbar drags / any scroll that slips past wheel.
      // Only fire on a genuine DOWNWARD move that STARTED at the very top, so a
      // restored mid-page scroll position on load can never auto-trigger it.
      let prevY = window.scrollY;
      const onScrollTrigger = () => {
        const y = window.scrollY;
        const goingDown = y > prevY;
        const wasAtTop = prevY <= 2;
        prevY = y;
        if (state === "idle" && goingDown && wasAtTop && y > 2 && y < window.innerHeight * 0.6) {
          startPlayback(true);
        }
      };
      // Re-arm when the user returns to the very top after a flight.
      const onScrollReset = () => {
        if (state === "done" && window.scrollY < 8) {
          state = "idle";
          cancelAnimationFrame(flightRaf);
          try {
            video.pause();
            video.currentTime = 0;
          } catch {
            /* noop */
          }
          restoreFades();
          setHeroFlight(false);
        }
      };
      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("keydown", onKey);
      window.addEventListener("scroll", onScrollTrigger, { passive: true });
      window.addEventListener("scroll", onScrollReset, { passive: true });
      cleanupTriggers = () => {
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("keydown", onKey);
        window.removeEventListener("scroll", onScrollTrigger);
        window.removeEventListener("scroll", onScrollReset);
      };
    } else {
      // ── Mobile: autoplay once, no scroll-lock, no auto-scroll ──
      let started = false;
      let mobileTimer = 0;
      const startOnce = () => {
        if (started) return;
        started = true;
        startPlayback(false);
      };
      const onFirst = () => {
        window.removeEventListener("refgd:scene-ready", onFirst);
        mobileTimer = window.setTimeout(startOnce, 200);
      };
      if (video.readyState >= 2) {
        mobileTimer = window.setTimeout(startOnce, 350);
      } else {
        window.addEventListener("refgd:scene-ready", onFirst);
      }
      cleanupTriggers = () => {
        window.clearTimeout(mobileTimer);
        window.removeEventListener("refgd:scene-ready", onFirst);
      };
    }

    return () => {
      cancelAnimationFrame(flightRaf);
      releaseBlock();
      cleanupTriggers();
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("ended", onEnded);
      const l = lenis();
      if (l && l.start) l.start();
      setHeroFlight(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, reduced, isMobile]);

  return (
    <section
      ref={sectionRef}
      data-testid="cosmic-journey"
      className="relative w-full overflow-hidden"
      style={{ height: "100svh" }}
    >
      {/* Solid near-black backdrop so the hero is never blank before the first
          frame paints. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "#05060a" }}
      />

      {/* ── Cinematic clip ── */}
      <video
        ref={videoRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
        muted
        playsInline
        preload="auto"
        style={{ display: "block" }}
      >
        <source src={VIDEO_SRC_MP4} type="video/mp4" />
        <source src={VIDEO_SRC_WEBM} type="video/webm" />
      </video>

      <div className="absolute inset-0 grid place-items-center">
        {/* ── WELCOME headline ── */}
        <motion.div
          ref={headlineRef}
          className="container-wide pointer-events-none relative z-[5] flex flex-col items-center justify-center text-center"
          initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 28, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={reduced ? { duration: 0 } : { duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          <KineticText
            as="h1"
            text={kicker}
            className="editorial-display text-balance uppercase text-white text-[clamp(2.5rem,9vw,7rem)] leading-[0.95] tracking-[-0.015em]"
            style={{ textShadow: "0 4px 50px rgba(0,0,0,0.95), 0 0 60px rgba(245,185,69,0.45), 0 2px 14px rgba(0,0,0,0.95)" }}
            stagger={0.08}
            delay={0.15}
          />
        </motion.div>
      </div>

      {/* ── Bold, unmissable scroll cue ── */}
      <div
        ref={cueRef}
        data-testid="hero-scroll-indicator"
        className="absolute bottom-10 left-1/2 z-[6] flex -translate-x-1/2 flex-col items-center gap-3 text-white"
        style={{ opacity: 1 }}
      >
        <style>{`
          @keyframes cj-cue-bounce {
            0%, 100% { transform: translateY(0); opacity: 1; }
            50%      { transform: translateY(7px); opacity: 0.55; }
          }
          @media (prefers-reduced-motion: reduce) {
            .cj-cue-chevron { animation: none !important; }
          }
        `}</style>
        <span
          className="heading-display rounded-full border border-amber-200/40 bg-black/30 px-5 py-2 text-[11px] font-bold uppercase tracking-[0.4em] backdrop-blur-sm sm:text-sm"
          style={{ textShadow: "0 2px 14px rgba(0,0,0,0.95), 0 0 22px rgba(255,237,180,0.55)" }}
        >
          Scroll to begin
        </span>
        <svg
          className="cj-cue-chevron h-6 w-6 text-amber-200"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          style={{ animation: "cj-cue-bounce 1.6s ease-in-out infinite", filter: "drop-shadow(0 0 8px rgba(255,237,180,0.7))" }}
        >
          <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </section>
  );
}
