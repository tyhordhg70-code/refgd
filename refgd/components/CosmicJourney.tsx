"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import KineticText from "./KineticText";

/**
 * CosmicJourney — looping color-changing sphere hero.
 *
 * History: this hero was a ~23 MB Spline WebGL galaxy, then a 101-frame WebP
 * <canvas> sequence, then a one-shot pre-rendered cinematic clip. It now loops
 * the owner's "magic spheres" montage through a <video> element, with the page
 * chrome reacting to the sphere's changing color:
 *
 *   • The sphere clip LOOPS continuously while the hero is on screen.
 *   • A tiny hidden canvas samples the video a few times a second and takes a
 *     luminance-weighted average that ignores the black background and locks
 *     onto the vivid orb color. That color drives a single CSS variable
 *     (`--glow`) — no React re-renders — which tints an ambient glow behind the
 *     orb and the soft blurred screen edges.
 *   • The WHITE welcome text sits over a soft dark scrim + text-shadow so it
 *     stays legible no matter what color the sphere becomes.
 *   • Hand-off: the hero <-> #paths transition AUTO-COMMITS on BOTH desktop and
 *     mobile via the same scroll-triggered handoff (down -> #paths, up -> top);
 *     desktop adds precise wheel/keyboard triggers on top.
 *   • iOS: the desktop colored edge/corner glow uses filter:blur + mix-blend
 *     screen; blur is fine, but mix-blend-mode:screen paints black boxes on iOS
 *     WebKit, so on phones (globals.css @media) the SAME edge/corner glow is kept
 *     with the blend mode neutralised to normal (screen ~= normal on the
 *     near-black hero backdrop), so mobile edges match desktop.
 *   • The video AND the color sampling both stop when the hero leaves the
 *     viewport (no idle work); prefers-reduced-motion shows a static frame
 *     with no playback, no sampling, and no listeners.
 */

