"use client";
import { motion, useScroll, useTransform, useMotionValueEvent } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Scroll-linked image-sequence "scrollytelling" component.
 *
 * Container:    h-[180svh]  (the scroll runway)
 * Inside:       sticky <canvas> top-0 h-screen w-full (centered)
 *
 * The animation is SCROLL-DRIVEN:
 *   – Page loads → progress = 0, caption fully visible, no animation playing.
 *   – User starts scrolling → canvas frames advance with their scroll.
 *   – Animation completes within ONE continuous scroll past the runway.
 *   – Scroll back up → animation reverses, caption returns.
 *
 * Loads `frame_[i]_delay-0.04s.webp` (or any base) from `dir`,
 * preloads them all, then draws the current frame to canvas based on
 * scroll progress. While loading, shows a spinner. Background colour is
 * configurable so the page bleeds into the frame edges seamlessly.
 *
 * If `dir` doesn't exist or returns 0 frames, the component falls back
 * to a procedural canvas scene that animates with scroll — guaranteeing
 * the user always sees something cinematic while real frames are being
 * prepared.
 */
export default function ChipScroll({
  dir,
  frameCount,
  framePrefix = "frame_",
  frameSuffix = "_delay-0.04s.webp",
  background = "#05060a",
  caption,
  subCaption,
  accent = "#f5b945",
  fallbackKind = "iris",
}: {
  /** Folder under /public, e.g. "/sequence/evade" — no trailing slash */
  dir: string;
  /** How many frames to attempt to load. */
  frameCount: number;
  framePrefix?: string;
  frameSuffix?: string;
  /** Hex background that perfectly matches the frame edge. */
  background?: string;
  /** Optional fade-in/out caption rendered over the canvas. */
  caption?: string;
  subCaption?: string;
  /** Accent hex used by the procedural fallback. */
  accent?: string;
  fallbackKind?: "iris" | "shield" | "chess";
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const framesRef = useRef<HTMLImageElement[]>([]);
  const [loaded, setLoaded] = useState(0);
  const [total, setTotal] = useState(frameCount);
  const [usingFallback, setUsingFallback] = useState(false);

  // Scroll-driven progress tied to the section's scroll runway. Animation
  // does NOT auto-play on mount — it only advances when the user scrolls
  // through the section, and reverses when they scroll back up.
  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });

  // The hero scene is INVISIBLE at scroll progress 0 and ramps in over
  // the first ~5 % of the runway. This fixes "the scrolling thing
  // appears at page load instead of when the user starts scrolling".
  //
  // IMPLEMENTATION: framer-motion's MotionValue→style binding on
  // <motion.canvas> loses the inline opacity after hydration (the
  // SSR HTML shows opacity:0 but the browser repaints at 1 the
  // moment the JS subscribes), so we drive the opacity via plain
  // React state mirrored from scrollYProgress through
  // useMotionValueEvent. State starts at 0 and only ever advances
  // when a real scroll event fires — bulletproof.
  // v6.13.2: caption + scroll prompt VISIBLE FROM PAGE LOAD.
  // Previously both started at opacity 0 and ramped up only after
  // the user scrolled — combined with the canvas (which is also
  // hidden at p=0 by design) this produced a totally blank
  // 180 svh hero on first load. The user reported this as
  // "evade page being blank on first load". Caption + scroll
  // hint now read at full opacity from the very first frame so
  // the hero is never empty; canvas still blooms in only after
  // the user scrolls (preserving the original "scrollytelling
  // unmasks the scene" intent).
  const captionOpacity = useTransform(scrollYProgress, [0.0, 0.92, 1.0], [1, 1, 0]);
  const captionY       = useTransform(scrollYProgress, [0.0, 1.0], [0, -24]);
  const scrollPromptOpacity = useTransform(scrollYProgress, [0.0, 0.08, 0.18], [1, 1, 0]);

  // hasUserScrolled — guarantees the canvas stays invisible until the
  // visitor actually scrolls. Defends against any framer-motion
  // hydration weirdness, anchor-jumps, or programmatic scroll that
  // could otherwise nudge scrollYProgress past 0 on first paint and
  // unmask the canvas before the user has done anything. The wrapper
  // opacity is `hasUserScrolled ? sceneOpacity : 0` — once the user
  // has touched the page even once, the smooth scroll-driven ramp
  // takes over.
  const [hasUserScrolled, setHasUserScrolled] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const arm = () => setHasUserScrolled(true);
    window.addEventListener("scroll", arm, { passive: true, once: true });
    window.addEventListener("wheel", arm, { passive: true, once: true });
    window.addEventListener("touchmove", arm, { passive: true, once: true });
    window.addEventListener("keydown", arm, { once: true });
    return () => {
      window.removeEventListener("scroll", arm);
      window.removeEventListener("wheel", arm);
      window.removeEventListener("touchmove", arm);
      window.removeEventListener("keydown", arm);
    };
  }, []);

  const [sceneOpacity, setSceneOpacity] = useState(0);
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    // Linear ramp 0 → 1 over the first 4 % of the runway, clamped.
    const next = Math.max(0, Math.min(1, v / 0.04));
    setSceneOpacity(next);
  });
  const effectiveOpacity = hasUserScrolled ? sceneOpacity : 0;

  // ── Preload frames ──────────────────────────────────────────────
  useEffect(() => {
    // Frame sequence intentionally disabled — go straight to the
    // procedural fallback scene. Avoids spamming the console with
    // 404s when the /sequence directory hasn't been generated.
    if (frameCount <= 0) {
      setUsingFallback(true);
      return;
    }
    let cancelled = false;
    let resolved = 0;
    let failed = 0;
    const imgs: HTMLImageElement[] = [];

    for (let i = 1; i <= frameCount; i++) {
      const im = new Image();
      const padded = String(i).padStart(2, "0");
      // Try with zero-padded then plain index — supports both naming styles.
      im.src = `${dir}/${framePrefix}${padded}${frameSuffix}`;
      im.onload = () => {
        if (cancelled) return;
        resolved++;
        setLoaded(resolved);
      };
      im.onerror = () => {
        if (cancelled) return;
        failed++;
        // try non-padded
        const im2 = new Image();
        im2.src = `${dir}/${framePrefix}${i}${frameSuffix}`;
        im2.onload = () => {
          if (cancelled) return;
          imgs[i - 1] = im2;
          resolved++;
          setLoaded(resolved);
        };
        im2.onerror = () => {
          if (cancelled) return;
          // Both naming styles failed for this index.
          if (failed >= Math.max(3, Math.floor(frameCount * 0.3))) {
            setUsingFallback(true);
          }
        };
      };
      imgs[i - 1] = im;
    }

    framesRef.current = imgs;

    return () => {
      cancelled = true;
    };
  }, [dir, frameCount, framePrefix, frameSuffix]);

  const allReady = !usingFallback && loaded >= frameCount;

  // ── Canvas painter — event-driven: paints only when scroll progress
  // changes or the canvas is resized. No 60fps idle loop. ─────────
  useEffect(() => {
    const cnv = canvasRef.current;
    if (!cnv) return;
    const c = cnv.getContext("2d");
    if (!c) return;

    let dpr = Math.min(2, window.devicePixelRatio || 1);
    let w = window.innerWidth;
    let h = window.innerHeight;
    const lastProgressRef = { current: 0 };
    let scheduled = false;

    const schedulePaint = () => {
      if (scheduled) return;
      scheduled = true;
      requestAnimationFrame(() => {
        scheduled = false;
        paint(lastProgressRef.current);
      });
    };

    const resize = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cnv.clientWidth;
      h = cnv.clientHeight;
      cnv.width = w * dpr;
      cnv.height = h * dpr;
      c.setTransform(dpr, 0, 0, dpr, 0, 0);
      schedulePaint();
    };

    const paintFrame = (p: number) => {
      const idx = Math.min(framesRef.current.length - 1, Math.max(0, Math.floor(p * (framesRef.current.length - 1))));
      const img = framesRef.current[idx];
      c.fillStyle = background;
      c.fillRect(0, 0, w, h);
      if (img && img.complete && img.naturalWidth > 0) {
        // contain-fit centered
        const ar = img.naturalWidth / img.naturalHeight;
        const targetH = h * 0.95;
        const targetW = targetH * ar;
        const finalW = Math.min(targetW, w * 0.95);
        const finalH = finalW / ar;
        c.drawImage(img, (w - finalW) / 2, (h - finalH) / 2, finalW, finalH);
      }
    };

    // Procedural fallback — a cinematic 3D iris/shield/chess scene that
    // disassembles as you scroll. No external assets needed.
    const paintFallback = (p: number) => {
      c.fillStyle = background;
      c.fillRect(0, 0, w, h);
      const cx = w / 2;
      const cy = h / 2;
      const minDim = Math.min(w, h);

      // Drift particles always
      const particleCount = 90;
      for (let i = 0; i < particleCount; i++) {
        const seed = i * 12.9898;
        const baseX = ((Math.sin(seed) * 43758.5453) % 1 + 1) % 1;
        const baseY = ((Math.cos(seed * 1.7) * 43758.5453) % 1 + 1) % 1;
        const dx = (i % 3 === 0 ? 1 : -1) * p * 80 * (0.5 + (i % 5) * 0.18);
        const dy = (i % 2 === 0 ? 1 : -1) * p * 60 * (0.5 + (i % 4) * 0.22);
        const x = baseX * w + dx;
        const y = baseY * h + dy;
        const size = 0.6 + (i % 4) * 0.7;
        const alpha = 0.28 + 0.7 * (1 - Math.abs(p - 0.5) * 2);
        c.fillStyle = `rgba(255,225,140,${alpha.toFixed(3)})`;
        c.beginPath();
        c.arc(x, y, size, 0, Math.PI * 2);
        c.fill();
      }

      if (fallbackKind === "iris") {
        // Concentric rings rotate + collapse with progress
        const layers = 7;
        for (let i = 0; i < layers; i++) {
          const k = i / (layers - 1);
          const rot = p * Math.PI * (0.6 + i * 0.18) * (i % 2 === 0 ? 1 : -1);
          const baseR = minDim * 0.18 + minDim * 0.05 * i;
          const r = baseR * (1 - p * 0.7 * (1 - k * 0.6));
          c.save();
          c.translate(cx, cy);
          c.rotate(rot);
          c.beginPath();
          for (let s = 0; s < 16; s++) {
            const a = (s / 16) * Math.PI * 2;
            const rr = r + Math.sin(a * 5 + p * 6) * (4 - i * 0.4);
            const x = Math.cos(a) * rr;
            const y = Math.sin(a) * rr;
            if (s === 0) c.moveTo(x, y);
            else c.lineTo(x, y);
          }
          c.closePath();
          c.lineWidth = 1.4;
          c.strokeStyle = withAlpha(accent, 0.55 - i * 0.045);
          c.stroke();
          c.restore();
        }
        // Core orb
        const orbR = minDim * 0.13 * (1 - p * 0.4);
        const grad = c.createRadialGradient(cx - orbR * 0.3, cy - orbR * 0.3, 0, cx, cy, orbR);
        grad.addColorStop(0, "rgba(255,255,255,0.95)");
        grad.addColorStop(0.4, withAlpha(accent, 0.85));
        grad.addColorStop(1, withAlpha(accent, 0));
        c.fillStyle = grad;
        c.beginPath();
        c.arc(cx, cy, orbR, 0, Math.PI * 2);
        c.fill();
      } else if (fallbackKind === "shield") {
        // Hex shield that rotates & breaks apart into shards as you scroll
        const r = minDim * 0.28;
        const shards = 6;
        for (let i = 0; i < shards; i++) {
          const a0 = (i / shards) * Math.PI * 2 - Math.PI / 2;
          const a1 = ((i + 1) / shards) * Math.PI * 2 - Math.PI / 2;
          const dist = p * minDim * 0.25;
          const mid = (a0 + a1) / 2;
          const ox = Math.cos(mid) * dist;
          const oy = Math.sin(mid) * dist;
          c.save();
          c.translate(cx + ox, cy + oy);
          c.rotate(p * Math.PI * 0.5 * (i % 2 === 0 ? 1 : -1));
          c.beginPath();
          c.moveTo(0, 0);
          c.lineTo(Math.cos(a0) * r, Math.sin(a0) * r);
          c.lineTo(Math.cos(a1) * r, Math.sin(a1) * r);
          c.closePath();
          c.fillStyle = withAlpha(accent, 0.18 - i * 0.012);
          c.fill();
          c.lineWidth = 1.5;
          c.strokeStyle = withAlpha(accent, 0.7);
          c.stroke();
          c.restore();
        }
        // Center check mark / lock
        c.save();
        c.translate(cx, cy);
        c.scale(1 - p * 0.4, 1 - p * 0.4);
        c.beginPath();
        c.moveTo(-r * 0.18, 0);
        c.lineTo(-r * 0.04, r * 0.16);
        c.lineTo(r * 0.22, -r * 0.18);
        c.strokeStyle = "white";
        c.lineWidth = 5;
        c.lineCap = "round";
        c.lineJoin = "round";
        c.stroke();
        c.restore();
      } else {
        // chess: king crown rises out of an isometric board
        const board = minDim * 0.34;
        const tile = board / 4;
        c.save();
        c.translate(cx, cy + board * 0.25);
        c.rotate(p * 0.4);
        for (let r = 0; r < 4; r++) {
          for (let col = 0; col < 4; col++) {
            const x = (col - r) * tile;
            const y = (col + r) * tile * 0.5;
            const z = p * 30 * ((col + r) % 2);
            c.beginPath();
            c.moveTo(x, y - z);
            c.lineTo(x + tile, y + tile * 0.5 - z);
            c.lineTo(x, y + tile - z);
            c.lineTo(x - tile, y + tile * 0.5 - z);
            c.closePath();
            c.fillStyle = (r + col) % 2 === 0 ? withAlpha(accent, 0.32) : "rgba(255,255,255,0.06)";
            c.fill();
            c.strokeStyle = withAlpha(accent, 0.5);
            c.stroke();
          }
        }
        c.restore();
        // King silhouette ascending
        const ky = cy - p * minDim * 0.15;
        c.save();
        c.translate(cx, ky);
        c.fillStyle = withAlpha(accent, 0.85);
        c.strokeStyle = "white";
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(-22, 30);
        c.quadraticCurveTo(0, -10, 22, 30);
        c.lineTo(28, 80);
        c.lineTo(-28, 80);
        c.closePath();
        c.fill();
        c.stroke();
        // Crown cross
        c.beginPath();
        c.moveTo(0, -30);
        c.lineTo(0, -8);
        c.moveTo(-8, -19);
        c.lineTo(8, -19);
        c.lineWidth = 4;
        c.stroke();
        c.restore();
      }
    };

    const paint = (p: number) => {
      if (usingFallback || framesRef.current.length === 0) {
        paintFallback(p);
      } else {
        paintFrame(p);
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(cnv);
    resize();

    // PRELOAD strategy (Round 6.4):
    //   The canvas is rendered with a CSS opacity tied to scroll
    //   progress (sceneOpacity above) so the user does NOT see the
    //   procedural scene at page load — it only blooms in once they
    //   start scrolling. We still warm the canvas with one paint at
    //   p=0 so the bitmap is ready the moment scroll lifts opacity
    //   above zero (otherwise the first scrolled pixel would show a
    //   blank black rectangle for a frame).
    paint(0);

    // Tell the LoadingScreen the cinematic scene is warm and ready.
    // LoadingScreen waits for this event (with a short timeout) so
    // the loading overlay doesn't fade out before the scene's first
    // pixels exist. Window-event so it works across components.
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("refgd:scene-ready"));
    }

    // Repaint whenever scroll progress changes.
    const unsub = scrollYProgress.on("change", (v) => {
      lastProgressRef.current = v;
      schedulePaint();
    });

    // Also repaint when frames finish loading (image-mode).
    const onImgReady = () => schedulePaint();
    framesRef.current.forEach((im) => {
      if (im && !im.complete) im.addEventListener("load", onImgReady, { once: true });
    });

    // v6.13.15 — User reported the Evade page still shows "loading
    // scene · 0%" for several seconds before anything appears. The
    // /sequence/evade frame directory is currently EMPTY in the
    // public folder, so all 48 image requests 404 and the spinner
    // sat for 6 seconds before falling back. Tightened the timer
    // 6000 → 1200 ms so the procedural fallback (cinematic iris /
    // shield / chess scene) takes over almost immediately when a
    // frame directory is missing or slow. The fallback itself
    // already looks great, so this is purely a "stop showing the
    // loading text" fix.
    const fallbackTimer = window.setTimeout(() => {
      if (!usingFallback && loaded < frameCount) setUsingFallback(true);
    }, 1200);

    return () => {
      ro.disconnect();
      unsub();
      window.clearTimeout(fallbackTimer);
      framesRef.current.forEach((im) => im && im.removeEventListener("load", onImgReady));
    };
  }, [usingFallback, background, accent, fallbackKind, scrollYProgress, loaded, frameCount]);

  return (
    <section
      ref={wrapRef}
      className="relative w-full"
      style={{
        // Scroll runway: outer is taller than viewport so the inner
        // sticky canvas pins while the user scrolls past, and the
        // animation advances as a function of that scroll. 180svh
        // gives a comfortable single-scroll completion gesture.
        height: "180svh",
        background,
      }}
    >
      <div className="sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
        {/* Wrapper div carries the React-state opacity so the canvas
            can't ever flash at full brightness during hydration.
            Starts at 0, only ramps up when scrollYProgress reports a
            real change. */}
        <div
          className="absolute inset-0 h-full w-full"
          style={{
            opacity: effectiveOpacity,
            transition: "opacity 220ms cubic-bezier(0.4, 0, 0.2, 1)",
            willChange: "opacity",
          }}
        >
          <canvas
            ref={canvasRef}
            className="block h-full w-full"
            style={{ display: "block" }}
            suppressHydrationWarning
          />
        </div>

        {/* Loading spinner — only shown until frames preload OR fallback engages */}
        {!allReady && !usingFallback && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <div className="flex flex-col items-center gap-4">
              <div
                className="h-10 w-10 rounded-full border-2 border-white/15 border-t-white/85 animate-spin"
                style={{ animationDuration: "0.9s" }}
              />
              <p className="heading-display text-[10px] font-semibold uppercase tracking-[0.45em] text-white/55">
                loading scene · {Math.round((loaded / Math.max(1, total)) * 100)}%
              </p>
            </div>
          </div>
        )}

        {/* Caption overlay — visible from load through almost the entire scroll */}
        {caption && (
          <motion.div
            style={{ opacity: captionOpacity, y: captionY }}
            suppressHydrationWarning
            className="container-wide pointer-events-none absolute inset-x-0 bottom-[12%] z-10 text-center"
          >
            <h3
              className="editorial-display mx-auto max-w-5xl text-balance text-white text-[clamp(2.2rem,7vw,6rem)] uppercase"
              style={{ textShadow: "0 4px 40px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.85)" }}
            >
              {caption}
            </h3>
            {subCaption && (
              <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-white/90 sm:text-lg">
                {subCaption}
              </p>
            )}
          </motion.div>
        )}

        {/* Subtle "scroll" prompt at bottom — fades out once the timeline
            advances. Cues the user that scrolling is what drives the scene. */}
        <motion.div
          aria-hidden="true"
          style={{ opacity: scrollPromptOpacity }}
          suppressHydrationWarning
          className="pointer-events-none absolute inset-x-0 bottom-6 z-10 flex flex-col items-center gap-2 text-white/85"
        >
          <span className="heading-display text-[10px] font-semibold uppercase tracking-[0.45em]">
            scroll
          </span>
          <span className="block h-10 w-px animate-pulseGlow bg-gradient-to-b from-white/85 to-transparent" />
        </motion.div>
      </div>
    </section>
  );
}

function withAlpha(hex: string, a: number) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}
