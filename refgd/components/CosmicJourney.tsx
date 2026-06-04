"use client";
import {
  Component,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import KineticText from "./KineticText";

/**
 * CosmicJourney — real 3D Spline galaxy hero with a camera-driven
 * fly-INTO-the-portal scroll.
 *
 * The previous version scaled the whole flat canvas down (a "chunk"
 * zoom-out) which looked like shrinking a picture, not travelling into
 * the scene. This version drives the actual Spline CAMERA via the
 * runtime `setZoom()` API, so scrolling performs a true dolly-in toward
 * the scene's focal point (the portal) — objects at different depths
 * move at different rates on their own (real parallax), and the camera
 * pushes through into the path cards waiting directly below.
 *
 * Behaviour:
 *   • On load the camera starts slightly zoomed OUT (START_ZOOM < 1) so
 *     the ENTIRE design is visible — nothing clipped at the bottom.
 *   • Scrolling ramps the zoom up (END_ZOOM) → fly into the portal,
 *     while the scene fades near the end so the cards take over.
 *   • A subtle backdrop drift adds extra parallax depth behind the scene.
 *   • Hard / fast scroll AUTO-COMPLETES: when scrolling settles mid-way
 *     the page snaps (via the shared Lenis instance on window.__lenis) to
 *     the cards (scrolling down) or back to the top (scrolling up), so
 *     nobody gets stranded mid-zoom.
 *
 * Robustness ("can't go wrong with bugs"):
 *   • A cosmic gradient backdrop is ALWAYS painted, so the hero is never
 *     blank — during load, on error, on mobile, or under reduced-motion.
 *   • The Spline canvas is wrapped in an ErrorBoundary.
 *   • Spline only renders on desktop after hydration; mobile gets a light
 *     star canvas and normal scrolling (no zoom / no snap).
 *   • Scroll work is direct DOM/camera mutation inside one rAF-coalesced
 *     passive listener (zero React re-renders per frame).
 */

const Spline = lazy(() => import("@splinetool/react-spline"));

// Minimal shape of the Spline runtime Application we actually use.
type SplineApp = {
  setZoom: (zoom: number) => void;
  requestRender?: () => void;
};

// ─────────────────────────────────────────────────────────────────────
// Spline scene URL (exported `scene.splinecode`).
// ─────────────────────────────────────────────────────────────────────
const SCENE_URL = "https://prod.spline.design/mzZcfxXnOQsM5LXz/scene.splinecode";

// ── Camera zoom range (tunable) ───────────────────────────────────────
// START_ZOOM < 1  → start pulled back so the whole design is visible.
// END_ZOOM   > 1  → fly in toward the portal as the user scrolls.
const START_ZOOM = 0.9;
const END_ZOOM = 2.4;

// Once the scroll passes this fraction, a settled scroll auto-completes
// forward into the cards; below it (when scrolling up) it returns to top.
const SNAP_FORWARD_AT = 0.18;
const SNAP_BACK_AT = 0.82;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

// ── Error boundary so a bad/blocked scene never crashes the page ───────
class SplineErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    if (this.state.failed) return null;
    return this.props.children;
  }
}

