"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import KineticText from "./KineticText";

/**
 * CosmicJourney — first-scroll timed cinematic hero.
 *
 * The original hero mounted a ~23 MB Spline WebGL galaxy and flew its camera
 * into a portal. That scene pinned the main thread (cursor lag) and forced a
 * multi-second loading splash while the scene downloaded.
 *
 * This version plays the SAME perfected fly-in as a pre-rendered WebP image
 * sequence (101 frames) painted onto a <canvas> — no WebGL, no render loop, no
 * heavy download. The cinematic is driven like a short film, NOT scrubbed:
 *
 *   • Desktop: the hero sits on its opening frame. The user's FIRST downward
 *     scroll TRIGGERS the fly-in, which then plays through on its own timer
 *     (~6 s) while the page is held still; when it lands, the page AUTO-SCROLLS
 *     down to the paths section. One scroll = the whole cinematic + hand-off.
 *     This is the behaviour the original Spline hero had (not parallax scrub).
 *   • Mobile: the sequence auto-plays once when the hero is on screen, with no
 *     scroll-locking and no auto-scroll (the page scrolls normally).
 *   • prefers-reduced-motion: a single static frame, no motion at all.
 *
 * All per-frame work is direct canvas/DOM mutation inside rAF (zero React
 * re-renders per frame).
 */

const FRAME_COUNT = 101;
const FRAME_BASE = "/hero-frames";
// 3-digit, 1-indexed: f_001.webp … f_101.webp
const frameUrl = (i: number) =>
  `${FRAME_BASE}/f_${String(i + 1).padStart(3, "0")}.webp`;

// How long the fly-in takes to play through, in ms. (6 s read as the right
// pace for the original Spline flight; lower = faster.)
const PLAY_MS = 6000;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

// Trapezoid velocity profile: soft ramp-up, constant cruise, soft ramp-down —
// no mid-flight speed surge (which a plain smoothstep would introduce).
const RAMP = 0.22;
function easeFlight(p: number): number {
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  const v = 1 / (1 - RAMP); // cruise velocity so total distance == 1
  if (p < RAMP) return (v * p * p) / (2 * RAMP);
  if (p > 1 - RAMP) {
    const q = 1 - p;
    return 1 - (v * q * q) / (2 * RAMP);
  }
  return v * (p - RAMP / 2);
}

export default function CosmicJourney({ kicker }: { kicker: string }) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const sectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const headlineRef = useRef<HTMLDivElement | null>(null);
  const cueRef = useRef<HTMLDivElement | null>(null);

  const imgsRef = useRef<HTMLImageElement[]>([]);
  const desiredIdxRef = useRef(0);
  const drawnIdxRef = useRef(-1);
  const rafRef = useRef(0);
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

  // ── Preload frames + wire the cinematic driver ──
  useEffect(() => {
    if (typeof window === "undefined" || !mounted) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cover-fit draw (fill the viewport, crop overflow — fullscreen hero).
    const drawCover = (img: HTMLImageElement) => {
      const ctx = ctxRef.current;
      if (!ctx) return;
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      const iw = img.naturalWidth || 1280;
      const ih = img.naturalHeight || 720;
      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    const isReady = (img: HTMLImageElement | undefined) =>
      !!img && img.complete && img.naturalWidth > 0;

    // Paint the closest loaded frame to the desired index (so an unbuffered
    // frame never blanks the hero — we hold the nearest neighbour instead).
    const render = () => {
      rafRef.current = 0;
      const imgs = imgsRef.current;
      const want = desiredIdxRef.current;
      let idx = -1;
      if (isReady(imgs[want])) idx = want;
      else {
        for (let r = 1; r < imgs.length; r++) {
          if (want - r >= 0 && isReady(imgs[want - r])) {
            idx = want - r;
            break;
          }
          if (want + r < imgs.length && isReady(imgs[want + r])) {
            idx = want + r;
            break;
          }
        }
      }
      if (idx < 0) return;
      drawCover(imgs[idx]);
      drawnIdxRef.current = idx;
    };
    const requestRender = () => {
      if (rafRef.current) return;
      rafRef.current = requestAnimationFrame(render);
    };

    // Size the canvas backing store to its CSS box (DPR-aware, capped at 2).
    const setupCanvas = () => {
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(cw * dpr));
      canvas.height = Math.max(1, Math.round(ch * dpr));
      const ctx = canvas.getContext("2d");
      ctxRef.current = ctx;
      if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    setupCanvas();

    // Kick off loading every frame. They are tiny so the whole sequence buffers
    // quickly; frame 0 paints the moment it arrives.
    let firstPainted = false;
    const imgs: HTMLImageElement[] = new Array(FRAME_COUNT);
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (i === 0 && !firstPainted) {
          firstPainted = true;
          requestRender();
          try {
            window.dispatchEvent(new Event("refgd:scene-ready"));
          } catch {
            /* noop */
          }
        }
        if (i === desiredIdxRef.current || drawnIdxRef.current < 0)
          requestRender();
      };
      img.src = frameUrl(i);
      imgs[i] = img;
    }
    imgsRef.current = imgs;

    // Apply the visual fades for a given eased progress.
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

    const onResize = () => {
      setupCanvas();
      requestRender();
    };
    window.addEventListener("resize", onResize, { passive: true });

    // Paint the opening frame.
    desiredIdxRef.current = 0;
    requestRender();

    // ── Reduced motion: one static frame, nothing else ──
    if (reducedRef.current) {
      return () => {
        cancelAnimationFrame(rafRef.current);
        window.removeEventListener("resize", onResize);
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
    let elapsed = 0;
    let lastAt = 0;
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

    const tick = (now: number) => {
      const dt = Math.min(Math.max(now - lastAt, 0), 50);
      lastAt = now;
      elapsed += dt;
      const p = clamp01(elapsed / PLAY_MS);
      const e = easeFlight(p);
      desiredIdxRef.current = Math.round(e * (FRAME_COUNT - 1));
      applyFades(e);
      requestRender();
      if (p >= 1) {
        flightRaf = 0;
        if (isMobile) {
          state = "done";
          setHeroFlight(false);
        } else {
          handoffDesktop();
        }
        return;
      }
      flightRaf = requestAnimationFrame(tick);
    };

    const startPlayback = (lock: boolean) => {
      if (state !== "idle") return;
      state = "playing";
      elapsed = 0;
      lastAt = performance.now();
      setHeroFlight(true);
      if (lock) {
        const l = lenis();
        if (l && l.stop) l.stop();
        window.scrollTo(0, 0);
        attachBlock();
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
          elapsed = 0;
          desiredIdxRef.current = 0;
          restoreFades();
          setHeroFlight(false);
          requestRender();
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
      // Play as soon as the first frame is ready (it's on screen at load).
      if (isReady(imgs[0])) {
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
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(flightRaf);
      releaseBlock();
      cleanupTriggers();
      window.removeEventListener("resize", onResize);
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

      {/* ── Cinematic frame sequence ── */}
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
        style={{ display: "block" }}
      />

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
