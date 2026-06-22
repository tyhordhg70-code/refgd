"use client";

import { useEffect, useRef } from "react";

/**
 * StoreListVideoBackground — fixed full-viewport video backdrop for the
 * Store List page. Replaces the previous flat bg-ink-950 floor + animated
 * gradient sweeps + 1000vh orb / particle / star wrapper (which together
 * GPU-promoted hundreds of blurred, mix-blend, willChange elements and were
 * a major mobile-compositor cost). A single decoded video plus a few static
 * scrim gradients is far lighter AND is the requested liquid-reflections
 * look.
 *
 * Source clip: /store-list-bg.mp4 — a seamless boomerang loop cut from a 4K
 * "multicoloured liquid reflections" recording, downscaled to 720p H.264.
 * The clip is colourful and busy, so the scrim layers below are deliberately
 * heavy: the page sits MANY readable illustrations on top (CashbackScene and
 * the per-category scenes), and those must stay legible. We darken the whole
 * frame, then add a centre + edge vignette so foreground copy and the
 * illustration line-art read clearly against the moving colour.
 *
 * No mix-blend-mode is used anywhere — it black-boxes on iOS Safari. The
 * video is fully OPAQUE and object-cover so it hides everything behind it;
 * a bg-ink-950 fallback paints before the poster/video decode.
 */
export default function StoreListVideoBackground() {
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

    // iOS often blocks the initial autoplay until a user gesture — retry on
    // the first interaction, then detach the listeners.
    const onFirstGesture = () => {
      tryPlay();
      window.removeEventListener("touchstart", onFirstGesture);
      window.removeEventListener("click", onFirstGesture);
    };

    if (reduce) {
      // Respect reduced-motion: show the poster frame, never play.
      video.pause();
    } else {
      tryPlay();
      window.addEventListener("touchstart", onFirstGesture, { passive: true });
      window.addEventListener("click", onFirstGesture);
    }

    // A full-viewport modal (InfoModal) lays a backdrop-blur sheet on top of
    // this video. Re-blurring a PLAYING video every frame melts the compositor
    // (the "popup freezes up" report), yet the video is invisible behind the
    // modal's bg-black/80. So pause while any overlay is open and resume only
    // once ALL overlays have closed. A depth counter (not a boolean) keeps
    // stacked/nested overlays safe — one close can't resume the video while
    // another overlay is still up.
    let overlayDepth = 0;
    const onOverlayOpen = () => {
      overlayDepth += 1;
      video.pause();
    };
    const onOverlayClose = () => {
      overlayDepth = Math.max(0, overlayDepth - 1);
      if (overlayDepth === 0 && !reduce && !document.hidden) tryPlay();
    };
    window.addEventListener("refgd:overlay-open", onOverlayOpen);
    window.addEventListener("refgd:overlay-close", onOverlayClose);

    const onVisibility = () => {
      if (document.hidden) video.pause();
      // Don't resume while a modal is open — it paused us on purpose.
      else if (!reduce && overlayDepth === 0) tryPlay();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("touchstart", onFirstGesture);
      window.removeEventListener("click", onFirstGesture);
      window.removeEventListener("refgd:overlay-open", onOverlayOpen);
      window.removeEventListener("refgd:overlay-close", onOverlayClose);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-[2] overflow-hidden bg-ink-950"
      data-testid="store-list-video-bg"
    >
      <video
        ref={videoRef}
        className="absolute inset-0 h-full w-full object-cover"
        src="/store-list-bg.mp4"
        poster="/store-list-bg-poster.webp"
        muted
        loop
        playsInline
        autoPlay
        preload="auto"
        controls={false}
        disablePictureInPicture
        style={{ filter: "brightness(0.62) saturate(1.04)" }}
      />
      {/* Flat darken — heavy, because many readable illustrations sit on top */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(4,3,15,0.52)" }}
      />
      {/* Edge vignette — pulls the busy colour away from the readable centre
          column where headings, cards and illustrations live */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 90% 80% at 50% 45%, transparent 28%, rgba(4,3,15,0.45) 66%, rgba(4,3,15,0.78) 100%)",
        }}
      />
      {/* Subtle theme tint top + bottom to keep the page's cosmic identity */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 85% 50% at 50% -12%, rgba(76,29,149,0.26) 0%, transparent 55%), radial-gradient(ellipse 85% 50% at 50% 112%, rgba(34,211,238,0.10) 0%, transparent 55%)",
        }}
      />
    </div>
  );
}