/** Lightweight floating-star canvas — mobile fallback for the 3D scene. */
function MobileStars() {
  const cvs = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (!cvs.current) return;
    const el: HTMLCanvasElement = cvs.current;
    const ctx2d = el.getContext("2d");
    if (!ctx2d) return;
    const ctx: CanvasRenderingContext2D = ctx2d;
    let raf = 0;
    let alive = true;
    const reducedMQ =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const COLORS = ["#ffe28a", "#a78bfa", "#67e8f9", "#f472b6", "#ffffff"];
    type Star = { x: number; y: number; vx: number; vy: number; r: number; c: string; t: number };
    let pts: Star[] = [];
    function setup() {
      const W = el.offsetWidth, H = el.offsetHeight;
      if (!W || !H) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      el.width = Math.round(W * dpr);
      el.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = Array.from({ length: 65 }, () => ({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: 1.5 + Math.random() * 2.5,
        c: COLORS[Math.floor(Math.random() * COLORS.length)],
        t: Math.random() * Math.PI * 2,
      }));
      return true;
    }
    function draw() {
      if (!alive) return;
      const W = el.offsetWidth, H = el.offsetHeight;
      ctx.clearRect(0, 0, W, H);
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy; p.t += 0.018;
        if (p.x < -4) p.x = W + 4; else if (p.x > W + 4) p.x = -4;
        if (p.y < -4) p.y = H + 4; else if (p.y > H + 4) p.y = -4;
        const a = 0.45 + 0.45 * Math.sin(p.t);
        ctx.shadowBlur = 10 + p.r * 5;
        ctx.shadowColor = p.c;
        ctx.fillStyle = p.c;
        ctx.globalAlpha = a;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 0;
      if (!reducedMQ) raf = requestAnimationFrame(draw);
    }
    const timer = setTimeout(() => { if (setup()) draw(); }, 50);
    return () => { alive = false; cancelAnimationFrame(raf); clearTimeout(timer); };
  }, []);
  return (
    <canvas
      ref={cvs}
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", display: "block" }}
    />
  );
}

