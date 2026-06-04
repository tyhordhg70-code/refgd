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

// ── Camera zoom range (tunable) ───────────────────────────────────────
// START_ZOOM < 1  → start pulled back so the whole design is visible.
// END_ZOOM   > 1  → fly in toward the portal as the user scrolls.
// START_ZOOM is kept close to 1 so the galaxy reads clearly the instant
// the splash lifts (a very-pulled-back start looked like "nothing there"
// until the user scrolled). END_ZOOM is a DEEP fly-IN so the camera
// genuinely travels INSIDE the portal (5.5 still read as "doesn't go
// inside"); the ~30fps setZoom throttle keeps it GPU-sane even at high zoom.
// The zoom SATURATES at ZOOM_COMPLETE_AT (a fraction of the pinned scroll)
// and then HOLDS at full zoom for the rest of the pin, so you arrive fully
// inside the portal and dwell there before the path cards rise up over it.
const START_ZOOM = 0.92;
const END_ZOOM = 8;
// Reach END_ZOOM at this fraction of the pinned scroll, then hold at full
// zoom (dwell "inside the portal") for the remaining pin before un-pinning.
const ZOOM_COMPLETE_AT = 0.72;
// ── Real camera dolly (the part that actually flies IN) ───────────────
// The Spline scene has `zoomLimitsEnabled`, so app.setZoom() is CLAMPED to
// the camera's max zoom — that is why pushing END_ZOOM higher did "nothing".
// The fix is to physically MOVE the camera object toward the portal/center,
// which bypasses the zoom limit entirely (a true 3D dolly, not a CSS scale).
// DOLLY_FRACTION = how far along the start→target path the camera travels at
// full progress (0.94 ⇒ end up deep inside the portal, just shy of the core).
const DOLLY_FRACTION = 0.94;

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
  const portalRef = useRef<HTMLDivElement>(null);
  const mobileRef = useRef<HTMLDivElement>(null);
  const headlineRef = useRef<HTMLDivElement>(null);
  const cueRef = useRef<HTMLDivElement>(null);
  const splineRef = useRef<SplineApp | null>(null);
  // Real camera dolly state (discovered on load). When the camera object is
  // found we move its position toward `camTargetRef` as scroll progresses —
  // this is what actually flies into the portal (setZoom is clamped).
  const cameraObjRef = useRef<SplineObj | null>(null);
  const camStartRef = useRef<Vec3 | null>(null);
  const camTargetRef = useRef<Vec3 | null>(null);
  // Fallback only (used when no camera object is exposed): a scene variable
  // whose name looks like a scroll/zoom driver, scrubbed with progress.
  const scrubVarRef = useRef<string | null>(null);

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

  // Push the current scroll progress into the Spline camera zoom.
  // Each setZoom() forces a FULL re-render of the WebGL scene, so we
  // cap it to ~30fps. At 60fps every scroll frame re-rendered the whole
  // galaxy and the scroll stuttered; halving the render rate keeps the
  // dolly smooth while freeing the GPU. `force` lets the very first
  // (on-load) call paint immediately.
  const lastZoomTs = useRef(0);
  const trailingTimer = useRef<number | null>(null);
  const pendingProgress = useRef(0);

  const renderZoom = (progress: number) => {
    const app = splineRef.current;
    if (!app || reducedRef.current) return;
    // Saturate the zoom BEFORE the pin ends so the camera reaches full depth
    // inside the portal and then holds there (dwell) for the rest of the pin.
    const zp = clamp01(progress / ZOOM_COMPLETE_AT);
    try {
      // PRIMARY — physically dolly the real camera toward the portal/center.
      // This is the ONLY lever that actually flies INTO the scene: the scene
      // has zoom limits that clamp setZoom(), so position movement is what
      // produces a genuine fly-in (and it is a real 3D move, not a CSS scale).
      const cam = cameraObjRef.current;
      const s = camStartRef.current;
      const t = camTargetRef.current;
      if (cam?.position && s && t) {
        const k = zp * DOLLY_FRACTION;
        cam.position.x = s.x + (t.x - s.x) * k;
        cam.position.y = s.y + (t.y - s.y) * k;
        cam.position.z = s.z + (t.z - s.z) * k;
      } else if (scrubVarRef.current) {
        // FALLBACK — no camera object exposed; scrub a scroll/zoom variable.
        app.setVariable?.(scrubVarRef.current, zp);
      }
      // SECONDARY — also nudge setZoom (clamped by the scene, so harmless;
      // adds a touch of extra depth on scenes where the limit allows it).
      app.setZoom(START_ZOOM + zp * (END_ZOOM - START_ZOOM));
      app.requestRender?.();
    } catch {
      /* never let a runtime hiccup break scrolling */
    }
  };

  const applyZoom = (progress: number, force = false) => {
    if (!splineRef.current || reducedRef.current) return;
    pendingProgress.current = progress;
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (force || now - lastZoomTs.current >= 32) {
      lastZoomTs.current = now;
      if (trailingTimer.current != null) {
        clearTimeout(trailingTimer.current);
        trailingTimer.current = null;
      }
      renderZoom(progress);
      return;
    }
    // Throttled this frame — schedule a trailing flush so the FINAL
    // resting position is always painted even if scrolling stops inside
    // the throttle window (otherwise the camera can settle a hair stale).
    if (trailingTimer.current == null) {
      trailingTimer.current = window.setTimeout(() => {
        trailingTimer.current = null;
        lastZoomTs.current =
          typeof performance !== "undefined" ? performance.now() : Date.now();
        renderZoom(pendingProgress.current);
      }, 40);
    }
  };

  // Clear any pending trailing zoom flush on unmount.
  useEffect(() => {
    return () => {
      if (trailingTimer.current != null) {
        clearTimeout(trailingTimer.current);
        trailingTimer.current = null;
      }
    };
  }, []);

  const onSplineLoad = (app: SplineApp) => {
    splineRef.current = app;

    // ── Discover the real camera so scroll can DOLLY it toward the portal ──
    // The scene has `zoomLimitsEnabled`, which clamps app.setZoom() — that is
    // why bumping END_ZOOM never made it fly in. Moving the camera's POSITION
    // bypasses the limit and produces a genuine fly-in toward the portal.
    try {
      let cam: SplineObj | null =
        app.findObjectByName?.("Camera") ??
        app.findObjectByName?.("camera") ??
        null;
      if (!cam) {
        const all = app.getAllObjects?.() ?? [];
        cam = all.find((o) => /camera|\bcam\b/i.test(o?.name ?? "")) ?? null;
      }
      if (cam?.position) {
        cameraObjRef.current = cam;
        camStartRef.current = {
          x: cam.position.x,
          y: cam.position.y,
          z: cam.position.z,
        };
        // Target = a portal/center object if we can find one, otherwise the
        // world origin (galaxy/portal hero scenes are centered at the origin).
        let target: Vec3 | null = null;
        for (const n of [
          "Portal", "portal", "Black Hole", "Blackhole", "Vortex", "Galaxy",
          "Tunnel", "Wormhole", "Gate", "Ring", "Door", "Center",
        ]) {
          const o = app.findObjectByName?.(n);
          if (o?.position) {
            target = { x: o.position.x, y: o.position.y, z: o.position.z };
            break;
          }
        }
        camTargetRef.current = target ?? { x: 0, y: 0, z: 0 };
      } else {
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

    // Best-effort: relax any camera-controls zoom limits so the secondary
    // setZoom() is not clamped (runtimes expose this differently; all guarded).
    try {
      const c = app.controls as
        | {
            maxDistance?: number;
            minDistance?: number;
            maxZoom?: number;
            minZoom?: number;
          }
        | undefined;
      if (c) {
        if (typeof c.maxDistance === "number") c.maxDistance = Number.POSITIVE_INFINITY;
        if (typeof c.minDistance === "number") c.minDistance = 0;
        if (typeof c.maxZoom === "number") c.maxZoom = Number.POSITIVE_INFINITY;
        if (typeof c.minZoom === "number") c.minZoom = 0;
      }
    } catch {
      /* noop */
    }

    applyZoom(getProgress(), true);
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

      // Real camera dolly-in toward the portal — full immersive zoom.
      applyZoom(progress);

      // Owner: do NOT fade the galaxy out over the cards. The scene stays
      // FULLY visible (opacity 1) for the whole pinned phase — the deep zoom
      // AND the hold "inside the portal". The instant the pin ends and the
      // path cards begin to take over (exit > 0), the scene is hidden with a
      // HARD cut (no opacity fade): it just stops being visible while the
      // cards rise up on their own normal background. The element stays in
      // place (sticky) and the cut is fully reversible on scroll-up.
      const sceneVisible = exit <= 0;
      const sceneOpacity = sceneVisible ? 1 : 0;
      const scene = sceneRef.current;
      if (scene) {
        scene.style.opacity = sceneOpacity.toFixed(4);
        scene.style.visibility = sceneVisible ? "visible" : "hidden";
      }
      const mob = mobileRef.current;
      if (mob) {
        mob.style.opacity = sceneOpacity.toFixed(4);
        mob.style.visibility = sceneVisible ? "visible" : "hidden";
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
      style={{ height: isMobile ? "150svh" : "220svh" }}
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
