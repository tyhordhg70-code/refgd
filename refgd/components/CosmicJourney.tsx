"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import KineticText from "./KineticText";

/**
 * CosmicJourney — scroll-scrubbed cinematic hero.
 *
 * The previous version mounted a ~23 MB Spline WebGL galaxy and drove its
 * camera with a time-based flight. That scene pinned the main thread with a
 * continuous render loop (cursor lag on the live site) and forced a multi-second
 * loading screen while the 23 MB `scene.splinecode` downloaded.
 *
 * This version renders the SAME perfected fly-in (wide portal → orbit/dolly →
 * avatar walk → dive into the vortex) as a pre-rendered WebP image sequence
 * (~2.4 MB total, 101 frames) painted onto a <canvas>, SCRUBBED by scroll
 * position. There is no WebGL, no render loop, and no heavy download — frames
 * only repaint when the user scrolls, so the hero is effectively free at idle
 * and there is nothing to wait on (the first frame paints instantly).
 *
 * Behaviour:
 *   • A tall section gives the scroll runway; a `position: sticky` child pins a
 *     full-viewport canvas while the user scrolls THROUGH that runway. Native
 *     CSS sticky means NO scroll-jacking — the page scrolls normally and the
 *     frame index simply tracks how far through the section you are.
 *   • Frame 0 is drawn the instant it loads, so the hero is never blank and
 *     there is no scene-tied loading splash.
 *   • The welcome headline + scroll cue fade out over the first slice of the
 *     scrub so the cinematic takes over, then the paths section scrolls up.
 *   • prefers-reduced-motion → a single static frame, no pin, no scrub.
 *   • All per-frame work is direct canvas/DOM mutation inside one rAF-coalesced
 *     passive scroll listener (zero React re-renders per frame).
 */

const FRAME_COUNT = 101;
const FRAME_BASE = "/hero-frames";
// 3-digit, 1-indexed: f_001.webp … f_101.webp
const frameUrl = (i: number) =>
  `${FRAME_BASE}/f_${String(i + 1).padStart(3, "0")}.webp`;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

export default function CosmicJourney({ kicker }: { kicker: string }) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  const sectionRef = useRef<HTMLElement | null>(null);
  const stickyRef = useRef<HTMLDivElement | null>(null);
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

  // Viewport size watcher (mobile gets a shorter scroll runway).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ── Preload frames + wire the scroll scrubber ──
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

    // Kick off loading every frame. They are tiny (~24 KB avg) so the whole
    // sequence buffers quickly; frame 0 paints the moment it arrives.
    let firstPainted = false;
    const imgs: HTMLImageElement[] = new Array(FRAME_COUNT);
    for (let i = 0; i < FRAME_COUNT; i++) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        // First frame in → paint it immediately and tell the loader the hero
        // has rendered (in case the splash is still up).
        if (i === 0 && !firstPainted) {
          firstPainted = true;
          requestRender();
          try {
            window.dispatchEvent(new Event("refgd:scene-ready"));
          } catch {
            /* noop */
          }
        }
        // If this newly-loaded frame is what we currently want, repaint.
        if (i === desiredIdxRef.current || drawnIdxRef.current < 0)
          requestRender();
      };
      img.src = frameUrl(i);
      imgs[i] = img;
    }
    imgsRef.current = imgs;

    // ── Reduced motion: one static frame, no scrub, no pin ──
    if (reducedRef.current) {
      desiredIdxRef.current = 0;
      requestRender();
      const onResize = () => {
        setupCanvas();
        requestRender();
      };
      window.addEventListener("resize", onResize, { passive: true });
      return () => {
        cancelAnimationFrame(rafRef.current);
        window.removeEventListener("resize", onResize);
      };
    }

    // ── Scroll scrubber ──
    const computeProgress = () => {
      const sec = sectionRef.current;
      if (!sec) return 0;
      // The sticky child is pinned for exactly (section height − sticky height)
      // of scroll, so basing the denominator on the sticky child's MEASURED
      // height (not window.innerHeight) makes progress hit 1 precisely at unpin
      // on every device — including mobile, where 100svh ≠ innerHeight while the
      // browser chrome is expanded/collapsed.
      const stickyH = stickyRef.current?.clientHeight ?? window.innerHeight;
      const denom = sec.offsetHeight - stickyH;
      if (denom <= 0) return 0;
      const rect = sec.getBoundingClientRect();
      return clamp01(-rect.top / denom);
    };

    const apply = () => {
      const p = computeProgress();
      desiredIdxRef.current = Math.round(p * (FRAME_COUNT - 1));
      const headline = headlineRef.current;
      if (headline) {
        const o = clamp01(1 - p / 0.14);
        headline.style.opacity = o.toFixed(3);
        headline.style.transform = `translateY(${(p * -60).toFixed(1)}px)`;
      }
      const cue = cueRef.current;
      if (cue) cue.style.opacity = clamp01(1 - p / 0.08).toFixed(3);
      // Pause the global ambient background while the hero owns the viewport.
      try {
        const pinned = p > 0 && p < 1;
        document.documentElement.classList.toggle("hero-flight", pinned);
      } catch {
        /* noop */
      }
      requestRender();
    };

    let scrollRaf = 0;
    const onScroll = () => {
      if (scrollRaf) return;
      scrollRaf = requestAnimationFrame(() => {
        scrollRaf = 0;
        apply();
      });
    };
    const onResize = () => {
      setupCanvas();
      apply();
    };

    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      cancelAnimationFrame(scrollRaf);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      try {
        document.documentElement.classList.remove("hero-flight");
      } catch {
        /* noop */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted, reduced, isMobile]);

  // Tall section = scroll runway for the scrub. The sticky child below pins a
  // full-viewport canvas while the user scrolls through this height. Reduced
  // motion collapses to a single static viewport.
  const sectionHeight = reduced ? "100svh" : isMobile ? "200svh" : "260svh";

  return (
    <section
      ref={sectionRef}
      data-testid="cosmic-journey"
      className="relative w-full"
      style={{ height: sectionHeight }}
    >
      <div
        ref={stickyRef}
        className="sticky top-0 grid w-full place-items-center overflow-hidden"
        style={{ height: "100svh", contain: "layout paint", background: "#05060a" }}
      >
        {/* Solid near-black backdrop so the hero is never blank before the first
            frame paints. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "#05060a" }}
        />

        {/* ── Scroll-scrubbed cinematic frame sequence ── */}
        <canvas
          ref={canvasRef}
          aria-hidden="true"
          className="absolute inset-0 h-full w-full"
          style={{ display: "block" }}
        />

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

        {/* ── Bold, unmissable scroll cue ── */}
        <div
          ref={cueRef}
          data-testid="hero-scroll-indicator"
          className="absolute bottom-10 z-[6] flex flex-col items-center gap-3 text-white"
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
            Scroll to choose your path
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
      </div>
    </section>
  );
}
