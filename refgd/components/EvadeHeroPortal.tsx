"use client";

/**
 * EvadeHeroPortal — cinematic video hero for the Evade-Cancelations page.
 *
 * The hero is a full-bleed neon-vortex video backdrop (a seamless ~22s
 * crossfade loop, muted) behind a readability scrim and the centred
 * caption. The old layered "vault core" SVG emblem, the parallax cyber-grid
 * tunnel, drifting particles and the scroll prompt were removed per request
 * so the video reads cleanly with just the headline + subtext.
 *
 * CRITICAL coupling: this route is registered as "scene-bearing" in
 * lib/asset-preloader.ts (pathHasScene) + components/LoadingScreen.tsx, so the
 * loading splash WAITS for a `refgd:scene-ready` window event before lifting.
 * This component MUST dispatch it, or the splash hangs to its 60s ceiling.
 *
 * Anti-lag (especially on iPhone): the video is a bitrate-capped H.264 encode
 * (no decode spikes) and only plays while the hero is on-screen, the tab is
 * visible, and reduced-motion is off — otherwise it pauses so it never decodes
 * off-screen. Reduced-motion shows the poster frame only.
 */

import { motion, useScroll, useTransform } from "framer-motion";
import { useEffect, useRef, useState } from "react";

export default function EvadeHeroPortal({
  caption,
  subCaption,
}: {
  caption?: string;
  subCaption?: string;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);

  const { scrollYProgress } = useScroll({
    target: wrapRef,
    offset: ["start start", "end end"],
  });

  // The caption drifts up slightly and fades out near the end of the runway.
  const captionOpacity = useTransform(scrollYProgress, [0, 0.86, 1], [1, 1, 0]);
  const captionY = useTransform(scrollYProgress, [0, 1], [0, -28]);

  // Tell LoadingScreen the hero scene is ready (this route waits for it).
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fire = () =>
      window.dispatchEvent(new CustomEvent("refgd:scene-ready"));
    let r1 = 0;
    let r2 = 0;
    r1 = requestAnimationFrame(() => {
      r2 = requestAnimationFrame(fire);
    });
    const t = window.setTimeout(fire, 700);
    return () => {
      cancelAnimationFrame(r1);
      cancelAnimationFrame(r2);
      window.clearTimeout(t);
    };
  }, []);

  // Track whether the hero is on-screen (gates video playback).
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof window === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => setPaused(!entries[entries.length - 1].isIntersecting),
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Respect reduced motion: don't autoplay the heavy background video — the
  // poster frame stays visible instead.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduceMotion(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Anti-lag: play only while the hero is on-screen, the tab is visible, and
  // reduced-motion is off; pause otherwise so it never decodes off-screen.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const hidden = typeof document !== "undefined" && document.hidden;
    if (!paused && !hidden && !reduceMotion) {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      v.pause();
    }
  }, [paused, reduceMotion]);

  // Pause the backdrop video whenever the tab is hidden; resume when it returns
  // (and the hero is still on-screen). Battery + compositor relief.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const onVis = () => {
      const v = videoRef.current;
      if (!v) return;
      if (document.hidden) {
        v.pause();
      } else if (!paused && !reduceMotion) {
        const p = v.play();
        if (p && typeof p.catch === "function") p.catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [paused, reduceMotion]);

  // Kick playback the instant the browser has enough data — fixes the start
  // delay caused by lazy preloading. Guarded by the same on-screen gates.
  const kickPlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    const hidden = typeof document !== "undefined" && document.hidden;
    if (!paused && !reduceMotion && !hidden) {
      const p = v.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    }
  };

  const words = caption ? caption.split(" ") : [];

  return (
    <section ref={wrapRef} className="ev-hero relative" style={{ height: "180svh" }}>
      <div className="ev-hero-stage sticky top-0 flex h-screen w-full items-center justify-center overflow-hidden">
        {/* ───────── VIDEO BACKDROP (seamless ~22s loop, muted) ───────── */}
        <video
          ref={videoRef}
          className="ev-hero-video"
          poster="/uploads/evade-hero-vortex-poster.webp"
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-hidden="true"
          onLoadedData={kickPlay}
          onCanPlay={kickPlay}
        >
          <source src="/uploads/evade-hero-vortex.mp4" type="video/mp4" />
        </video>
        <div aria-hidden="true" className="ev-hero-videoscrim" />

        {/* ───────── CAPTION ───────── */}
        {caption && (
          <motion.div
            style={{ opacity: captionOpacity, y: captionY }}
            suppressHydrationWarning
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
          >
            <div className="container-wide text-center">
            <h3
              className="editorial-display mx-auto max-w-5xl text-balance uppercase text-white"
              style={{
                textShadow:
                  "0 4px 40px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.85)",
                lineHeight: 1.05,
                letterSpacing: "0.07em",
                fontSize: "clamp(2.2rem, 7vw, 6rem)",
              }}
            >
              {words.map((word, wi) => {
                let charIndex = 0;
                for (let k = 0; k < wi; k++) charIndex += words[k].length;
                return (
                  <span
                    key={wi}
                    className="inline-block"
                    style={{
                      whiteSpace: "pre",
                      perspective: 800,
                      marginRight: wi < words.length - 1 ? "0.35em" : 0,
                    }}
                    aria-label={word}
                  >
                    {[...word].map((ch, ci) => {
                      const idx = charIndex + ci;
                      return (
                        <motion.span
                          key={ci}
                          aria-hidden
                          className="inline-block"
                          initial={{ opacity: 0, y: "110%", rotateX: -85 }}
                          animate={{ opacity: 1, y: "0%", rotateX: 0 }}
                          transition={{
                            duration: 0.85,
                            delay: 0.15 + idx * 0.028,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          style={{ transformOrigin: "50% 100%" }}
                        >
                          {ch}
                        </motion.span>
                      );
                    })}
                  </span>
                );
              })}
            </h3>
            {subCaption && (
              <motion.p
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.8,
                  delay: 0.15 + words.length * 0.12 + 0.1,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-white/95 sm:mt-10 sm:text-lg"
                style={{
                  textShadow:
                    "0 0 24px rgba(255,255,255,0.55), 0 0 48px rgba(34,211,238,0.35), 0 2px 8px rgba(0,0,0,0.7)",
                }}
              >
                {subCaption}
              </motion.p>
            )}
            </div>
          </motion.div>
        )}
      </div>

      <style>{`
        /* ── Video backdrop (neon vortex) + readability scrim ── */
        .ev-hero-video {
          position: absolute; inset: 0;
          width: 100%; height: 100%;
          object-fit: cover; object-position: center;
          transform: translateZ(0);
          background: #05070f;
          pointer-events: none;
        }
        .ev-hero-videoscrim {
          position: absolute; inset: 0;
          pointer-events: none;
          background:
            radial-gradient(ellipse 78% 64% at 50% 38%, rgba(5,7,15,0) 30%, rgba(5,7,15,0.32) 100%),
            linear-gradient(180deg, rgba(5,7,15,0.55) 0%, rgba(5,7,15,0.16) 30%, rgba(5,7,15,0.34) 66%, rgba(5,7,15,0.92) 100%);
        }
      `}</style>
    </section>
  );
}
