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

// ── CINEMATIC ORBIT → DIVE camera rig (validated in the live Spline tester) ──
// The scene has zoom limits that clamp app.setZoom(), so the ONLY thing that
// actually flies INTO the portal is physically moving the camera. The tester
// (artifacts/spline-tester) was used to tune these values with live feedback,
// then ported here. The motion has two beats, and ALWAYS looks at the portal
// centre so the portal stays dead-centre with no 180° look-flip:
//   A) reveal → orbit: starts EXACTLY on the authored opening frame, then eases
//      to a fresh 3/4 angle (gentle azimuth swing) while aiming slightly DOWN
//      (LOOK_DROP) so the bottom of the design — clipped in the authored frame —
//      comes into view over the first scrolls. It only ever zooms IN; pulling
//      back would move the camera straight through the person behind it.
//   B) dive: travels most (DOLLY_DEEP) of the way to the portal centre, easing
//      the aim up from the dropped point to dead-centre so it ends framed inside
//      the portal but STOPS SHORT of the person (DOLLY_DEEP < 1).
// ── These constants are synced EXACTLY to the live spline-tester rig, which the
// owner confirmed lands DEAD-CENTRE in the portal. The camera math (computeCam)
// is identical to the tester; only these values drive where the dive ends, so
// any divergence from the tester is what previously threw off the centring.
// Do NOT hand-tune these without re-validating in the spline-tester first.
const PIVOT = { x: 57, y: 3878, z: -387 }; // measured portal sphere-cluster centre
const AZIMUTH_DEG = -12; // Phase-A orbit swing to a fresh angle (tester value)
const ELEV_LIFT = 0; // vertical orbit lift (flat "2D" third-person angle)
const ESTABLISH_BACK = 0; // extra orbit radius — 0: never pull back through the person
const RADIUS_PULL = 0; // orbit closer(+)/further(−) to the pivot
// Look target is dropped during the APPROACH to reveal the lower design, then the
// dive eases the aim back UP to the portal centre (lookT.y → P.y as u→1), so the
// dive STILL ENDS framed dead-centre. Tester value — confirmed centred by owner.
const LOOK_DROP = 700;
// ⚠ TIME-DOMAIN params (NOT copied from the tester): the tester is SCROLL-SCRUBBED
// (the user controls speed by scrolling) so its phase splits are cosmetic there. The
// LIVE hero is a TIME-BASED flight, so the split must give the tiny orbit and the long
// dive TIME proportional to DISTANCE or the speed JUMPS at the seam (= mid-flight
// stutter). 0.2 keeps the orbit short so orbit/dive speeds match. Centring is
// INDEPENDENT of these (the dive END pose is fixed by the geometry constants above).
const PHASE_A_END = 0.2; // short orbit slice → speed-matched seam (no stutter)
const PHASE_B_END = 0.93; // dive fully lands here; tick hands off the INSTANT it does
const DOLLY_DEEP = 0.95; // fraction of the way to centre the dive travels — tester value: stops at the portal MOUTH (0.99 overshot past it, breaking the centred framing)
// Keeps the dive's END this far ABOVE the portal centre so the dive frames the
// portal MOUTH instead of sinking to floor/leg level. Tester value (was 28 = too
// low/deep, which read as "not entering the centre").
const DIVE_LIFT = 150;
// How far the dive bows SIDEWAYS at its midpoint (quadratic Bézier control), so
// the camera curves AROUND the person instead of punching through them. Tester
// value — confirmed centred by owner (was 80 = too head-on).
const ARC_SIDE = 450;

// zp = progress / ZOOM_COMPLETE_AT. Kept at 1.0 (no early saturation) so the
// timed flight's phase splits map directly onto its 0→1 progress.
const ZOOM_COMPLETE_AT = 1.0;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);
const deg2rad = (d: number) => (d * Math.PI) / 180;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
// smoothstep ease-in-out
const smoothstep = (t: number) => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

