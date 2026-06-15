"use client";

import { useEffect, useRef } from "react";

/**
 * MentorshipVideoBackground — fixed full-viewport video backdrop for the
 * Exclusive Mentorships page. Replaces the old CosmicBackground +
 * LiquidParticles (which together animated 36 drifting dust specks plus
 * 14 blurred screen-blend orbs — heavy on the mobile compositor). A single
 * decoded video + a few static scrim gradients is lighter AND is the
 * requested look.
 *
 * Source clip: /sphere-bg.mp4 — a seamless 30s boomerang loop cut from the
 * cool blue/purple electric-plasma sphere at the head of the "MAGIC
 * SPHERES" montage (on-theme with the page's violet #a78bfa + cyan accents).
 * Encoded at 1080p60 (blend-interpolated) so it stays smooth even when
 * played back very slowly — see the playback-rate logic below.
 *
 * Playback speed is scroll-driven:
 *   • Across the parallax hero  → 1.0× (normal — let the clip breathe).
 *   • Once the hero scrolls away → eased down to 0.15× so the moving colour
 *     behind the body copy is calm and never competes with reading.
 * The rate is lerped every frame (not snapped) so the speed change itself
 * is smooth, and the 60fps source keeps 0.15× looking fluid rather than
 * stepping frame-to-frame.
 *
 * Readability: a flat darken + a centre vignette (the plasma sphere is the
 * brightest, centred element) + a subtle violet/cyan theme tint sit on top
 * of the video so white copy (which already carries heavy text-shadows)
 * stays easily legible. No mix-blend-mode is used (it black-boxes on iOS).
 */

const HERO_RATE = 1.0;
const SLOW_RATE = 0.15;

export default function MentorshipVideoBackground() {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    const tryPlay = () => {
      const p = video.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    };

    // iOS sometimes blocks the initial autoplay until a gesture — retry on
    // the first interaction, then detach.
    const onFirstGesture = () => {
      tryPlay();
      window.removeEventListener("touchstart", onFirstGesture);
      window.removeEventListener("click", onFirstGesture);
    };

    let current = HERO_RATE;
    let target = HERO_RATE;
    let raf = 0;
    let running = false;

    const computeTarget = () => {
      const hero = document.querySelector<HTMLElement>(
        '[data-testid="mentorship-hero"]',
      );
      const vh = window.innerHeight || 1;
      if (!hero) {
        target = SLOW_RATE;
        return;
      }
      // How far the hero has scrolled out of view. While its bottom is at
      // (or below) one full viewport height the hero still fills the screen
      // → full speed. As its bottom passes up toward 0.4vh we ease to slow.
      const heroBottom = hero.getBoundingClientRect().bottom;
      const start = vh * 1.0;
      const end = vh * 0.4;
      let p = (start - heroBottom) / (start - end);
      p = Math.max(0, Math.min(1, p));
      target = HERO_RATE - p * (HERO_RATE - SLOW_RATE);
    };

    const applyRate = (r: number) => {
      try {
        video.playbackRate = r;
      } catch {
        /* some browsers throw on extreme rates — ignore */
      }
    };

    const tick = () => {
      current += (target - current) * 0.12;
      if (Math.abs(current - target) < 0.002) current = target;
      applyRate(current);
      if (Math.abs(current - target) > 0.0006) {
        raf = requestAnimationFrame(tick);
      } else {
        running = false;
      }
    };

    const ensureRunning = () => {
      if (!running) {
        running = true;
        raf = requestAnimationFrame(tick);
      }
    };

    const onScroll = () => {
      computeTarget();
      ensureRunning();
    };

    // Initialise at the correct rate with no animation on first paint.
    computeTarget();
    current = target;
    applyRate(current);

    if (!reduce) {
      tryPlay();
      window.addEventListener("touchstart", onFirstGesture, { passive: true });
      window.addEventListener("click", onFirstGesture);
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
    }

    const onVisibility = () => {
      if (document.hidden) {
        video.pause();
      } else if (!reduce) {
        tryPlay();
        onScroll();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("touchstart", onFirstGesture);
      window.removeEventListener("click", onFirstGesture);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.removeEventListener("visibilitychange", onVisibility);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
      data-testid="mentorship-video-bg"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src="/sphere-bg.mp4"
        poster="/sphere-bg-poster.webp"
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        controls={false}
        disablePictureInPicture
        style={{ filter: "brightness(0.7) saturate(1.06)" }}
      />
      {/* Flat darken for overall contrast */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(4,3,15,0.36)" }}
      />
      {/* Centre vignette — tames the bright, centred plasma sphere so
          centred headings stay readable */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 78% 66% at 50% 42%, rgba(4,3,15,0.52) 0%, rgba(4,3,15,0.18) 46%, transparent 72%)",
        }}
      />
      {/* Subtle violet/cyan theme tint top + bottom to keep the page's
          cosmic identity */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 50% at 50% -12%, rgba(76,29,149,0.28) 0%, transparent 55%), radial-gradient(ellipse 85% 50% at 50% 112%, rgba(34,211,238,0.12) 0%, transparent 55%)",
        }}
      />
    </div>
  );
}
