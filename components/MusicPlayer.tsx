"use client";
import { useEffect, useRef, useState } from "react";

/**
 * Background music — only mounted on the home page (so it stops when you
 * navigate away). To bypass browser autoplay restrictions we start the
 * audio MUTED (which all major browsers permit), and then unmute as soon
 * as the user makes any interaction (pointer / scroll / key). Volume
 * fades in to 50%. Mute button fixed top-right; preference persists.
 *
 * The effects are split so toggling mute never restarts playback:
 *   - "bootstrap" effect → runs once per track to start muted autoplay +
 *     attach the unmute-on-interaction listeners.
 *   - "mute toggle" effect → runs when `muted` flips; applies the new
 *     mute state to the live audio element with a fade.
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
const FADE_MS = 900;
const VISIT_KEY = "rg:music-track";
const MUTE_KEY = "rg:music-muted";

function pickTrack() {
  if (typeof window === "undefined") return TRACKS[0];
  try {
    const stored = sessionStorage.getItem(VISIT_KEY);
    if (stored) {
      const t = TRACKS.find((x) => x.src === stored);
      if (t) return t;
    }
    const t = TRACKS[Math.floor(Math.random() * TRACKS.length)];
    sessionStorage.setItem(VISIT_KEY, t.src);
    return t;
  } catch {
    return TRACKS[Math.floor(Math.random() * TRACKS.length)];
  }
}

function readMutePref() {
  if (typeof window === "undefined") return false;
  try { return localStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRafRef = useRef<number | null>(null);
  // Live ref so the bootstrap effect's listener can read latest mute
  // value without becoming a dependency that re-runs the effect.
  const mutedRef = useRef(false);
  const [muted, setMuted] = useState<boolean>(false);
  // Pick the track AND mute preference synchronously on first render so
  // the <audio> element is created with `src` immediately and `autoPlay`
  // can fire on the very first paint — eliminates the previous delay.
  const [track, setTrack] = useState<{ src: string; label: string } | null>(
    () => (typeof window !== "undefined" ? pickTrack() : null),
  );

  // Hydrate mute preference + (in case of SSR) backfill the track.
  useEffect(() => {
    if (!track) setTrack(pickTrack());
    const initial = readMutePref();
    setMuted(initial);
    mutedRef.current = initial;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function cancelFade() {
    if (fadeRafRef.current != null) {
      cancelAnimationFrame(fadeRafRef.current);
      fadeRafRef.current = null;
    }
  }

  function fadeVolumeTo(target: number, dur: number, onDone?: () => void) {
    const a = audioRef.current;
    if (!a) return;
    cancelFade();
    const start = a.volume;
    const t0 = performance.now();
    const step = (now: number) => {
      const k = Math.min(1, (now - t0) / dur);
      a.volume = start + (target - start) * k;
      if (k < 1) fadeRafRef.current = requestAnimationFrame(step);
      else { fadeRafRef.current = null; onDone?.(); }
    };
    fadeRafRef.current = requestAnimationFrame(step);
  }

  // ── Bootstrap effect: only depends on the chosen track. ──────────
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !track) return;

    a.volume = 0;
    a.muted = true; // browsers always allow muted autoplay

    let unmuteListenersAttached = false;
    let cancelled = false;

    const tryPlay = () => {
      const p = a.play();
      if (p) p.catch(() => {/* iOS may block; pointerdown will retry */});
    };

    tryPlay();

    const unmuteOnInteraction = () => {
      if (cancelled) return;
      // Respect an explicit mute preference set BEFORE first interaction.
      if (mutedRef.current) {
        detach();
        return;
      }
      a.muted = false;
      const p = a.play();
      if (p) p.catch(() => {});
      fadeVolumeTo(TARGET_VOLUME, FADE_MS);
      detach();
    };

    const detach = () => {
      if (!unmuteListenersAttached) return;
      window.removeEventListener("pointerdown", unmuteOnInteraction);
      window.removeEventListener("keydown", unmuteOnInteraction);
      window.removeEventListener("scroll", unmuteOnInteraction);
      window.removeEventListener("touchstart", unmuteOnInteraction);
      window.removeEventListener("wheel", unmuteOnInteraction);
      window.removeEventListener("mousemove", unmuteOnInteraction);
      window.removeEventListener("click", unmuteOnInteraction);
      unmuteListenersAttached = false;
    };

    window.addEventListener("pointerdown", unmuteOnInteraction, { passive: true });
    window.addEventListener("keydown", unmuteOnInteraction);
    window.addEventListener("scroll", unmuteOnInteraction, { passive: true });
    window.addEventListener("touchstart", unmuteOnInteraction, { passive: true });
    window.addEventListener("wheel", unmuteOnInteraction, { passive: true });
    window.addEventListener("mousemove", unmuteOnInteraction, { passive: true });
    window.addEventListener("click", unmuteOnInteraction);
    unmuteListenersAttached = true;

    // Re-attempt muted autoplay if the tab regains focus.
    const onVisible = () => {
      if (cancelled) return;
      if (a.paused) {
        const p = a.play();
        if (p) p.catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      cancelFade();
      detach();
      document.removeEventListener("visibilitychange", onVisible);
      // Stop playback on unmount (route change away from home).
      try { a.pause(); a.currentTime = 0; } catch {}
    };
  }, [track]);

  // ── Mute-toggle effect: only applies the mute state, never resets. ──
  useEffect(() => {
    mutedRef.current = muted;
    const a = audioRef.current;
    if (!a || !track) return;
    try { localStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch {}

    if (muted) {
      // Fade out then pause without resetting currentTime.
      fadeVolumeTo(0, 600, () => { try { a.pause(); } catch {} });
    } else {
      a.muted = false;
      const p = a.play();
      if (p) p.catch(() => {});
      fadeVolumeTo(TARGET_VOLUME, FADE_MS);
    }
  }, [muted, track]);

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
      {/* Mute button — fixed BOTTOM-right so it never collides with the
          announcement banner / nav. Bright amber glow + pulsing ring so
          it is always findable against the dark cosmos. */}
      <div className="fixed bottom-5 right-5 z-[60] sm:bottom-6 sm:right-6">
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-label={muted ? "Unmute background music" : "Mute background music"}
          aria-pressed={muted}
          data-cursor="link"
          data-cursor-label={muted ? "unmute" : "mute"}
          className="group relative grid h-12 w-12 place-items-center rounded-full text-ink-950 transition active:scale-95"
          style={{
            background: "linear-gradient(135deg, #ffe28a, #f5b945 55%, #d99520)",
            boxShadow:
              "0 0 0 1px rgba(255,225,140,0.85), 0 12px 30px -8px rgba(245,185,69,0.6), 0 0 36px 6px rgba(245,185,69,0.35)",
          }}
        >
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-full"
            style={{ animation: "pulseGlow 2.4s ease-in-out infinite" }}
          />
          {muted ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="relative">
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              <line x1="22" y1="9" x2="16" y2="15" />
              <line x1="16" y1="9" x2="22" y2="15" />
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="relative">
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