// H.264 MP4 is hardware-decoded in every browser → smooth playback.
const VIDEO_SRC_MP4 = "/sphere-montage.mp4";

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
  const isMobileRef = useRef(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    reducedRef.current = !!reduced;
  }, [reduced]);
  useEffect(() => {
    isMobileRef.current = isMobile;
  }, [isMobile]);

  // Viewport size watcher (drives mobile vs desktop auto-scroll hand-off).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ── Loop playback, color sampling, hand-off, and off-screen suspend ──
  useEffect(() => {
    if (typeof window === "undefined" || !mounted) return;
    const video = videoRef.current;
    const section = sectionRef.current;
    if (!video || !section) return;

    const applyFades = (e: number) => {
      const headline = headlineRef.current;
      if (headline) {
        headline.style.opacity = clamp01(1 - e / 0.7).toFixed(3);
        headline.style.transform = `translateY(${(e * -50).toFixed(1)}px)`;
      }
      const cue = cueRef.current;
      if (cue) cue.style.opacity = clamp01(1 - e / 0.4).toFixed(3);
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
    const onLoadedData = () => announce();
    if (video.readyState >= 2) onLoadedData();
    else video.addEventListener("loadeddata", onLoadedData);

    // ── Reduced motion: one static frame, no loop, no sampling, no listeners ──
    if (reducedRef.current) {
      try {
        video.pause();
        video.currentTime = 0;
      } catch {
        /* noop */
      }
      return () => {
        video.removeEventListener("loadeddata", onLoadedData);
      };
    }

    // ── Color sampling → drives the --glow CSS variable (no React re-renders) ──
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 24;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    let cur = [90, 130, 255]; // start on a cool blue
    let lastSample = 0;
    let sampleRaf = 0;
    let sampling = false;

    const sampleTick = (t: number) => {
      if (!sampling) return;
      sampleRaf = requestAnimationFrame(sampleTick);
      if (!ctx || video.readyState < 2 || video.paused) return;
      if (t - lastSample < 90) return; // ~11 Hz
      lastSample = t;
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
        let rs = 0, gs = 0, bs = 0, ws = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2];
          const lum = r + g + b;
          if (lum < 70) continue; // skip the near-black background
          const w = lum * lum; // emphasize the bright vivid core
          rs += r * w; gs += g * w; bs += b * w; ws += w;
        }
        if (ws > 0) {
          let r = rs / ws, g = gs / ws, b = bs / ws;
          const avg = (r + g + b) / 3;
          const k = 1.4; // saturation boost so the edge glow reads as a real color
          r = Math.min(255, avg + (r - avg) * k);
          g = Math.min(255, avg + (g - avg) * k);
          b = Math.min(255, avg + (b - avg) * k);
          cur = [
            cur[0] + (r - cur[0]) * 0.12,
            cur[1] + (g - cur[1]) * 0.12,
            cur[2] + (b - cur[2]) * 0.12,
          ];
          section.style.setProperty(
            "--glow",
            `${Math.round(cur[0])}, ${Math.round(cur[1])}, ${Math.round(cur[2])}`,
          );
        }
      } catch {
        /* sampling can briefly throw before metadata is ready */
      }
    };
    const startSampling = () => {
      if (sampling) return;
      sampling = true;
      sampleRaf = requestAnimationFrame(sampleTick);
    };
    const stopSampling = () => {
      sampling = false;
      cancelAnimationFrame(sampleRaf);
    };

    // Keep the sphere looping while it is on screen.
    const playLoop = () => {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    const setHeroFlight = (on: boolean) => {
      try {
        document.documentElement.classList.toggle("hero-flight", on);
      } catch {
        /* noop */
      }
    };

    const lenis = () =>
      (window as unknown as { __lenis?: { stop?: () => void; start?: () => void; scrollTo?: (t: unknown, o?: unknown) => void } }).__lenis;

    type State = "idle" | "handoff" | "done";
    let state: State = "idle";
    let handoffRaf = 0;
    let blockOn = false;

    // Capture-phase swallow of scroll input during the short auto-scroll glide.
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
      // Mobile: do NOT swallow touchmove during the glide — a deliberate
      // finger swipe must be able to interrupt/override the auto-scroll so
      // it never feels like a locked "yank". Desktop still swallows wheel.
      if (!isMobileRef.current) {
        window.addEventListener("touchmove", swallow, { passive: false, capture: true });
      }
      window.addEventListener("keydown", blockKeys, { capture: true });
    };
    const releaseBlock = () => {
      if (!blockOn) return;
      blockOn = false;
      window.removeEventListener("wheel", swallow, { capture: true } as EventListenerOptions);
      window.removeEventListener("touchmove", swallow, { capture: true } as EventListenerOptions);
      window.removeEventListener("keydown", blockKeys, { capture: true } as EventListenerOptions);
    };

    // Ease the welcome text out over the glide for a clean hand-off.
    const HANDOFF_MS = 900;
    const startHandoff = () => {
      if (state !== "idle") return;
      state = "handoff";
      setHeroFlight(true);
      attachBlock();
      const l = lenis();
      const target = document.getElementById("paths");
      if (l && l.start) l.start();
      if (!isMobileRef.current && l && l.scrollTo && target) {
        l.scrollTo(target, {
          offset: 0,
          duration: HANDOFF_MS / 1000,
          easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
        });
      } else if (target) {
        target.scrollIntoView({ behavior: "smooth" });
      }
      const t0 = performance.now();
      const drive = (now: number) => {
        const e = clamp01((now - t0) / HANDOFF_MS);
        applyFades(e);
        if (e >= 1) {
          state = "done";
          releaseBlock();
          setHeroFlight(false);
          return;
        }
        handoffRaf = requestAnimationFrame(drive);
      };
      handoffRaf = requestAnimationFrame(drive);
    };

    // ── Reverse handoff: upward intent near the hero/#paths boundary glides
    //    all the way back to the very TOP so the visitor is never parked
    //    between the hero and the first section. Mirror of startHandoff. ──
    const startHandoffUp = () => {
      if (state !== "done") return;
      state = "handoff";
      setHeroFlight(true);
      attachBlock();
      const l = lenis();
      if (l && l.start) l.start();
      // Mobile: use NATIVE smooth scroll, not lenis.scrollTo — a lenis rAF
      // tween isn't cancelled by a finger swipe (it fights the user for the
      // full glide = "yank, can't stop it"); native smooth scroll IS
      // interrupted by a touch-scroll. Desktop keeps lenis (byte-for-byte).
      if (!isMobileRef.current && l && l.scrollTo) {
        l.scrollTo(0, {
          offset: 0,
          duration: HANDOFF_MS / 1000,
          easing: (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
        });
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
      const t0 = performance.now();
      const drive = (now: number) => {
        const e = clamp01((now - t0) / HANDOFF_MS);
        // Ease the welcome text back IN (1 → 0 = faded → fully visible).
        applyFades(1 - e);
        if (e >= 1) {
          state = "idle";
          releaseBlock();
          setHeroFlight(false);
          restoreFades();
          return;
        }
        handoffRaf = requestAnimationFrame(drive);
      };
      handoffRaf = requestAnimationFrame(drive);
    };

    // ── Off-screen suspend (perf): stop loop AND sampling when hero leaves ──
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          playLoop();
          startSampling();
        } else {
          video.pause();
          stopSampling();
        }
      },
      { threshold: 0.2 },
    );
    io.observe(section);

    // Kick things off immediately (the IO callback also fires shortly after).
    playLoop();
    startSampling();

    // ── Scroll snap — works on BOTH mobile (scroll events) and desktop ──
    // Fires on every native scroll: down from top → glide to #paths;
    // up near the boundary → glide back to top. Never yanks from deep content.
    const atTop = () => window.scrollY <= 2;
    const nearBoundary = () => window.scrollY <= window.innerHeight * 1.15;
    // Mobile: the up-handoff must NOT fire while browsing the path cards.
    // #paths starts ~1 viewport down, so the 1.15 boundary catches the
    // cards and yanks back to the top on any small upward swipe. On mobile
    // require the hero to actually be re-entering view (<= 0.5vh). Desktop
    // keeps 1.15 so wheel/keyboard handoff stays byte-for-byte unchanged.
    const nearBoundaryUp = () =>
      window.scrollY <= window.innerHeight * (isMobileRef.current ? 0.5 : 1.15);
    let prevY = window.scrollY;
    const onScrollTrigger = () => {
      const y = window.scrollY;
      const goingDown = y > prevY;
      const goingUp = y < prevY;
      const wasAtTop = prevY <= 2;
      prevY = y;
      if (state === "idle" && goingDown && wasAtTop && y > 2 && y < window.innerHeight * 0.6) {
        startHandoff();
      } else if (state === "done" && goingUp && nearBoundaryUp()) {
        startHandoffUp();
      }
    };
    // Re-arm when the user returns to the very top manually.
    const onScrollReset = () => {
      if (state === "done" && window.scrollY < 8) {
        state = "idle";
        cancelAnimationFrame(handoffRaf);
        restoreFades();
        setHeroFlight(false);
      }
    };

    // Auto-scroll handoff runs on BOTH mobile and desktop via native scroll
    // events (down from the top -> glide to #paths; up near the boundary ->
    // glide back to the top). Desktop adds precise wheel/keyboard triggers below.
    window.addEventListener("scroll", onScrollTrigger, { passive: true });
    window.addEventListener("scroll", onScrollReset, { passive: true });

    // ── Desktop only: precise wheel/keyboard triggers on top of scroll ──
    let cleanupDesktop = () => {};
    if (!isMobileRef.current) {
      const onWheel = (ev: WheelEvent) => {
        if (state === "idle" && ev.deltaY > 0 && atTop()) {
          if (ev.cancelable) ev.preventDefault();
          startHandoff();
        } else if (state === "done" && ev.deltaY < 0 && nearBoundary()) {
          if (ev.cancelable) ev.preventDefault();
          startHandoffUp();
        }
      };
      const onKey = (ev: KeyboardEvent) => {
        if (
          state === "idle" && atTop() &&
          (ev.key === "ArrowDown" || ev.key === "PageDown" || ev.key === " " || ev.key === "End")
        ) {
          ev.preventDefault();
          startHandoff();
        } else if (
          state === "done" && nearBoundary() &&
          (ev.key === "ArrowUp" || ev.key === "PageUp" || ev.key === "Home")
        ) {
          ev.preventDefault();
          startHandoffUp();
        }
      };
      window.addEventListener("wheel", onWheel, { passive: false });
      window.addEventListener("keydown", onKey);
      cleanupDesktop = () => {
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("keydown", onKey);
      };
    }

    let cleanupTriggers = () => {
      window.removeEventListener("scroll", onScrollTrigger);
      window.removeEventListener("scroll", onScrollReset);
      cleanupDesktop();
    };

    return () => {
      cancelAnimationFrame(handoffRaf);
      stopSampling();
      releaseBlock();
      cleanupTriggers();
      io.disconnect();
      video.removeEventListener("loadeddata", onLoadedData);
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
      data-hero-build="mobile-revert-7"
      className="relative w-full overflow-hidden"
      style={{ height: "100svh", ["--glow" as string]: "90, 130, 255" }}
    >
      {/* Solid near-black backdrop so the hero is never blank before the first
          frame paints. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{ background: "#05060a" }}
      />

      {/* Ambient glow behind the sphere — tinted to its current color. */}
      <div
        aria-hidden="true"
        className="cj-glow-ambient pointer-events-none absolute left-1/2 top-1/2"
        style={{
          width: "72vmin",
          height: "72vmin",
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background:
            "radial-gradient(circle, rgba(var(--glow), 0.55), rgba(var(--glow), 0.12) 45%, transparent 68%)",
          filter: "blur(70px)",
          transition: "background 0.25s linear",
        }}
      />

      {/* ── Looping sphere clip ── */}
      <video
        ref={videoRef}
        aria-hidden="true"
        className="cj-hero-video absolute left-1/2 top-1/2"
        muted
        loop={!reduced}
        autoPlay={!reduced}
        playsInline
        preload="auto"
        poster="/sphere-poster.webp"
        style={{
          width: "100%",
          transform: "translate(-50%, -50%)",
          objectFit: "cover",
          display: "block",
        }}
      >
        <source src={VIDEO_SRC_MP4} type="video/mp4" />
      </video>

      {/* MOBILE-only painted edge vignette (.cj-hero-vignette). Fades the video
          rectangle into the #05060a hero backdrop with a plain background
          gradient iOS always honours, doing the job the unreliable <video>
          mask can't. Hidden on desktop, where the mask handles the edges. */}
      <div
        aria-hidden="true"
        className="cj-hero-vignette pointer-events-none absolute inset-0"
      />

      {/* Dark scrim behind the text for white-text legibility. The mobile vs
          desktop gradients live in CSS (.cj-hero-scrim) — NOT a React isMobile
          flag — so phones paint the soft mobile wash on the very first frame
          instead of briefly showing the desktop hard-edged oval. Rendered
          before the colored edges so the edge glow paints on top. */}
      <div
        aria-hidden="true"
        className="cj-hero-scrim pointer-events-none absolute inset-0"
      />

      {/* Soft blurred gradient EDGES, tinted live to the sphere color. Wide,
          strong band so the color is clearly visible around the whole frame. */}
      <div
        aria-hidden="true"
        className="cj-glow-edge pointer-events-none absolute"
        style={{
          inset: "-12%",
          background:
            "radial-gradient(115% 115% at 50% 50%, transparent 34%, rgba(var(--glow), 0.45) 66%, rgba(var(--glow), 0.85) 92%, rgba(var(--glow), 0.95) 100%)",
          filter: "blur(55px)",
          mixBlendMode: "screen",
          transition: "background 0.25s linear",
        }}
      />

      {/* Extra CORNER glow — four radial pools anchored to each corner so the
          color reads strongest in the corners (on top of the edge band). */}
      <div
        aria-hidden="true"
        className="cj-glow-corner pointer-events-none absolute"
        style={{
          inset: "-12%",
          background:
            "radial-gradient(46% 46% at 0% 0%, rgba(var(--glow), 0.9), transparent 72%), radial-gradient(46% 46% at 100% 0%, rgba(var(--glow), 0.9), transparent 72%), radial-gradient(46% 46% at 0% 100%, rgba(var(--glow), 0.9), transparent 72%), radial-gradient(46% 46% at 100% 100%, rgba(var(--glow), 0.9), transparent 72%)",
          filter: "blur(45px)",
          mixBlendMode: "screen",
          transition: "background 0.25s linear",
        }}
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
