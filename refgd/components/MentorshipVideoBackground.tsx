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
 * Source clip: /mentorship-bg.mp4 — a seamless ~32s boomerang loop built
 * from the owner-supplied "4K Liquid Reflections in Red and Purple Neon"
 * abstract screensaver. Re-encoded to 1080p H.264 (yuv420p, faststart) so
 * it decodes smoothly on iOS Safari. The boomerang (forward + reversed)
 * guarantees a perfect seamless loop with no visible cut.
 *
 * Playback speed is a constant 1.0× everywhere on the page (owner request:
 * "keep playback speed normal") — no scroll-driven slowdown.
 *
 * Readability: a flat darken + a centre vignette + a subtle violet/magenta
 * theme tint sit on top of the video so white copy (which already carries
 * heavy text-shadows) stays easily legible. No mix-blend-mode is used (it
 * black-boxes on iOS).
 */

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

    if (reduce) {
      // Honour prefers-reduced-motion: stop the autoplay the <video loop
      // autoPlay> attributes kicked off and hold on the poster frame.
      video.pause();
      try {
        video.currentTime = 0;
      } catch {
        /* not yet seekable — fine, it's paused */
      }
    } else {
      tryPlay();
      window.addEventListener("touchstart", onFirstGesture, { passive: true });
      window.addEventListener("click", onFirstGesture);
    }

    // Pause when the tab is hidden to save battery / decode work, resume on
    // return (unless the user prefers reduced motion).
    const onVisibility = () => {
      if (document.hidden) {
        video.pause();
      } else if (!reduce) {
        tryPlay();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // The loading screen treats /exclusive-mentorships as a heavy-asset route:
    // it fully downloads /mentorship-bg.mp4 behind the splash AND waits for a
    // `refgd:scene-ready` event before lifting, so the page is never revealed
    // onto a not-yet-ready backdrop. Announce readiness as soon as the video
    // can play (or has errored, or the user prefers reduced motion), with a
    // safety timeout so the splash can never hang on this signal.
    let announced = false;
    const announceReady = () => {
      if (announced) return;
      announced = true;
      try {
        window.dispatchEvent(new Event("refgd:scene-ready"));
      } catch {
        /* noop */
      }
    };
    if (reduce || video.readyState >= 2) announceReady();
    video.addEventListener("canplay", announceReady, { once: true });
    video.addEventListener("loadeddata", announceReady, { once: true });
    video.addEventListener("error", announceReady, { once: true });
    const readyFallback = window.setTimeout(announceReady, 8000);

    return () => {
      window.removeEventListener("touchstart", onFirstGesture);
      window.removeEventListener("click", onFirstGesture);
      document.removeEventListener("visibilitychange", onVisibility);
      video.removeEventListener("canplay", announceReady);
      video.removeEventListener("loadeddata", announceReady);
      video.removeEventListener("error", announceReady);
      window.clearTimeout(readyFallback);
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
        className="absolute inset-0 h-full w-full object-contain md:object-cover"
        src="/mentorship-bg.mp4"
        poster="/mentorship-bg-poster.webp"
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        controls={false}
        disablePictureInPicture
        style={{ filter: "brightness(0.74) saturate(1.05)" }}
      />
      {/* Flat darken for overall contrast */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(4,3,15,0.38)" }}
      />
      {/* Centre vignette — keeps centred headings readable over the brighter
          neon reflections */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 70% at 50% 44%, rgba(4,3,15,0.50) 0%, rgba(4,3,15,0.18) 48%, transparent 74%)",
        }}
      />
      {/* Subtle violet/magenta theme tint top + bottom to match the red/purple
          neon source and keep the page's cosmic identity */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 50% at 50% -12%, rgba(76,29,149,0.26) 0%, transparent 55%), radial-gradient(ellipse 85% 50% at 50% 112%, rgba(190,24,93,0.14) 0%, transparent 55%)",
        }}
      />
    </div>
  );
}
