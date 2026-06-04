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
type Vec3 = { x: number; y: number; z: number };
type SplineObj = {
  name?: string;
  position?: Vec3;
  rotation?: Vec3;
  scale?: Vec3;
};
type SplineApp = {
  setZoom: (zoom: number) => void;
  requestRender?: () => void;
  findObjectByName?: (name: string) => SplineObj | undefined;
  getAllObjects?: () => SplineObj[];
  getVariables?: () => Record<string, number | boolean | string>;
  setVariable?: (name: string, value: number | boolean | string) => void;
  controls?: unknown;
};

// ─────────────────────────────────────────────────────────────────────
// Spline scene URL (exported `scene.splinecode`).
// ─────────────────────────────────────────────────────────────────────
const SCENE_URL = "https://prod.spline.design/mzZcfxXnOQsM5LXz/scene.splinecode";

// ── FORWARD-AXIS camera dolly (validated in the live Spline tester) ────
// The scene has zoom limits that clamp app.setZoom(), so the ONLY thing that
// actually flies INTO the portal is physically moving the camera. The tester
// proved the right motion is a straight dolly along each camera's ORIGINAL
// view axis (its local -Z at load), NOT a move toward the portal centroid —
// aiming at the centroid tilted the view DOWN ("black under the portal");
// dollying straight forward flies cleanly through the portal and fills frame.
//   FORWARD_DISTANCE — how far (scene units) the camera travels at full dolly.
//   DOLLY_FRACTION   — fraction of FORWARD_DISTANCE covered at full progress.
const FORWARD_DISTANCE = 2600;
const DOLLY_FRACTION = 1.0;
// The dolly SATURATES at this fraction of the scroll so the camera is fully
// inside the portal BEFORE the scroll ends, then HOLDS — the remaining scroll
// hands off to the path cards with no extra "finish the zoom" gesture.
const ZOOM_COMPLETE_AT = 0.6;
// Per-frame critical-damping factor for the eased camera loop: the camera
// glides toward the real scroll position instead of snapping, which absorbs
// scroll jitter / momentum and kills the per-tick "zoom flicker".
const EASE = 0.16;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