// Flight time-ease — TRAPEZOID velocity profile: a soft launch and a soft
// arrival with a CONSTANT-speed middle. Unlike smoothstep (which spikes to peak
// velocity right at the midpoint), this never "suddenly speeds up half way", so
// the orbit→dive flight reads as one calm, even glide.
const easeFlight = (t: number) => {
  const x = clamp01(t);
  const r = 0.22; // fraction of the flight spent ramping at EACH end
  const norm = 1 - r; // area under the trapezoid (normalises pos to end at 1)
  if (x < r) return (x * x) / (2 * r) / norm; // accelerate
  if (x <= 1 - r) return (x - r / 2) / norm; // cruise (constant speed)
  const q = 1 - x; // decelerate (mirror of accelerate)
  return 1 - (q * q) / (2 * r) / norm;
};

// Rotate a vector about the Y axis (used to swing the orbit azimuth).
function rotateY(v: Vec3, a: number): Vec3 {
  const c = Math.cos(a), s = Math.sin(a);
  return { x: v.x * c + v.z * s, y: v.y, z: -v.x * s + v.z * c };
}

// Shortest-arc angle interpolation (keeps Euler blends from spinning the long way).
function lerpAngle(a: number, b: number, t: number): number {
  let d = b - a;
  while (d > Math.PI) d -= 2 * Math.PI;
  while (d < -Math.PI) d += 2 * Math.PI;
  return a + d * t;
}

// Euler (intrinsic XYZ, three.js convention) that makes a camera at P look at T.
function lookAtEuler(P: Vec3, T: Vec3): Vec3 {
  const dx = T.x - P.x, dy = T.y - P.y, dz = T.z - P.z;
  const len = Math.hypot(dx, dy, dz) || 1;
  const zx = -dx / len, zy = -dy / len, zz = -dz / len; // camera looks down -Z
  let xx = 1 * zz - 0 * zy; // cross(up=(0,1,0), z)
  let xy = 0 * zx - 0 * zz;
  let xz = 0 * zy - 1 * zx;
  let xl = Math.hypot(xx, xy, xz);
  if (xl < 1e-6) {
    xx = 1; xy = 0; xz = 0; xl = 1;
  }
  xx /= xl; xy /= xl; xz /= xl;
  const yy = zz * xx - zx * xz; // cross(z, x)
  const yz = zx * xy - zy * xx;
  const yx = zy * xz - zz * xy;
  const m11 = xx, m12 = yx, m13 = zx, m22 = yy, m23 = zy, m32 = yz, m33 = zz;
  const ey = Math.asin(Math.max(-1, Math.min(1, m13)));
  let ex: number;
  let ez: number;
  if (Math.abs(m13) < 0.9999999) {
    ex = Math.atan2(-m23, m33);
    ez = Math.atan2(-m12, m11);
  } else {
    ex = Math.atan2(m32, m22);
    ez = 0;
  }
  return { x: ex, y: ey, z: ez };
}

