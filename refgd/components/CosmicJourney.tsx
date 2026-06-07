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
  // Authored-animation playback control. stop() halts the scene's looping
  // ambient animation (so the runtime stops rendering a frame every tick while
  // the user just sits on the hero), freeing the main thread + GPU for the
  // cursor. play() resumes it. requestRender() is INDEPENDENT of these and still
  // forces a single frame even while stopped — that is what the scroll-flight
  // camera dolly relies on, so freezing the ambient never blocks the fly-in.
  play?: () => void;
  stop?: () => void;
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
// Pushes the dive's END point sideways (along the same in-plane "right" vector)
// so the camera finishes BESIDE the portal centre/figure instead of converging
// onto it. ARC_SIDE only bows the midpoint; the path still landed on the centre
// (where the person stands) at the end → the through-the-person render spike.
// END_SIDE makes the final approach sweep PAST them. Look-at still tracks the
// portal centre, so the portal stays framed. Tester starting value.
const END_SIDE = 300;

// ── Shared START framing ──────────────────────────────────────────────
// The scene ships THREE cameras ("Camera"/"Camera 2"/"Camera 3") with
// DIFFERENT authored poses, and play() can hand the render to a different
// one than idle was showing → a hard zoom JUMP-CUT on the very first scroll
// (idle = the tight welcome view, flight = a far-back pose with lots of dead
// black). We collapse ALL cameras onto ONE canonical start (the most
// zoomed-IN of them) so idle and the flight share the EXACT same framing no
// matter which camera the runtime renders. START_PULL scales that shared
// start's distance to the portal PIVOT: 1 = the closest camera's natural
// framing, <1 zooms further IN (less dead black), >1 pulls back. Tune this
// ALONE to dial the opening zoom; everything else stays put.
const START_PULL = 1.0;

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
  // In-plane "right" vector of the orbit→portal approach — used to push the END
  // sideways AND to bow the path's midpoint along the same axis.
  const dirx = E.x - orbit.x;
  const dirz = E.z - orbit.z;
  const dlen = Math.hypot(dirx, dirz) || 1;
  const rightx = -dirz / dlen;
  const rightz = dirx / dlen;
  // Offset the END sideways so the final approach sweeps PAST the person rather
  // than converging onto the portal centre where they stand.
  E.x += rightx * END_SIDE;
  E.z += rightz * END_SIDE;
  // Bézier control point: midpoint of (orbit→E) pushed out along the same
  // "right" vector so the whole flight path swings past the person.
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
  componentDidCatch() {
    // If the 3D scene fails to load/render (blocked CDN, chunk load error,
    // WebGL unsupported/crashed) onSplineLoad never fires, so the loading
    // splash would wait for a `refgd:scene-ready` that never comes — up to
    // its 60s ceiling. Emit a terminal ready signal here so the overlay lifts
    // promptly onto the solid backdrop instead of hanging on a dead scene.
    try {
      (window as unknown as { __refgdScenePending?: boolean }).__refgdScenePending = false;
      window.dispatchEvent(new Event("refgd:scene-ready"));
    } catch {
      /* noop */
    }
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
  // Keep the heavy 3D scene MOUNTED only while the hero is on (or near) screen.
  // Once you scroll past the hero it is unmounted, which disposes its WebGL
  // context + worker pool + the continuous main-thread render loop the perf
  // trace showed saturating the CPU — so the rest of the page runs with ONE
  // WebGL context (the galaxy) instead of two, and the scene's hundreds of MB
  // are released. It transparently re-mounts when the hero returns to view, so
  // nothing is removed: the hero is byte-for-byte identical when on screen.
  const [keepScene, setKeepScene] = useState(true);

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
  // The canonical "start frame": the EXACT per-camera pose the flight begins
  // from, saved (by camera name, as plain numbers) the first time a flight
  // launches. The live camera objects are thrown away when the hero unmounts
  // (scroll far away) and rebuilt on re-mount, so we keep the pose VALUES here
  // to restore the camera to the same welcome frame whenever the user comes
  // back up — the hero returns on the frame it flies from, never the dive end.
  const startFrameRef = useRef<
    Array<{ name: string; start: Vec3; startRot: Vec3 }> | null
  >(null);
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
  // Idle-freeze timer. A beat after the scene settles (and again whenever it
  // returns to idle) we call app.stop() so the hero's looping ambient animation
  // stops rendering a frame every tick while the user just sits there moving the
  // cursor — that continuous render is the hero's share of the pointer lag. The
  // short delay lets any one-shot load/intro animation finish before we freeze.
  const freezeTimerRef = useRef<number>(0);

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
    // The 3D scene now mounts on mobile too, so announce it as pending there
    // as well — this holds the loading splash until the galaxy has actually
    // painted on mobile (no more pop-in after the overlay lifts).
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

  // ── Mount the heavy scene only while the hero is in/near the viewport ──
  // The perf trace showed Spline's runtime pinning the main thread with a
  // continuous render loop the WHOLE time, and once you scroll past the hero
  // it kept running alongside the galaxy background (two WebGL contexts). An
  // IntersectionObserver unmounts the scene a beat after the hero leaves view
  // — disposing its WebGL context, worker pool and render loop — and re-mounts
  // it as the hero comes back. The unmount is debounced so a quick scroll
  // past-and-back never thrashes the GPU.
  // ⚠ The top rootMargin is kept at 0 ON PURPOSE: the scene is NEVER stop()ped
  // while mounted (that would force a play() = the zoom-out jump cut), so a
  // generous top margin (was 300px) kept the heavy ~510MB scene RENDERING for
  // 300px into the path-cards section after the hero scrolled away — which is the
  // "cursor lags / few-second delay hovering over a path card" the owner reported.
  // Dropping the top margin to 0 unmounts the scene the instant the hero clears
  // the viewport, so the cards run on the galaxy's single WebGL context alone.
  // It re-mounts from the local scene cache when the hero scrolls back into view.
  useEffect(() => {
    if (typeof window === "undefined" || reduced) return;
    if (typeof IntersectionObserver === "undefined") return;
    const el = sectionRef.current;
    if (!el) return;
    let unmountTimer = 0;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        if (!e) return;
        if (e.isIntersecting) {
          if (unmountTimer) {
            clearTimeout(unmountTimer);
            unmountTimer = 0;
          }
          setKeepScene(true);
        } else {
          if (unmountTimer) clearTimeout(unmountTimer);
          unmountTimer = window.setTimeout(() => setKeepScene(false), 400);
        }
      },
      { root: null, rootMargin: "0px 0px 400px 0px", threshold: 0 },
    );
    io.observe(el);
    return () => {
      if (unmountTimer) clearTimeout(unmountTimer);
      io.disconnect();
    };
  }, [isMobile, reduced]);

  // When the scene is unmounted, drop the stale runtime handles so the flight
  // trigger correctly WAITS for the scene to reload before it can fire again
  // (startPlayback guards on splineRef.current). onSplineLoad repopulates these
  // when the scene re-mounts.
  useEffect(() => {
    if (!keepScene) {
      splineRef.current = null;
      camerasRef.current = [];
    }
  }, [keepScene]);

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
    // Frame-spike-resistant clock: accumulate elapsed time with a CAPPED delta so
    // a dropped frame can't make the camera jump forward to "catch up" (see tick).
    let elapsed = 0;
    let lastTickAt = 0;
    let raf = 0;
    let pinRaf = 0; // holds the dive-END frame through the hand-off auto-scroll
    let flightOffTimer = 0;
    // Toggle a <html> flag that freezes the ambient background animations
    // (galaxy bgPulse + Cosmic3DShapes, both `.rg-ambient-bg`) so the Spline
    // hero gets the GPU to itself during its flight. Invisible: paused
    // animations hold their current frame and resume seamlessly.
    const setFlight = (on: boolean) =>
      document.documentElement.classList.toggle("hero-flight", on);

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
    // Stateful, idempotent attach/release of the capture-phase wheel/touch swallow.
    // The swallow MUST be torn down on EVERY path that leaves the flight/freeze —
    // pin end, scroll-to-top reset, and effect cleanup — or it would stay attached
    // and permanently break Lenis wheel/touch scrolling (architect review).
    let blockScrollOn = false;
    const attachBlockScroll = () => {
      if (blockScrollOn) return;
      blockScrollOn = true;
      window.addEventListener("wheel", blockScroll, { passive: false, capture: true });
      window.addEventListener("touchmove", blockScroll, { passive: false, capture: true });
    };
    const releaseBlockScroll = () => {
      if (!blockScrollOn) return;
      blockScrollOn = false;
      window.removeEventListener("wheel", blockScroll, { capture: true });
      window.removeEventListener("touchmove", blockScroll, { capture: true });
    };

    const handoff = () => {
      playRef.current = "done";
      // Flight is over and the hero is scrolling away (it unmounts shortly after
      // it leaves view). Re-freeze the ambient animation so it doesn't keep
      // rendering during the hand-off reveal or while it lingers off-screen.
      window.clearTimeout(freezeTimerRef.current);
      // ── TESTER MODEL: never stop() the Spline scene ─────────────────────
      // Stopping the scene forced a play() on the next flight, and that play()
      // ran the scene's authored zoom-out intro = the jump cut. Leaving the scene
      // renderable lets requestRender keep painting and makes the flight cleanly
      // reversible (scroll back up → fly again, with no play()/snap).
      // Keep the ambient bg frozen through the (now ~1.2s) auto-scroll reveal AND
      // a beat past it: while the hero scrolls away the heavy frozen Spline canvas
      // is still being composited every frame, so resuming the galaxy/Cosmic3D bg
      // animations on top of that is what made the scene "stutter as it passes by".
      // Hold the bg paused until the hero has essentially left view (the scene
      // unmounts ~400ms after it does), then release so the cards land calmly.
      flightOffTimer = window.setTimeout(() => setFlight(false), 1300);
      // ⚠ Do NOT release the wheel/touch swallow yet. The hand-off auto-scroll
      // below is a PROGRAMMATIC lenis.scrollTo (no wheel events needed), but the
      // user's flick that launched the flight still has residual momentum, and
      // any wheel/touch that reaches the scene now wakes its OWN authored camera
      // animation — which yanks the camera off the frozen dive-end = the "scene
      // restarts itself during the auto-scroll" the owner reported. Keep blockScroll
      // attached through the freeze-frame pin (released when the pin ends) so the
      // dive-end is the ONLY thing on screen while the hero scrolls away.
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
          // Gentle, longer glide to the cards. The old easeOUT (1-(1-t)^3) starts
          // at FULL speed, so the page lurched the instant the dive landed — that
          // hard yank read as a jump cut. easeINOUT ramps up from a standstill and
          // settles softly, so the hand-off is one continuous motion out of the
          // dive instead of a cut. Longer duration gives the eye time to follow.
          duration: 1.2,
          easing: (t: number) =>
            t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
        });
      } else if (paths) {
        paths.scrollIntoView({ behavior: "smooth", block: "start" });
      }

      // ── Freeze-frame the dive END through the hand-off auto-scroll ──
      // The scene is NEVER stop()ped (stopping forces a play() on the next flight
      // = the authored zoom-out jump cut). So the instant `tick` stops writing the
      // camera, the scene's OWN render loop reclaims it and drifts back toward its
      // authored welcome pose — visible as the hero "restarting from the beginning
      // without animation" while it scrolls away. Keep WRITING the dive-end pose
      // every frame until the hero is off-screen (or the user scrolls back up), so
      // it holds a clean freeze-frame. The reset to frame 0 (so a scroll back up
      // replays from the start) is owned by onScroll's upward branch + the re-mount
      // restore — both of which run once the hero is actually gone / returning.
      const endZp = playPRef.current;
      const pinStart = performance.now();
      const PIN_MS = 1500; // ≥ the 1.2s scrollTo, so the hero is fully gone first
      let lastPinY = window.scrollY;
      cancelAnimationFrame(pinRaf);
      const pin = (now: number) => {
        const y = window.scrollY;
        const goingUp = y < lastPinY - 0.5;
        lastPinY = y;
        // Stop once the hero is off-screen, the user reverses, or a new
        // state begins — onScroll/re-mount then own the reset back to frame 0.
        if (goingUp || playRef.current !== "done" || now - pinStart >= PIN_MS) {
          pinRaf = 0;
          // Freeze-frame is over (hero gone / user reversed) — NOW release the
          // wheel/touch swallow so normal scrolling resumes for the cards.
          releaseBlockScroll();
          return;
        }
        renderZoom(endZp);
        pinRaf = requestAnimationFrame(pin);
      };
      pinRaf = requestAnimationFrame(pin);
    };

    const tick = (now: number) => {
      if (playRef.current !== "playing") return;
      // Advance with a CAPPED per-frame delta. A render spike (e.g. the camera
      // passing the dense person geometry near the portal) drops a frame; with
      // absolute-time progress the NEXT frame would jump forward to catch up —
      // that is the "slight jump cut forward that seems like lag" the owner saw.
      // Capping the delta means a stalled frame only advances a little, so the
      // dive stays continuous (the flight just lasts a hair longer on a drop,
      // it never jumps). 50ms cap ≈ skip at most ~3 frames' worth of advance.
      const dt = Math.min(Math.max(now - lastTickAt, 0), 50);
      lastTickAt = now;
      elapsed += dt;
      const p = clamp01(elapsed / PLAY_MS);
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
      setFlight(true);
      // RESUME the scene's render loop for the whole flight. The dive is driven
      // by writing each camera's position/rotation every rAF (renderZoom), and
      // it is the CONTINUOUS loop that actually PAINTS those moving frames AND
      // keeps the galaxy alive during the dive — that animated look is the entire
      // point of the hero.
      // ⚠ Do NOT stop() the scene here. An earlier attempt froze the scene to
      // shave per-frame ambient cost and relied on requestRender() alone to paint
      // the dive; on the live site that left the camera move UNPAINTED — the
      // whole flight visibly vanished and only the DOM welcome-text fade
      // remained. play() is what makes the perfected orbit→dive actually render.
      window.clearTimeout(freezeTimerRef.current);
      // ── Re-anchor the flight START to the camera's CURRENT (displayed, still-
      // FROZEN) pose, BEFORE we resume the scene. This is the critical ordering:
      // play() below restarts the authored ambient, which immediately snaps the
      // camera off the static welcome frame. If we read the pose AFTER play(), the
      // flight would begin from that snapped/drifted pose — i.e. the animation
      // would start from a DIFFERENT zoom than the still scene the user was just
      // looking at. Reading it here, while still frozen, makes the orbit→dive
      // begin on EXACTLY the idle frame. The dive still ends framed on the fixed
      // PIVOT geometry, so this only sets the START, never the centred landing.
      try {
        for (const c of camerasRef.current) {
          if (c.obj.position) {
            c.start = {
              x: c.obj.position.x,
              y: c.obj.position.y,
              z: c.obj.position.z,
            };
          }
          if (c.obj.rotation) {
            c.startRot = {
              x: c.obj.rotation.x,
              y: c.obj.rotation.y,
              z: c.obj.rotation.z,
            };
          }
        }
      } catch {
        /* noop */
      }
      // Persist this exact start frame (by camera name) so that after the user
      // scrolls past the hero — which unmounts the scene and disposes these
      // camera objects — a later re-mount can put the camera back on the SAME
      // welcome frame instead of a freshly-drifted authored pose.
      try {
        startFrameRef.current = camerasRef.current.map((c) => ({
          name: (c.obj as unknown as { name?: string }).name ?? "",
          start: { ...c.start },
          startRot: { ...c.startRot },
        }));
      } catch {
        /* noop */
      }
      // ── TESTER MODEL: do NOT call play() ─────────────���──────────────────
      // play() resumes the scene's authored "intro", which dollies the camera
      // OUT to a wide pose and OVERRIDES our per-frame computeCam writes for the
      // ENTIRE flight — THAT is the zoom-out jump cut (and why every pose tweak
      // did "nothing": the authored timeline owned the camera). The scene is now
      // NEVER stop()ped, so renderZoom()'s requestRender() paints the moving dive
      // frames directly — exactly like the proven spline-tester, which never
      // calls play()/stop(). Paint the first frame (the re-anchored start pose)
      // before the rAF tick takes over.
      applyFrame(playPRef.current);
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
      attachBlockScroll();
      elapsed = 0;
      lastTickAt = performance.now();
      cancelAnimationFrame(pinRaf);
      pinRaf = 0;
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

    // ── Reset as the user comes back UP so the flight replays (reversible) ──
    // Two things happen on the way back up after a flight:
    //  1) As soon as they scroll UP toward the hero, snap the camera back to the
    //     start frame (frame 0 == the re-anchored welcome pose). Without this the
    //     hero would scroll back into view still showing the zoomed-in DIVE END
    //     until the very top — the "wrong frame on the way up". Upward-only, so
    //     the handoff's own downward auto-scroll to #paths never trips it.
    //  2) At the very top, do the full idle re-arm (re-show headline/cue, restart
    //     the idle-freeze) so the next downward scroll can fly again.
    let lastScrollY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const goingUp = y < lastScrollY - 0.5;
      lastScrollY = y;
      // IDLE-CALM sync (deterministic, independent of the flight state machine).
      // While idling — i.e. NOT mid-flight ("playing") and NOT post-flight scrolling
      // away ("done", which the hand-off timer owns) — keep the ambient-bg freeze ON
      // only near the hero top and RELEASE it the moment the user scrolls down toward
      // the cards. This covers the paths the flight never fires on (scrollbar drag,
      // mid-page entry) so `.hero-flight` can never get stuck ON over the cards.
      if (
        playRef.current === "idle" &&
        !isMobileRef.current &&
        !reducedRef.current
      ) {
        setFlight(y < window.innerHeight * 0.5);
      }
      if (playRef.current === "playing") return;
      if (playRef.current !== "done") return;
      if (goingUp && y < window.innerHeight && playPRef.current !== 0) {
        // Restore camera + headline + backdrop to the start frame as the hero
        // returns. applyFrame(0) renders on-demand even though the scene is
        // frozen; the playPRef!==0 guard means we paint it ONCE on the way up
        // rather than re-rendering on every scroll tick after we're already there.
        applyFrame(0);
      }
      // ⚠ Gate the return-to-top idle re-arm on `pinRaf === 0`. The hand-off
      // auto-scroll BEGINS at y≈0 (startPlayback pinned the page to the top) with
      // playRef already "done", so the first ticks of the programmatic glide
      // satisfy y<8 — running this block then reset the state to idle, cancelled
      // the freeze pin, and snapped the camera to frame 0 WHILE the auto-scroll
      // was still gliding to the cards = the "scene restarts / goes back to the
      // first frame during auto scroll" the owner reported. The freeze pin
      // (pinRaf) is active for the WHOLE hand-off glide and is the precise
      // discriminator: pinRaf !== 0 ⇒ mid-hand-off (skip); pinRaf === 0 ⇒ the pin
      // has ended (hero left view, OR the user reversed — the pin self-terminates
      // on goingUp), i.e. a genuine return to the top, so the reset is safe and
      // replay is never deadlocked.
      if (y < 8 && pinRaf === 0) {
        playRef.current = "idle";
        window.clearTimeout(flightOffTimer);
        cancelAnimationFrame(pinRaf);
        pinRaf = 0;
        // Back at the top before the pin's own teardown ran (e.g. keyboard Home /
        // fast reverse during the freeze window) — release the swallow here too,
        // or wheel/touch scrolling would stay permanently blocked.
        releaseBlockScroll();
        // IDLE CALM: re-freeze the ambient bg now that the user is sitting on the
        // hero again, so the Spline scene has the GPU to itself and the cursor
        // stays smooth (see the load-time idle-calm note). Released again the
        // moment the next flight hands off.
        setFlight(true);
        applyFrame(0);
        // Back at the hero top and idle again — re-arm the idle-freeze so the
        // ambient animation stops rendering once it has settled on frame 0.
        window.clearTimeout(freezeTimerRef.current);
        freezeTimerRef.current = window.setTimeout(() => {
          // TESTER MODEL: never stop() — keep the scene renderable so the dive
          // paints via requestRender and the next flight never needs play()
          // (which would re-run the authored zoom-out intro). See the play() site.
          void playRef.current;
        }, 1400);
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
      cancelAnimationFrame(pinRaf);
      window.clearTimeout(flightOffTimer);
      window.clearTimeout(freezeTimerRef.current);
      setFlight(false);
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove, { capture: true });
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll);
      releaseBlockScroll();
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

      // If a previous flight already established the canonical start frame,
      // restore each freshly-rebuilt camera to it (matched by name). Without
      // this, a re-mount (scroll away then back) re-captures whatever pose the
      // ambient happens to have drifted to, so the hero would come back on a
      // DIFFERENT frame than the one it flies from. This is what makes "scroll
      // back up → same start frame" hold across an unmount/re-mount.
      try {
        const saved = startFrameRef.current;
        if (saved) {
          for (const c of cams) {
            const nm = (c.obj as unknown as { name?: string }).name ?? "";
            const m = saved.find((s) => s.name === nm);
            if (m) {
              c.start = { ...m.start };
              c.startRot = { ...m.startRot };
            }
          }
        }
      } catch {
        /* noop */
      }

      // ── Collapse every camera onto ONE canonical START pose ──────────
      // This is the fix for the first-scroll "jump cut zoom out": the three
      // cameras have different authored framings, and play() can switch the
      // active one, so the flight began on a DIFFERENT (far-back) camera than
      // the idle view. Pick the most zoomed-IN camera (smallest distance to
      // the portal PIVOT) and copy its pose onto ALL of them, scaled by
      // START_PULL. Now idle and the flight start are pixel-identical whether
      // the runtime renders "Camera", "Camera 2", or "Camera 3".
      try {
        if (camerasRef.current.length > 1) {
          let ref = camerasRef.current[0];
          let refLen = Number.POSITIVE_INFINITY;
          for (const c of camerasRef.current) {
            const len = Math.hypot(
              c.start.x - PIVOT.x,
              c.start.y - PIVOT.y,
              c.start.z - PIVOT.z,
            );
            if (len < refLen) {
              refLen = len;
              ref = c;
            }
          }
          const k = START_PULL;
          const canonStart = {
            x: PIVOT.x + (ref.start.x - PIVOT.x) * k,
            y: PIVOT.y + (ref.start.y - PIVOT.y) * k,
            z: PIVOT.z + (ref.start.z - PIVOT.z) * k,
          };
          for (const c of camerasRef.current) {
            c.start = { ...canonStart };
            c.startRot = { ...ref.startRot };
          }
        }
      } catch {
        /* noop */
      }

      // Persist the canonical start (by camera name) so a scroll-away/back
      // re-mount restores the SAME shared frame instead of re-diverging.
      try {
        startFrameRef.current = camerasRef.current.map((c) => ({
          name: (c.obj as unknown as { name?: string }).name ?? "",
          start: { ...c.start },
          startRot: { ...c.startRot },
        }));
      } catch {
        /* noop */
      }

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

    // ── Present a STATIC start frame the instant the scene loads ──
    // Fresh load → render the welcome pose (frame 0). RE-MOUNT after a flight
    // (scrolled away then back) → playRef is still "done" with playPRef at the
    // dive's end, so force frame 0 (which resolves to the restored canonical pose
    // captured above) so the hero ALWAYS returns on its start frame, never the
    // zoomed-in dive end.
    const idleLoad = playRef.current === "idle";
    const returningToStart =
      playRef.current === "done" && !!startFrameRef.current;
    renderZoom(idleLoad || returningToStart ? 0 : playPRef.current);

    window.clearTimeout(freezeTimerRef.current);
    (window as unknown as { __refgdScenePending?: boolean }).__refgdScenePending = false;

    // ── IDLE CALM: free the GPU for Spline while the user sits on the hero ──
    // The spline-tester renders this SAME scene continuously and is smooth — so
    // the live idle cursor lag is NOT Spline alone, it is Spline PLUS the galaxy
    // gradient + Cosmic3DShapes ambient animations compositing on top of it. We
    // do NOT stop() the Spline scene (stopping forces a play() on the next flight,
    // which re-runs the authored zoom-out intro = the jump cut). Instead we pause
    // ONLY the other ambient bg animations (the `.hero-flight` class → paused
    // `.rg-ambient-bg`) while the hero is the active view, matching the tester's
    // lean GPU budget. Desktop + motion-ok + at the top only; the flight keeps it
    // on through hand-off, then releases it for the cards section.
    try {
      if (
        !reducedRef.current &&
        !isMobileRef.current &&
        window.scrollY < window.innerHeight * 0.5
      ) {
        document.documentElement.classList.add("hero-flight");
      }
    } catch {
      /* noop */
    }

    // Reveal on the next paint and freeze the scene. Two rAFs guarantee the first
    // frame is committed before stop(), so the still galaxy is fully painted, never
    // blank. Guarded on not-"playing" so a flight launched in this window is never
    // frozen (startPlayback owns play()/stop() mid-flight).
    const revealNow = () =>
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          // TESTER MODEL: never stop() the scene — keeping it renderable lets
          // requestRender paint the flight, so the next dive never needs play()
          // (which would re-run the authored zoom-out intro = the jump cut).
          try {
            window.dispatchEvent(new Event("refgd:scene-ready"));
          } catch {
            /* noop */
          }
        }),
      );

    // FRESH LOAD or re-mount: the canonical ZOOMED-IN start pose is already
    // established above — onSplineLoad collapses all cameras onto the most
    // zoomed-in camera's pose (the "before" framing the owner liked) and line
    // ~1197 painted it via renderZoom(0). Just reveal on the next paint.
    //
    // ⚠ Do NOT re-capture the camera pose after a delay here. The old code held
    // the splash ~1.5s and then re-read the live camera as the "canonical start"
    // — that made sense ONLY in the old play() model, where play() ran the
    // authored intro that dollied the camera OUT and we wanted to freeze on that
    // settled (zoomed-out) end. In the never-play() model nothing dollies the
    // camera, so that re-capture just baked in whatever drift had happened (e.g.
    // a stray wheel waking the scene's own animation) — which is exactly why the
    // hero "started way too zoomed out". Keeping the collapsed zoomed-in pose and
    // revealing immediately restores the original framing.
    revealNow();
  };


  // The 3D hero now renders on mobile too (owner request). On mobile we never
  // run the desktop scroll-flight (it hijacks touch and burns GPU) — the scene
  // simply paints its welcome pose and the idle-freeze settles it to a static
  // 3D render a beat after load, so it shows the real galaxy with no lag.
  const showSpline =
    mounted && !reduced && keepScene && SCENE_URL.length > 0;

  return (
    <section
      ref={sectionRef}
      data-testid="cosmic-journey"
      className="relative w-full"
      style={{ height: isMobile ? "100svh" : reduced ? "130svh" : "100svh" }}
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

        {/* ── Mobile fallback star canvas — only when the 3D scene can't show
            (e.g. reduced-motion); otherwise the real Spline hero renders. ── */}
        {isMobile && !showSpline && (
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
