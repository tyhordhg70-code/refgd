"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Site-wide background music.
 *  - Plays on every route (one persistent audio element via the root layout).
 *  - Picks a random track per visit (sessionStorage) so it stays consistent
 *    while you navigate, but a fresh visit gets a new pick.
 *  - Fades in to half volume on mount.
 *  - Mute button fixed top-right; preference persists across visits.
 *  - Browser autoplay policy: if blocked, surfaces a tiny "tap to play"
 *    affordance and resumes on first user interaction.
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

function pickTrack(): { src: string; label: string } {
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
  const [needsTap, setNeedsTap] = useState(false);

  useEffect(() => {
    setTrack(pickTrack());
    if (typeof window !== "undefined") {
      setMuted(localStorage.getItem(MUTE_KEY) === "1");
    }
  }, []);

  // Manage playback whenever mute state changes.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !track) return;

    if (muted) {
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
      return;
    }

    a.volume = 0;
    a.muted = false;

    let onAny: ((e: Event) => void) | null = null;
    const removeFallback = () => {
      if (onAny) {
        window.removeEventListener("pointerdown", onAny);
        window.removeEventListener("keydown", onAny);
        window.removeEventListener("touchstart", onAny);
        onAny = null;
      }
    };

    const playPromise = a.play();
    if (playPromise) {
      playPromise
        .then(() => fadeIn(a))
        .catch(() => {
          setNeedsTap(true);
          onAny = () => {
            setNeedsTap(false);
            a.play().then(() => fadeIn(a)).catch(() => {});
            removeFallback();
          };
          window.addEventListener("pointerdown", onAny, { once: true });
          window.addEventListener("keydown", onAny, { once: true });
          window.addEventListener("touchstart", onAny, { once: true });
        });
    }

    return () => {
      cancelFade();
      removeFallback();
    };
  }, [muted, track]);

  function cancelFade() {
    if (fadeRafRef.current != null) {
      cancelAnimationFrame(fadeRafRef.current);
      fadeRafRef.current = null;
    }
  }

  function fadeIn(a: HTMLAudioElement) {
    cancelFade();
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / FADE_MS);
      a.volume = TARGET_VOLUME * k;
      if (k < 1) fadeRafRef.current = requestAnimationFrame(step);
    };
    fadeRafRef.current = requestAnimationFrame(step);
  }

  function toggleMute() {
    setMuted((m) => {
      const next = !m;
      try { localStorage.setItem(MUTE_KEY, next ? "1" : "0"); } catch {}
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
          preload="auto"
          aria-label={`Background music — ${track.label}`}
        />
      )}
      <div className="fixed right-3 top-3 z-50 flex flex-col items-end gap-1.5">
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
        {needsTap && !muted && (
          <span className="rounded-full bg-ink-950/80 px-2.5 py-1 text-[10px] font-medium text-white/75 backdrop-blur ring-1 ring-white/10">
            tap anywhere to play music
          </span>
        )}
      </div>
    </>
  );
}
