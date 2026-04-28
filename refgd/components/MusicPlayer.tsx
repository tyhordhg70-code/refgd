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
  // Track starts as `null` on BOTH server + first client render to avoid
  // any hydration mismatch (the <audio> element is therefore not in the
  // initial HTML). Immediately after mount we pick the track in an
  // effect — Next paints the <audio> with `autoPlay` which fires right
  // away. This still feels instant because the effect runs synchronously
  // after first commit (no network hop, no delay).
  const [track, setTrack] = useState<{ src: string; label: string } | null>(null);

  // Mount-time bootstrap: pick track + read mute preference.
  useEffect(() => {
    setTrack(pickTrack());
    const initial = readMutePref();
    setMuted(initial);
    mutedRef.current = initial;
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
      // Clamp to [0,1] — overlapping fades or floating-point drift can
      // otherwise compute a fractionally negative value (e.g. -0.005)
      // and HTMLMediaElement.volume throws "out of range" on that.
      const v = start + (target - start) * k;
      a.volume = Math.max(0, Math.min(1, v));
      if (k < 1) fadeRafRef.current = requestAnimationFrame(step);
      else { fadeRafRef.current = null; onDone?.(); }
    };
    fadeRafRef.current = requestAnimationFrame(step);
  }

  // ── Bootstrap effect: only depends on the chosen track. ──────────
  //
  // Playback strategy (in order):
  //   1. If the user has NOT explicitly muted before, try UNMUTED autoplay
  //      first (a.muted=false, volume ramped to TARGET_VOLUME). Browsers
  //      with autoplay engagement (Chrome MEI, Safari with prior visit,
  //      sites added to autoplay allowlist) accept this and the visitor
  //      hears music immediately — which is what the product wants.
  //   2. If the unmuted attempt is rejected (the returned promise rejects
  //      with NotAllowedError), fall back to MUTED autoplay and attach
  //      one-shot interaction listeners that unmute on the visitor's
  //      first pointer/scroll/key event. This is the legacy path that
  //      always succeeds.
  // The mute toggle (top-right button) still controls the user's
  // persistent preference; if they have explicitly muted on a previous
  // visit we skip the unmuted attempt entirely and start muted to honor
  // their choice.
  useEffect(() => {
    const a = audioRef.current;
    if (!a || !track) return;

    let unmuteListenersAttached = false;
    let cancelled = false;

    const startMutedFallback = () => {
      if (cancelled) return;
      a.volume = 0;
      a.muted = true;
      const p = a.play();
      if (p) p.catch(() => {/* iOS may still block; pointerdown will retry */});
      attachUnmuteListeners();
    };

    const userPrefersMuted = mutedRef.current;
    if (userPrefersMuted) {
      // Honor explicit mute pref → start muted, no unmute listeners.
      a.volume = 0;
      a.muted = true;
      const p = a.play();
      if (p) p.catch(() => {});
    } else {
      // Try unmuted first.
      a.muted = false;
      a.volume = 0;
      const p = a.play();
      if (p) {
        p.then(() => {
          if (cancelled) return;
          fadeVolumeTo(TARGET_VOLUME, FADE_MS);
        }).catch(() => {
          // Browser blocked unmuted autoplay → fall back to muted.
          startMutedFallback();
        });
      } else {
        // Older browsers without a play() promise → assume it worked and
        // ramp volume; if it didn't, the user can always click the mute
        // button to toggle.
        fadeVolumeTo(TARGET_VOLUME, FADE_MS);
      }
    }

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

    function attachUnmuteListeners() {
      if (unmuteListenersAttached) return;
      window.addEventListener("pointerdown", unmuteOnInteraction, { passive: true });
      window.addEventListener("keydown", unmuteOnInteraction);
      window.addEventListener("scroll", unmuteOnInteraction, { passive: true });
      window.addEventListener("touchstart", unmuteOnInteraction, { passive: true });
      window.addEventListener("wheel", unmuteOnInteraction, { passive: true });
      window.addEventListener("mousemove", unmuteOnInteraction, { passive: true });
      window.addEventListener("click", unmuteOnInteraction);
      unmuteListenersAttached = true;
    }

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

    // Note: unmute interaction listeners are NOT attached unconditionally.
    // They are only registered by `startMutedFallback()` when the unmuted
    // autoplay attempt is rejected by the browser. If the unmuted attempt
    // succeeds (or the user explicitly prefers muted), we don't need them.

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

  // ── External dim event: when YouTubeTheater (or any other component)
  // requests theater mode, drop volume to a whisper; restore when the
  // dim is released. Honors the user's mute preference (we don't
  // un-mute them just because something closed).
  useEffect(() => {
    const onDim = (e: Event) => {
      const a = audioRef.current;
      if (!a) return;
      const detail = (e as CustomEvent).detail || {};
      const dim = !!detail.dim;
      if (dim) {
        fadeVolumeTo(0.08, 500);
      } else if (!mutedRef.current) {
        fadeVolumeTo(TARGET_VOLUME, 700);
      }
    };
    window.addEventListener("refgd:music-dim", onDim as EventListener);
    return () => window.removeEventListener("refgd:music-dim", onDim as EventListener);
  }, []);

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
