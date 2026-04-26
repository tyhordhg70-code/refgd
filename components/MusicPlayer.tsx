"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Background music — only mounted on the home page (so it stops when you
 * navigate away). To bypass browser autoplay restrictions we start the
 * audio MUTED (which all major browsers permit), and then unmute as soon
 * as the user makes any interaction (pointer / scroll / key). Volume
 * fades in to 50%. Mute button fixed top-right; preference persists.
 */

const TRACKS = [
  { src: "/audio/01-aglow.mp3",       label: "Karamel Kel — Aglow" },
  { src: "/audio/02-mirage.mp3",      label: "Theos & Antent — Mirage" },
  { src: "/audio/03-drowning.mp3",    label: "Antent & vowl — Drowning" },
  { src: "/audio/04-this-feeling.mp3", label: "øneheart — this feeling" },
  { src: "/audio/05-apathy.mp3",      label: "øneheart — apathy" },
  { src: "/audio/06-stellar.mp3",     label: "diedlonely & énouement — stellar" },
  { src: "/audio/07-snowfall.mp3",    label: "øneheart x reidenshi — snowfall" },
];

const TARGET_VOLUME = 0.5;
const FADE_MS = 2400;
const VISIT_KEY = "rg:music-track";
const MUTE_KEY = "rg:music-muted";

function pickTrack() {
  if (typeof window === "undefined") return TRACKS[0];
  const stored = sessionStorage.getItem(VISIT_KEY);
  if (stored) {
    const t = TRACKS.find((x) => x.src === stored);
    if (t) return t;
  }
  const t = TRACKS[Math.floor(Math.random() * TRACKS.length)];
  sessionStorage.setItem(VISIT_KEY, t.src);
  return t;
}

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRafRef = useRef<number | null>(null);
  const [muted, setMuted] = useState<boolean>(false);
  const [track, setTrack] = useState<{ src: string; label: string } | null>(null);

  // Pick the track + read prior mute preference once mounted.
  useEffect(() => {
    setTrack(pickTrack());
    if (typeof window !== "undefined") {
      setMuted(localStorage.getItem(MUTE_KEY) === "1");
    }
  }, []);

  // Start the audio — muted-then-unmute trick so it really autoplays.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !track) return;

    a.volume = 0;
    a.muted = true; // browsers always allow muted autoplay

    let unmuteListenersAttached = false;
    let cancelled = false;

    const tryPlay = () => {
      const p = a.play();
      if (!p) return;
      p.catch(() => {/* iOS may still block; pointerdown will retry below */});
    };

    tryPlay();

    const fadeIn = () => {
      cancelFade();
      const t0 = performance.now();
      const step = (now: number) => {
        const k = Math.min(1, (now - t0) / FADE_MS);
        a.volume = TARGET_VOLUME * k;
        if (k < 1) fadeRafRef.current = requestAnimationFrame(step);
      };
      fadeRafRef.current = requestAnimationFrame(step);
    };

    const unmuteOnInteraction = () => {
      if (cancelled || muted) return;
      a.muted = false;
      // Some browsers pause when un-muting in the same tick; ensure play.
      const p = a.play();
      if (p) p.catch(() => {});
      fadeIn();
      detach();
    };

    const detach = () => {
      if (!unmuteListenersAttached) return;
      window.removeEventListener("pointerdown", unmuteOnInteraction);
      window.removeEventListener("keydown", unmuteOnInteraction);
      window.removeEventListener("scroll", unmuteOnInteraction);
      window.removeEventListener("touchstart", unmuteOnInteraction);
      unmuteListenersAttached = false;
    };

    if (!muted) {
      window.addEventListener("pointerdown", unmuteOnInteraction, { passive: true });
      window.addEventListener("keydown", unmuteOnInteraction);
      window.addEventListener("scroll", unmuteOnInteraction, { passive: true });
      window.addEventListener("touchstart", unmuteOnInteraction, { passive: true });
      unmuteListenersAttached = true;
    }

    return () => {
      cancelled = true;
      cancelFade();
      detach();
      // Stop playback on unmount (route change away from home).
      try { a.pause(); a.currentTime = 0; } catch {}
    };
  }, [track, muted]);

  function cancelFade() {
    if (fadeRafRef.current != null) {
      cancelAnimationFrame(fadeRafRef.current);
      fadeRafRef.current = null;
    }
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      try { localStorage.setItem(MUTE_KEY, next ? "1" : "0"); } catch {}
      const a = audioRef.current;
      if (a) {
        if (next) {
          // Fade out then pause.
          cancelFade();
          const start = a.volume;
          const t0 = performance.now();
          const step = (now: number) => {
            const k = Math.min(1, (now - t0) / 600);
            a.volume = start * (1 - k);
            if (k < 1) {
              fadeRafRef.current = requestAnimationFrame(step);
            } else {
              a.pause();
              a.volume = 0;
            }
          };
          fadeRafRef.current = requestAnimationFrame(step);
        } else {
          a.muted = false;
          const p = a.play();
          if (p) p.catch(() => {});
          // fade back in
          cancelFade();
          const t0 = performance.now();
          const step = (now: number) => {
            const k = Math.min(1, (now - t0) / FADE_MS);
            a.volume = TARGET_VOLUME * k;
            if (k < 1) fadeRafRef.current = requestAnimationFrame(step);
          };
          fadeRafRef.current = requestAnimationFrame(step);
        }
      }
      return next;
    });
  }

  return (
    <>
      {track && (
        <audio
          ref={audioRef}
          src={track.src}
          loop
          autoPlay
          preload="auto"
          aria-label={`Background music — ${track.label}`}
        />
      )}
      <div className="fixed right-3 top-3 z-50">
        <button
          type="button"
          onClick={toggleMute}
          aria-label={muted ? "Unmute background music" : "Mute background music"}
          aria-pressed={muted}
          className="grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-ink-950/70 text-white/85 backdrop-blur-md transition hover:border-white/30 hover:bg-ink-900/85 hover:text-white"
        >
          {muted ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              <line x1="22" y1="9" x2="16" y2="15" />
              <line x1="16" y1="9" x2="22" y2="15" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
          )}
        </button>
      </div>
    </>
  );
}