export default function CosmicJourney({ kicker }: { kicker: string }) {
  const reduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const splineRef = useRef<SplineApp | null>(null);

  const isMobileRef = useRef(false);
  const reducedRef = useRef(false);
  useEffect(() => { isMobileRef.current = isMobile; }, [isMobile]);
  useEffect(() => { reducedRef.current = !!reduced; }, [reduced]);

  // Mount gate — render Spline only on the client, after hydration.
  useEffect(() => { setMounted(true); }, []);

  // Viewport size watcher
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Progress (0→1) of how far we are through the sticky hero section.
  const getProgress = () => {
    const section = sectionRef.current;
    if (!section) return 0;
    const denom = Math.max(1, section.offsetHeight - window.innerHeight);
    return clamp01(-section.getBoundingClientRect().top / denom);
  };

  // Push the current scroll progress into the Spline camera zoom.
  const applyZoom = (progress: number) => {
    const app = splineRef.current;
    if (!app || reducedRef.current) return;
    const zoom = START_ZOOM + progress * (END_ZOOM - START_ZOOM);
    try {
      app.setZoom(zoom);
      app.requestRender?.();
    } catch {
      /* never let a runtime hiccup break scrolling */
    }
  };

  const onSplineLoad = (app: SplineApp) => {
    splineRef.current = app;
    applyZoom(getProgress());
  };

  // ── Scroll-linked camera zoom + fades — zero React re-renders ────────
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let lastProg = -1;

    const update = () => {
      const progress = getProgress();
      if (Math.abs(progress - lastProg) < 0.0005) return;
      lastProg = progress;
      const red = reducedRef.current;

      // Real camera dolly-in toward the portal.
      applyZoom(progress);

      // Scene fades out over the last third so the cards take over.
      const sceneOpacity = red ? 1 : clamp01(1 - (progress - 0.62) / (1 - 0.62));
      const scene = sceneRef.current;
      if (scene) scene.style.opacity = sceneOpacity.toFixed(4);
      const mob = mobileRef.current;
      if (mob) mob.style.opacity = sceneOpacity.toFixed(4);

      // Backdrop drifts slower than the scene → parallax depth.
      const bd = backdropRef.current;
      if (bd) {
        bd.style.transform = red
          ? "none"
          : `translateY(${(progress * -42).toFixed(1)}px) scale(${(1 + progress * 0.08).toFixed(4)})`;
      }

      // Headline lifts away over the first ~38% of the scroll.
      const headline = headlineRef.current;
      if (headline) {
        if (red) {
          headline.style.transform = "none";
          headline.style.opacity = "1";
        } else {
          headline.style.opacity = clamp01(1 - progress / 0.38).toFixed(4);
          headline.style.transform = `translateY(${(progress * -70).toFixed(1)}px)`;
        }
      }

      // Scroll cue fades out the moment the user starts moving.
      const cue = cueRef.current;
      if (cue) cue.style.opacity = clamp01(1 - progress / 0.07).toFixed(4);
    };

    // Coalesce scroll/resize bursts into one rAF-aligned update.
    let rafId = 0;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      rafId = requestAnimationFrame(() => {
        ticking = false;
        update();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // ── Hard-scroll auto-complete (snap) — desktop, motion-on only ───────
  useEffect(() => {
    if (isMobile || reduced) return;
    const section = sectionRef.current;
    if (!section) return;

    let endTimer = 0;
    let snapping = false;
    let lastY = window.scrollY;
    let dirDown = true;

    const scrollToY = (y: number) => {
      snapping = true;
      const lenis = (window as unknown as { __lenis?: {
        scrollTo: (t: number, o?: Record<string, unknown>) => void;
      } }).__lenis;
      if (lenis && typeof lenis.scrollTo === "function") {
        lenis.scrollTo(y, {
          duration: 0.9,
          easing: (t: number) => 1 - Math.pow(1 - t, 3),
          onComplete: () => { snapping = false; },
        });
      } else {
        window.scrollTo({ top: y, behavior: "smooth" });
      }
      // Safety release in case onComplete never fires.
      window.setTimeout(() => { snapping = false; }, 1200);
    };

    const onSettle = () => {
      if (snapping) return;
      const p = getProgress();
      if (p <= 0.02 || p >= 0.98) return;
      const docTop = window.scrollY + section.getBoundingClientRect().top;
      const denom = Math.max(1, section.offsetHeight - window.innerHeight);
      const toCards = docTop + denom;
      let target: number | null = null;
      if (dirDown) {
        target = p >= SNAP_FORWARD_AT ? toCards : docTop;
      } else {
        target = p <= SNAP_BACK_AT ? docTop : toCards;
      }
      if (target != null) scrollToY(target);
    };

    const onScroll = () => {
      const y = window.scrollY;
      dirDown = y >= lastY;
      lastY = y;
      if (snapping) return;
      window.clearTimeout(endTimer);
      endTimer = window.setTimeout(onSettle, 150);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(endTimer);
      window.removeEventListener("scroll", onScroll);
    };
  }, [isMobile, reduced]);

  const showSpline = mounted && !isMobile && !reduced && SCENE_URL.length > 0;

  return (
    <section
      ref={sectionRef}
      data-testid="cosmic-journey"
      className="relative w-full"
      style={{ height: isMobile ? "150svh" : "175svh" }}
    >
      <div
        className="sticky top-0 grid w-full place-items-center overflow-hidden"
        style={{ height: "100svh", contain: "layout paint" }}
      >
        {/* ── Cosmic gradient backdrop — ALWAYS painted (never blank) ── */}
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse at 28% 30%, rgba(167,139,250,0.40) 0%, transparent 52%)," +
              "radial-gradient(ellipse at 74% 64%, rgba(34,211,238,0.24) 0%, transparent 56%)," +
              "radial-gradient(ellipse at 50% 50%, rgba(245,185,69,0.20) 0%, transparent 60%)",
            filter: "blur(30px)",
            willChange: "transform",
          }}
        />

        {/* ── 3D Spline galaxy (desktop) — camera zoom driven by scroll ── */}
        {showSpline && (
          <div
            ref={sceneRef}
            aria-hidden="true"
            className="absolute inset-0"
            style={{ willChange: "opacity" }}
          >
            <SplineErrorBoundary>
              <Suspense fallback={null}>
                <Spline scene={SCENE_URL} onLoad={onSplineLoad} />
              </Suspense>
            </SplineErrorBoundary>
          </div>
        )}

        {/* ── Mobile fallback star canvas ── */}
        {isMobile && (
          <div
            ref={mobileRef}
            aria-hidden="true"
            className="absolute inset-0"
            style={{ willChange: "opacity" }}
          >
            <MobileStars />
          </div>
        )}

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