// Compute the cinematic camera pose for a given start pose + saturated scroll
// progress (zp, 0→1). Always looks at the portal centre so it stays dead-centre.
function computeCam(start: Vec3, startRot: Vec3, zp: number) {
  const P = PIVOT;
  const off0 = { x: start.x - P.x, y: start.y - P.y, z: start.z - P.z };
  const baseLen = Math.hypot(off0.x, off0.y, off0.z) || 1;
  const azFull = deg2rad(AZIMUTH_DEG);
  const aEnd = PHASE_A_END;
  const bEnd = PHASE_B_END;
  // Orbit radius factor: base radius + reveal pull, minus any manual pull.
  const fOrbit = 1 + ESTABLISH_BACK / baseLen - RADIUS_PULL;
  // Orbit-end pose (also the dive's start), reused by both phases.
  const offA = rotateY(off0, azFull);
  const orbit = {
    x: P.x + offA.x * fOrbit,
    y: P.y + offA.y * fOrbit + ELEV_LIFT,
    z: P.z + offA.z * fOrbit,
  };
  // Look target dropped BELOW the portal centre to reveal the lower design.
  const dropped = { x: P.x, y: P.y - LOOK_DROP, z: P.z };

  if (zp <= aEnd) {
    // Phase A — start EXACTLY on the authored frame (t=0) and ease into the
    // orbit: swing the angle and aim DOWN so the full design comes into view.
    // LINEAR within the phase — the caller (tick) applies ONE global smoothstep
    // across the whole flight, so the orbit→dive boundary stays velocity-
    // continuous (per-phase smoothstep eased to a STOP at the seam = a visible
    // mid-flight pause / "two-step" glitch).
    const t = aEnd <= 0 ? 1 : clamp01(zp / aEnd);
    const az = azFull * t;
    const s = lerp(1, fOrbit, t);
    const off = rotateY(off0, az);
    const pos = {
      x: P.x + off.x * s,
      y: P.y + off.y * s + ELEV_LIFT * t,
      z: P.z + off.z * s,
    };
    const look = lookAtEuler(pos, dropped);
    return {
      pos,
      rot: {
        x: lerpAngle(startRot.x, look.x, t),
        y: lerpAngle(startRot.y, look.y, t),
        z: lerpAngle(startRot.z, look.z, t),
      },
    };
  }
  // Phase B — dive toward the portal CENTRE along a quadratic Bézier that bows
  // sideways (ARC_SIDE) so the camera curves AROUND the person instead of
  // punching through them, easing the aim from the dropped point up to centre.
  const u = clamp01((zp - aEnd) / Math.max(0.01, bEnd - aEnd));
  // Dive END: all the way to centre on X/Z, held above it (P.y + DIVE_LIFT) so
  // a full-depth dive doesn't sink into the floor/legs.
  const E = {
    x: lerp(orbit.x, P.x, DOLLY_DEEP),
    y: lerp(orbit.y, P.y + DIVE_LIFT, DOLLY_DEEP),
    z: lerp(orbit.z, P.z, DOLLY_DEEP),
  };
  // Bézier control point: midpoint of (orbit→E) pushed out along the in-plane
  // "right" vector so the flight path swings past the person.
  const dirx = E.x - orbit.x;
  const dirz = E.z - orbit.z;
  const dlen = Math.hypot(dirx, dirz) || 1;
  const rightx = -dirz / dlen;
  const rightz = dirx / dlen;
  const cx = (orbit.x + E.x) / 2 + rightx * ARC_SIDE;
  const cy = (orbit.y + E.y) / 2;
  const cz = (orbit.z + E.z) / 2 + rightz * ARC_SIDE;
  const mt = 1 - u;
  const pos = {
    x: mt * mt * orbit.x + 2 * mt * u * cx + u * u * E.x,
    y: mt * mt * orbit.y + 2 * mt * u * cy + u * u * E.y,
    z: mt * mt * orbit.z + 2 * mt * u * cz + u * u * E.z,
  };
  const lookT = { x: dropped.x, y: lerp(dropped.y, P.y, u), z: dropped.z };
  return { pos, rot: lookAtEuler(pos, lookT) };
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
  // ── First-scroll cinematic state machine ──────────────────────────────
  // "idle"    → waiting for the first downward scroll gesture
  // "playing" → the timed orbit→dive flight is running (page is pinned)
  // "done"    → flight finished; page has handed off to the path cards
  // The flight is TIME-based (not scroll-scrubbed), so it always plays the
  // full choreography on the very first gesture — no multi-screen runway and
  // no progress-threshold snap that lagged or mis-fired.
  const playRef = useRef<"idle" | "playing" | "done">("idle");
  const playPRef = useRef(0); // current 0→1 progress of the flight

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
    // Prefetch the lazy Spline chunk so the canvas can mount instantly.
    // The heavy scene FILE itself is downloaded by the loading overlay
    // (see lib/asset-preloader + LoadingScreen/RouteTransitionLoader),
    // which holds the splash until it's fully in, so we don't fetch it
    // again here.
    void import("@splinetool/react-spline").catch(() => {});
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

  // Apply a 0→1 scroll progress to the camera as a straight FORWARD dolly
  // along each camera's ORIGINAL view axis (validated in the live tester). zp
  // saturates at ZOOM_COMPLETE_AT so the camera is fully inside the portal
  // BEFORE the scroll ends, then HOLDS there for a seamless hand-off to the
  // path cards. Position movement is the ONLY thing that flies in — the scene
  // clamps setZoom() — and it is a real 3D move, not a CSS scale.
  const renderZoom = (progress: number) => {
    const app = splineRef.current;
    if (!app || reducedRef.current || isMobileRef.current) return;
    const zp = clamp01(progress / ZOOM_COMPLETE_AT);
    try {
      const cams = camerasRef.current;
      if (cams.length) {
        for (const { obj, start, startRot } of cams) {
          if (!obj.position || !obj.rotation) continue;
          const { pos, rot } = computeCam(start, startRot, zp);
          obj.position.x = pos.x;
          obj.position.y = pos.y;
          obj.position.z = pos.z;
          // keep rotation continuous frame-to-frame via shortest-arc set
          obj.rotation.x = lerpAngle(obj.rotation.x, rot.x, 1);
          obj.rotation.y = lerpAngle(obj.rotation.y, rot.y, 1);
          obj.rotation.z = lerpAngle(obj.rotation.z, rot.z, 1);
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

  // ── First-scroll cinematic: orbit → dive → hand-off to the path cards ──
  // The hero plays ONE time-based camera flight the instant the user makes a
  // downward scroll gesture, then auto-scrolls to #paths. There is no long
  // scroll-scrub runway (which forced the user to flick through several
  // screens) and no progress-threshold snap (which lagged / mis-fired and let
  // the camera "restart"). Reversible: returning to the very top resets the
  // camera + fades and re-arms the trigger.
  useEffect(() => {
    if (typeof window === "undefined") return;

    const PLAY_MS = 6000; // total flight (slow + cinematic): orbit (≈0.2) then long dive (≈0.8)
    let startAt = 0;
    let raf = 0;

    type Lenis = {
      scrollTo: (t: unknown, o?: unknown) => void;
      stop: () => void;
      start: () => void;
    };
    const getLenis = () =>
      (window as unknown as { __lenis?: Lenis }).__lenis;

    // Drive camera + DOM fades for a single 0→1 flight progress.
    const applyFrame = (p: number) => {
      playPRef.current = p;
      renderZoom(p);
      const bd = backdropRef.current;
      if (bd)
        bd.style.transform = `translateY(${(p * -52).toFixed(1)}px) scale(${(1 + p * 0.1).toFixed(4)})`;
      const headline = headlineRef.current;
      if (headline) {
        headline.style.opacity = clamp01(1 - p / 0.32).toFixed(4);
        headline.style.transform = `translateY(${(p * -80).toFixed(1)}px) scale(${(1 + p * 0.06).toFixed(4)})`;
      }
      const cue = cueRef.current;
      if (cue) cue.style.opacity = clamp01(1 - p / 0.06).toFixed(4);
    };

    // Hard scroll lock for the duration of the flight ONLY. Paired with
    // lenis.stop(); fully removed at hand-off so Lenis is never persistently
    // blocked (a persistent blocker is what previously broke smooth scroll).
    // ⚠ CAPTURE-PHASE + stopImmediatePropagation (NOT just preventDefault): the
    // Spline scene ships its OWN authored wheel/scroll camera animation. With only
    // preventDefault on the bubble phase that animation still ran and FOUGHT /
    // overrode our computeCam writes every frame — which is why the dive never
    // centred AND why changing the geometry constants did "nothing" on the live
    // site. Swallowing the event in the capture phase, before Spline's own
    // listener, neutralises it so our flight is the ONLY thing moving the camera.
    // Scoped to the flight only, so Lenis is untouched the rest of the time.
    // (Mirrors the proven spline-tester rig, which DOES centre.)
    const blockScroll = (e: Event) => {
      e.stopImmediatePropagation();
      if (e.cancelable) e.preventDefault();
    };

    const handoff = () => {
      playRef.current = "done";
      window.removeEventListener("wheel", blockScroll, { capture: true });
      window.removeEventListener("touchmove", blockScroll, { capture: true });
      const lenis = getLenis();
      try {
        lenis?.start();
      } catch {
        /* noop */
      }
      const paths = document.getElementById("paths");
      if (paths && lenis) {
        // Land #paths FLUSH to the top: the 100svh hero (scene + backdrop)
        // scrolls fully away, so the cards never appear over the galaxy.
        lenis.scrollTo(paths, {
          offset: 0,
          duration: 0.7,
          easing: (t: number) => 1 - Math.pow(1 - t, 3),
        });
      } else if (paths) {
        paths.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    const tick = (now: number) => {
      if (playRef.current !== "playing") return;
      const p = clamp01((now - startAt) / PLAY_MS);
      // Trapezoid ease (soft launch, CONSTANT-speed cruise, soft arrival) — no
      // midpoint velocity spike; computeCam is linear within each phase and the
      // phases are speed-matched, so the whole flight glides at one even pace.
      const zp = easeFlight(p);
      applyFrame(zp);
      // Hand off the INSTANT the dive lands (eased zp reaches PHASE_B_END) instead
      // of waiting out the full PLAY_MS. After the dive completes the trapezoid's
      // decel tail left the camera frozen for a beat before the page moved — that
      // dead gap read as "auto-scroll fires with a delay after the scroll finished".
      if (zp >= PHASE_B_END || p >= 1) {
        handoff();
        return;
      }
      raf = requestAnimationFrame(tick);
    };

    const startPlayback = () => {
      if (playRef.current !== "idle") return;
      // Never hijack on mobile / reduced-motion / before the scene is ready,
      // and only from the top of the hero.
      if (!splineRef.current || reducedRef.current || isMobileRef.current)
        return;
      if (window.scrollY > window.innerHeight * 0.5) return;
      playRef.current = "playing";
      const lenis = getLenis();
      try {
        // Halt Lenis FIRST so the wheel delta it already captured on this same
        // tick is never applied — that residual scroll was the visible "lurch"
        // before the flight. Only settle to the exact top if we drifted off it.
        lenis?.stop();
        if (window.scrollY !== 0) {
          lenis?.scrollTo(0, { immediate: true });
          window.scrollTo(0, 0);
        }
      } catch {
        /* noop */
      }
      window.addEventListener("wheel", blockScroll, {
        passive: false,
        capture: true,
      });
      window.addEventListener("touchmove", blockScroll, {
        passive: false,
        capture: true,
      });
      startAt = performance.now();
      raf = requestAnimationFrame(tick);
    };

    // ── First downward intent triggers the flight ──
    // Eligible = idle, scene loaded, desktop, motion ok, at the hero top. We
    // only preventDefault (non-passive) when actually triggering, so Lenis is
    // never persistently blocked — it works normally every other moment.
    const eligible = () =>
      playRef.current === "idle" &&
      !!splineRef.current &&
      !reducedRef.current &&
      !isMobileRef.current &&
      window.scrollY <= window.innerHeight * 0.5;
    const onWheel = (e: WheelEvent) => {
      // This listener is registered at MOUNT (capture phase), BEFORE Spline
      // finishes loading and attaches its own wheel listener — so it reliably
      // runs FIRST. During the flight, swallow here so Spline's authored camera
      // animation never sees the event and can't fight computeCam. (blockScroll
      // is added later than Spline in startPlayback, so it alone could run AFTER
      // Spline — THIS is the reliable guard. See architect review.)
      if (playRef.current === "playing") {
        e.stopImmediatePropagation();
        if (e.cancelable) e.preventDefault();
        return;
      }
      if (playRef.current !== "idle") return;
      if (e.deltaY > 0 && eligible()) {
        // Capture-phase: kill the TRIGGER gesture before Spline's own listener
        // sees it, so the scene's authored animation never even starts.
        e.stopImmediatePropagation();
        e.preventDefault(); // stop the page from lurching before the flight
        startPlayback();
      }
    };
    let touchY = 0;
    const onTouchStart = (e: TouchEvent) => {
      touchY = e.touches[0]?.clientY ?? 0;
    };
    const onTouchMove = (e: TouchEvent) => {
      // Same reliable-first guard as onWheel (registered at mount, before Spline).
      if (playRef.current === "playing") {
        e.stopImmediatePropagation();
        if (e.cancelable) e.preventDefault();
        return;
      }
      if (playRef.current !== "idle") return;
      const y = e.touches[0]?.clientY ?? 0;
      if (touchY - y > 6 && eligible()) {
        e.stopImmediatePropagation();
        e.preventDefault();
        startPlayback();
      }
    };
    const SCROLL_KEYS = [
      "ArrowDown",
      "ArrowUp",
      "PageDown",
      "PageUp",
      "Home",
      "End",
      " ",
      "Spacebar",
    ];
    const onKey = (e: KeyboardEvent) => {
      // During the flight the page is pinned — swallow every scroll key so the
      // keyboard can't move the page while the camera is mid-cinematic (the
      // wheel/touch blocker only covers pointer input).
      if (playRef.current === "playing") {
        if (SCROLL_KEYS.includes(e.key)) e.preventDefault();
        return;
      }
      if (playRef.current !== "idle") return;
      if (["ArrowDown", "PageDown", " ", "Spacebar"].includes(e.key)) {
        if (
          splineRef.current &&
          !reducedRef.current &&
          !isMobileRef.current &&
          window.scrollY <= window.innerHeight * 0.5
        )
          e.preventDefault();
        startPlayback();
      }
    };

    // ── Reset at the very top so the flight can replay (reversible) ──
    const onScroll = () => {
      if (playRef.current === "playing") return;
      if (window.scrollY < 8 && playRef.current === "done") {
        playRef.current = "idle";
        applyFrame(0);
        const headline = headlineRef.current;
        if (headline) {
          headline.style.opacity = "1";
          headline.style.transform = "none";
        }
        const cue = cueRef.current;
        if (cue) cue.style.opacity = "1";
      }
    };

    // wheel + touchmove are NON-passive so the trigger can preventDefault the
    // first gesture (kills the pre-flight lurch); they only ever preventDefault
    // when actually launching, so Lenis scrolls normally the rest of the time.
    window.addEventListener("wheel", onWheel, {
      passive: false,
      capture: true,
    });
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, {
      passive: false,
      capture: true,
    });
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("wheel", blockScroll, { capture: true });
      window.removeEventListener("touchmove", blockScroll, { capture: true });
      try {
        getLenis()?.start();
      } catch {
        /* noop */
      }
    };
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

    // Render the first frame at the flight's current progress (0 on a fresh
    // load) so the camera sits on the authored welcome pose, ready for the
    // first-scroll cinematic.
    renderZoom(playPRef.current);
    // Tell the loading screen the heavy 3D scene has painted its first
    // frame so the splash holds until the galaxy is actually ready
    // (instead of lifting onto an empty backdrop that "pops in" later
    // on the first scroll).
    try {
      (window as unknown as { __refgdScenePending?: boolean }).__refgdScenePending = false;
      // Announce readiness only AFTER the galaxy has actually painted.
      // Dispatching straight from onSplineLoad can fire a frame before
      // the canvas is visually present, letting the loading overlay lift
      // onto a still-blank backdrop. Two rAF cycles guarantee the first
      // real frame has been committed before we say "ready".
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          try {
            window.dispatchEvent(new Event("refgd:scene-ready"));
          } catch {
            /* noop */
          }
        }),
      );
    } catch {
      /* noop */
    }
  };


  const showSpline = mounted && !isMobile && !reduced && SCENE_URL.length > 0;

  return (
    <section
      ref={sectionRef}
      data-testid="cosmic-journey"
      className="relative w-full"
      style={{ height: isMobile ? "150svh" : reduced ? "130svh" : "100svh" }}
    >
      <div
        className="sticky top-0 grid w-full place-items-center overflow-hidden"
        style={{ height: "100svh", contain: "layout paint", background: "#05060a" }}
      >
        {/* ── Solid space backdrop. The colourful "default" gradient was removed
            per owner request: the loading splash now holds until the Spline
            scene has actually painted (see LoadingScreen heavy-route gating),
            so this is only ever a plain near-black behind the 3D galaxy — never
            a coloured backdrop that flashes in before the scene appears. ── */}
        <div
          ref={backdropRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{ background: "#05060a", willChange: "transform" }}
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