// Camera-space forward axis (local -Z) for an intrinsic XYZ Euler rotation,
// in world space — used to dolly the camera straight along its view direction.
function forwardAxis(r: { x: number; y: number; z: number }) {
  const cx = Math.cos(r.x), sx = Math.sin(r.x);
  const cy = Math.cos(r.y), sy = Math.sin(r.y);
  const cz = Math.cos(r.z), sz = Math.sin(r.z);
  // Third column of the intrinsic XYZ rotation matrix, negated (forward = -Z).
  return { x: -(cy * sz + sx * sy * cz), y: -(sy * sz - sx * cy * cz), z: -(cx * cy) };
}

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
  const portalRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const splineRef = useRef<SplineApp | null>(null);
  // Real camera dolly state (discovered on load). The scene has MULTIPLE
  // perspective cameras ("Camera", "Camera 2", "Camera 3") and only one is the
  // active render camera — we can't tell which, so we move ALL of them toward
  // `camTargetRef` as scroll progresses (moving an inactive camera is a no-op).
  // This is what actually flies into the portal (setZoom is clamped).
  const camerasRef = useRef<Array<{ obj: SplineObj; start: Vec3; startRot: Vec3 }>>([]);
  // Fallback only (used when no camera object is exposed): a scene variable
  // whose name looks like a scroll/zoom driver, scrubbed with progress.
  const scrubVarRef = useRef<string | null>(null);
  // Eased camera-progress state for the continuous RAF loop (the value glides
  // toward the real scroll position so the dolly never snaps or flickers).
  const appliedPRef = useRef(0);
  const lastAppliedRef = useRef(-1);
  const pendingRef = useRef(true);

  const isMobileRef = useRef(false);
  const reducedRef = useRef(false);
  useEffect(() => { isMobileRef.current = isMobile; }, [isMobile]);
  useEffect(() => { reducedRef.current = !!reduced; }, [reduced]);

  // Mount gate — render Spline only on the client, after hydration.
  useEffect(() => { setMounted(true); }, []);

  // Warm the heavy Spline chunk + scene asset as early as possible, and
  // tell the loading splash that a real 3D scene is mounting so it holds
  // the overlay until the galaxy has actually painted (see LoadingScreen's
  // `refgd:scene-pending` handling) instead of lifting onto an empty
  // backdrop that the scene then "pops into" several seconds later.
  useEffect(() => {
    if (typeof window === "undefined" || reduced) return;
    if (window.matchMedia("(max-width: 768px)").matches) return; // no scene on mobile
    try {
      (window as unknown as { __refgdScenePending?: boolean }).__refgdScenePending = true;
      window.dispatchEvent(new Event("refgd:scene-pending"));
    } catch { /* noop */ }
    // Prefetch the lazy chunk and the scene file so the canvas is warm
    // the moment it mounts behind the splash.
    void import("@splinetool/react-spline").catch(() => {});
    try {
      void fetch(SCENE_URL, { mode: "cors", credentials: "omit" }).catch(() => {});
    } catch { /* noop */ }
  }, [reduced]);

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

  // Apply a 0→1 scroll progress to the camera as a straight FORWARD dolly
  // along each camera's ORIGINAL view axis (validated in the live tester). zp
  // saturates at ZOOM_COMPLETE_AT so the camera is fully inside the portal
  // BEFORE the scroll ends, then HOLDS there for a seamless hand-off to the
  // path cards. Position movement is the ONLY thing that flies in — the scene
  // clamps setZoom() — and it is a real 3D move, not a CSS scale.
  const renderZoom = (progress: number) => {
    const app = splineRef.current;
    if (!app || reducedRef.current) return;
    const zp = clamp01(progress / ZOOM_COMPLETE_AT);
    try {
      const cams = camerasRef.current;
      if (cams.length) {
        const k = zp * DOLLY_FRACTION * FORWARD_DISTANCE;
        for (const { obj, start, startRot } of cams) {
          if (!obj.position) continue;
          const dir = forwardAxis(startRot);
          obj.position.x = start.x + dir.x * k;
          obj.position.y = start.y + dir.y * k;
          obj.position.z = start.z + dir.z * k;
        }
      } else if (scrubVarRef.current) {
        // FALLBACK — no camera object exposed; scrub a scroll/zoom variable.
        app.setVariable?.(scrubVarRef.current, zp);
      }
      app.requestRender?.();
    } catch {
      /* never let a runtime hiccup break scrolling */
    }
  };

  // Continuous eased camera loop: read the REAL scroll progress every frame
  // and glide the applied value toward it (critical damping). This is the
  // motion the tester validated — it absorbs scroll jitter / momentum so the
  // dolly glides instead of snapping and never "zooms back out" on a hard
  // scroll tick. Driving the camera here (not in the scroll listener) is what
  // makes the fly-in buttery on fast flicks.
  useEffect(() => {
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      if (!splineRef.current || reducedRef.current) return;
      const target = getProgress();
      const cur = appliedPRef.current;
      let next = cur + (target - cur) * EASE;
      if (Math.abs(target - next) < 0.0004) next = target;
      appliedPRef.current = next;
      if (
        Math.abs(next - lastAppliedRef.current) > 0.00002 ||
        pendingRef.current
      ) {
        pendingRef.current = false;
        lastAppliedRef.current = next;
        renderZoom(next);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSplineLoad = (app: SplineApp) => {
    splineRef.current = app;

    // ── Discover the real camera so scroll can DOLLY it toward the portal ──
    // The scene has `zoomLimitsEnabled`, which clamps app.setZoom() — that is
    // why bumping END_ZOOM never made it fly in. Moving the camera's POSITION
    // bypasses the limit and produces a genuine fly-in toward the portal.
    try {
      // The scene has THREE perspective cameras ("Camera", "Camera 2",
      // "Camera 3") — confirmed by inspecting scene.splinecode. Only one is the
      // active render camera and the runtime gives no reliable way to know
      // which, so collect every camera we can find and dolly them ALL.
      const cams: Array<{ obj: SplineObj; start: Vec3; startRot: Vec3 }> = [];
      const pushCam = (o: SplineObj | undefined | null) => {
        if (!o?.position) return;
        if (cams.some((c) => c.obj === o)) return;
        cams.push({
          obj: o,
          start: { x: o.position.x, y: o.position.y, z: o.position.z },
          startRot: {
            x: o.rotation?.x ?? 0,
            y: o.rotation?.y ?? 0,
            z: o.rotation?.z ?? 0,
          },
        });
      };
      for (const n of [
        "Camera", "Camera 2", "Camera 3", "Camera 4", "Camera 1",
        "camera", "playCamera",
      ]) {
        pushCam(app.findObjectByName?.(n));
      }
      const all = app.getAllObjects?.() ?? [];
      for (const o of all) {
        if (/camera|\bcam\b/i.test(o?.name ?? "")) pushCam(o);
      }
      camerasRef.current = cams;

      if (!cams.length) {
        // No camera object exposed — fall back to scrubbing a scene variable
        // whose name looks like a scroll/zoom driver, if one exists.
        const vars = app.getVariables?.() ?? {};
        const match = Object.keys(vars).find(
          (n) =>
            typeof vars[n] === "number" &&
            /scroll|zoom|progress|camera|fly|warp|dolly|depth|journey/i.test(n),
        );
        if (match) scrubVarRef.current = match;
      }
    } catch {
      /* fall back to clamped setZoom-only behaviour */
    }

    // Best-effort: DISABLE the orbit/zoom controls so our per-frame camera
    // position writes are not immediately overwritten by the control loop
    // (a likely reason an earlier dolly "barely changed"), and relax any zoom
    // limits so the secondary setZoom() is not clamped. All guarded.
    try {
      const c = app.controls as
        | {
            enabled?: boolean;
            enableZoom?: boolean;
            enablePan?: boolean;
            enableRotate?: boolean;
            autoRotate?: boolean;
            maxDistance?: number;
            minDistance?: number;
            maxZoom?: number;
            minZoom?: number;
          }
        | undefined;
      if (c) {
        if (typeof c.enabled === "boolean") c.enabled = false;
        if (typeof c.enableZoom === "boolean") c.enableZoom = false;
        if (typeof c.enableRotate === "boolean") c.enableRotate = false;
        if (typeof c.enablePan === "boolean") c.enablePan = false;
        if (typeof c.autoRotate === "boolean") c.autoRotate = false;
        if (typeof c.maxDistance === "number") c.maxDistance = Number.POSITIVE_INFINITY;
        if (typeof c.minDistance === "number") c.minDistance = 0;
        if (typeof c.maxZoom === "number") c.maxZoom = Number.POSITIVE_INFINITY;
        if (typeof c.minZoom === "number") c.minZoom = 0;
      }
    } catch {
      /* noop */
    }

    appliedPRef.current = getProgress();
    pendingRef.current = true;
    renderZoom(getProgress());
    // Tell the loading screen the heavy 3D scene has painted its first
    // frame so the splash holds until the galaxy is actually ready
    // (instead of lifting onto an empty backdrop that "pops in" later
    // on the first scroll).
    try {
      (window as unknown as { __refgdScenePending?: boolean }).__refgdScenePending = false;
      window.dispatchEvent(new Event("refgd:scene-ready"));
    } catch {
      /* noop */
    }
  };

  // ── Scroll-linked camera zoom + fades — zero React re-renders ────────
  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    let lastKey = -1;

    const update = () => {
      const section = sectionRef.current;
      if (!section) return;
      const red = reducedRef.current;
      const rect = section.getBoundingClientRect();
      const denom = Math.max(1, section.offsetHeight - window.innerHeight);
      const scrolledPast = -rect.top;                  // px scrolled into the hero
      const progress = clamp01(scrolledPast / denom);  // 0→1 during the pinned fly-in

      // Exit phase: once the camera has flown ALL the way into the portal
      // (and held there), the hero un-pins and the path cards rise from
      // directly below on their own normal background. The scene is hidden
      // with a hard cut the instant exit > 0 (see below) — it is NOT faded
      // and the cards do NOT come up over a still-visible galaxy. exitDist
      // just defines how quickly `exit` saturates past the pin; only its
      // sign (>0) matters now that the scene is a hard show/hide.
      const exitDist = Math.max(1, window.innerHeight * 1.0);
      const exit = clamp01((scrolledPast - denom) / exitDist);

      // progress is constant (1) during the exit phase, so fold exit into
      // the change key or the hand-off frames would be skipped.
      const key = progress + exit;
      if (Math.abs(key - lastKey) < 0.0005) return;
      lastKey = key;

      // Camera dolly is driven by the continuous eased RAF loop above, NOT
      // here — this listener only handles the DOM parallax + fades.

      // Owner rule: never fade the galaxy out (no opacity fade) AND no hard
      // cut either. The scene stays FULLY visible the whole time; when the
      // pinned hero ends, the sticky scene simply scrolls away as the path
      // cards take over, so the hand-off is seamless instead of the galaxy
      // blinking out. Fully reversible on scroll-up.
      const scene = sceneRef.current;
      if (scene) {
        scene.style.opacity = "1";
        scene.style.visibility = "visible";
      }
      const mob = mobileRef.current;
      if (mob) {
        mob.style.opacity = "1";
        mob.style.visibility = "visible";
      }

      // Portal flash glow removed per owner (read as a "glow wash" over the
      // zoom) — keep the overlay fully transparent at all times.
      const portal = portalRef.current;
      if (portal) portal.style.opacity = "0";

      // Backdrop drifts slower than the scene → parallax depth.
      const bd = backdropRef.current;
      if (bd) {
        bd.style.transform = red
          ? "none"
          : `translateY(${(progress * -52).toFixed(1)}px) scale(${(1 + progress * 0.1).toFixed(4)})`;
      }

      // Headline lifts away over the first ~32% of the scroll.
      const headline = headlineRef.current;
      if (headline) {
        if (red) {
          headline.style.transform = "none";
          headline.style.opacity = "1";
        } else {
          headline.style.opacity = clamp01(1 - progress / 0.32).toFixed(4);
          headline.style.transform = `translateY(${(progress * -80).toFixed(1)}px) scale(${(1 + progress * 0.06).toFixed(4)})`;
        }
      }

      // Scroll cue fades out the moment the user starts moving.
      const cue = cueRef.current;
      if (cue) cue.style.opacity = clamp01(1 - progress / 0.06).toFixed(4);
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

  // NOTE: the previous "hard-scroll auto-complete" (Lenis snap) was
  // removed. It caused two problems the owner reported:
  //   • "zooms back out and restarts" — a tiny deceleration / momentum
  //     reversal near the top of the zoom flipped the tracked direction
  //     to "up", and the back-snap then yanked the camera all the way
  //     out to the hero top (a jarring restart, with the scene
  //     re-rendering mid-jump so it looked like "details missing").
  //   • the forward snap skipped the natural exit hand-off into the cards.
  // Plain native scrolling (Lenis still smooths it) flies fully into the
  // portal, holds there, then hard-cuts the scene out as the path cards
  // rise up on their own background — no direction tracking, no
  // programmatic scroll fighting the user.

  const showSpline = mounted && !isMobile && !reduced && SCENE_URL.length > 0;

  return (
    <section
      ref={sectionRef}
      data-testid="cosmic-journey"
      className="relative w-full"
      style={{ height: isMobile ? "150svh" : "170svh" }}
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
            filter: "blur(18px)",
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

        {/* ── Portal flash — a burst of light as the camera enters the
            portal at peak zoom, which then lifts to reveal the cards. ── */}
        <div
          ref={portalRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-[7]"
          style={{
            opacity: 0,
            background:
              "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.96) 0%, rgba(255,237,180,0.82) 24%, rgba(167,139,250,0.5) 48%, transparent 74%)",
            willChange: "opacity",
          }}
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
