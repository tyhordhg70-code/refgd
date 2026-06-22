"use client";
import { useEffect, useRef, useState } from "react";
import { useEntranceReady } from "@/lib/loading-screen-gate";

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
// Quick fade so unmute feels instant rather than gradually
// emerging over almost a second (the previous 900 ms fade was the
// main reason users reported "music feels really delayed").
const FADE_MS = 250;
const VISIT_KEY = "rg:music-track";
const MUTE_KEY = "rg:music-muted";
const DISMISSED_KEY = "rg:music-dismissed";
// Desktop "tap to enter" gate — shown at most once per session. Set when the
// visitor clicks Enter OR when audible autoplay already succeeded (an engaged
// visitor whose browser permits audible autoplay → no gate is needed).
const ENTERED_KEY = "rg:music-entered";

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
  // Session-scoped so a stale mute from a prior visit never silences a new tab.
  try { return sessionStorage.getItem(MUTE_KEY) === "1"; } catch { return false; }
}

// Where the × dismissal is persisted. PERMANENT on desktop (localStorage —
// byte-for-byte the original behaviour) but only SESSION-scoped on touch /
// mobile, where the × is newly shown and an accidental tap must never hide the
// player for good. Uses the same media query the player used for its old
// `coarse` check so desktop is treated exactly as before.
function dismissalStore(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    const touch = window.matchMedia("(pointer: coarse), (max-width: 768px)").matches;
    return touch ? window.sessionStorage : window.localStorage;
  } catch {
    return null;
  }
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
  const [dismissed, setDismissed] = useState<boolean>(false);

  // ── Desktop "tap to enter" gate state ──────────────────────────
  // entranceReady flips true when the loading splash finishes (or
  // immediately on SPA navigation); the gate only ever arms after that.
  const entranceReady = useEntranceReady();
  // Desktop-only. Resolved in an effect so SSR + the first client render
  // both see `false` (the overlay is never in the initial HTML → no
  // hydration drift), and mobile keeps its existing scroll/tap path.
  const [isDesktop, setIsDesktop] = useState(false);
  const [showEnter, setShowEnter] = useState(false);
  // Set the instant audible playback actually begins on ANY path. Lets the
  // gate auto-skip for media-engaged visitors whose browser already allowed
  // audible autoplay, so they never see an unnecessary overlay.
  const hasAudibleStartedRef = useRef(false);
  // Mirror of `showEnter` for synchronous reads inside window event handlers:
  // while the desktop Enter gate is up, the ONLY way in is an explicit button
  // choice, so non-activation events (mousemove/scroll/wheel) must NOT attempt
  // audible playback and bypass / blip past it.
  const showEnterRef = useRef(false);
  // Mirror of the session "already entered" flag for synchronous reads.
  const enteredOnceRef = useRef(false);
  // The bootstrap effect's detach() — exposed so the Enter click can drop the
  // window unmute listeners once it has actually started audible playback.
  const detachUnmuteListenersRef = useRef<null | (() => void)>(null);

  useEffect(() => {
    setTrack(pickTrack());
    const initial = readMutePref();
    setMuted(initial);
    mutedRef.current = initial;
    // Desktop persists permanently (localStorage, unchanged from before);
    // touch/mobile only for the session, so the newly-shown × can never hide
    // the player for good (see dismissalStore).
    try { if (dismissalStore()?.getItem(DISMISSED_KEY) === "1") setDismissed(true); } catch {}
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

  function markEnteredOnce() {
    enteredOnceRef.current = true;
    try { sessionStorage.setItem(ENTERED_KEY, "1"); } catch {}
  }

  // Called from EVERY path that achieves audible playback (bootstrap unmuted
  // success, gesture unmute, canplay retry, Enter click). Records that sound is
  // on, hides the gate if it happened to be showing, and marks the session
  // entered so the gate never re-appears.
  // Single source of truth for the gate: update the synchronous ref FIRST (so
  // any window/audio event firing in the same tick already sees the new value)
  // then the React state that drives rendering. Avoids the gap where
  // setShowEnter(true) had committed but a passive sync effect hadn't run yet.
  function setGate(next: boolean) {
    showEnterRef.current = next;
    if (next) {
      // Arming the gate: force the element back to muted warm-up so any
      // already-pending automatic unmuted play() can't blip audibly behind the
      // overlay before its .then() guard runs. The explicit Enter re-enables it.
      const a = audioRef.current;
      if (a) { a.muted = true; a.volume = 0; }
    }
    setShowEnter(next);
  }

  function markAudibleStarted() {
    hasAudibleStartedRef.current = true;
    markEnteredOnce();
    setGate(false);
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
    // A desktop scroll/wheel can NEVER grant user-activation, but a visitor
    // with enough media engagement (the owner / returning visitors) is still
    // allowed to start audible playback. We attempt that audible start ONCE on
    // the first non-activation event; this flag then prevents re-attempting on
    // every later scroll/mousemove, which would storm play()/pause().
    let nonActivationTried = false;

    const userPrefersMuted = mutedRef.current;

    // ── Strategy ──────────────────────────────────────────────
    //  Mobile browsers (iOS Safari especially) reject ANY .play()
    //  call from a useEffect because it isn't running inside a
    //  user-gesture stack. The desktop "try unmuted, fall back to
    //  muted" dance therefore never actually starts audio on mobile
    //  before first interaction. So we ALWAYS attach unmute-on-
    //  interaction listeners up-front (unless the user explicitly
    //  prefers muted) and let the very first scroll / tap kick
    //  playback off — which IS a valid user gesture and will
    //  reliably start audio on every browser.
    const tryPlay = () => {
      const p = a.play();
      if (p) p.catch(() => {});
    };

    // ── Forward declarations ────────────────────────────────────
    // attach/detach + the gesture handler MUST be initialised before
    // the play-strategy block below calls attachUnmuteListeners(),
    // otherwise the handler reference inside the function body hits
    // a `const` temporal-dead-zone and React surfaces
    // "Application error: a client-side exception" on the home page.
    const unmuteOnInteraction = () => {
      if (cancelled) return;
      // Respect an explicit mute preference set BEFORE first interaction.
      if (mutedRef.current) {
        detach();
        return;
      }
      // Browsers only let us turn sound ON during a gesture that grants "user
      // activation": click / tap / keydown / pointerdown / pointerup / touchend.
      // Scroll, wheel, mousemove and touchstart do NOT grant activation.
      let hasActivation = true;
      try {
        const ua = (navigator as Navigator & {
          userActivation?: { isActive: boolean };
        }).userActivation;
        if (ua) hasActivation = ua.isActive;
      } catch {
        /* userActivation unsupported (older Safari) — assume activation, try */
        hasActivation = true;
      }
      // No transient activation (e.g. a desktop wheel-scroll). A wheel can never
      // grant activation, but a media-engaged visitor (the owner / returning
      // visitors) is still ALLOWED to autoplay audible — so on the FIRST such
      // event we let the audible attempt below run once (its .catch restores
      // muted if the browser refuses). After that first try we stop attempting
      // on non-activation events so repeated scroll/mousemove can't storm
      // play()/pause() (which causes audible glitching); we keep the muted clip
      // playing (decoder warm) and wait for a real activating gesture instead.
      if (!hasActivation) {
        // While the desktop Enter gate is showing, the ONLY way in is an
        // explicit button choice. Never let a non-activation event (mousemove/
        // scroll/wheel) sneak in an audible attempt that could bypass the gate
        // or blip just before "Enter without sound" — keep the decoder warm
        // MUTED instead. (Before the gate is shown we still allow ONE audible
        // attempt for media-engaged visitors so they skip the gate entirely.)
        if (showEnterRef.current || nonActivationTried) {
          // If the visitor muted / entered without sound, don't keep the
          // decoder warm by resuming — leave it PAUSED.
          if (mutedRef.current) return;
          if (a.paused) {
            a.muted = true;
            const pp = a.play();
            if (pp) pp.catch(() => {});
          }
          return; // listeners stay attached for the next, activating gesture
        }
        nonActivationTried = true;
        // fall through to the audible attempt below (covers media-engagement
        // autoplay for the owner / returning visitors) — only BEFORE the gate.
      }
      a.muted = false;
      // Important: re-issue play() INSIDE the user-gesture stack so
      // mobile browsers actually authorise sound. Don't depend on the
      // muted-attempt above already running.
      const p = a.play();
      if (p) {
        p.then(() => {
          if (cancelled) return;
          // If the visitor muted / chose "Enter without sound" between this
          // gesture firing and the promise resolving, honor it: stay silent +
          // PAUSED and do NOT mark the session as audibly entered.
          if (mutedRef.current) {
            a.muted = true;
            a.volume = 0;
            try { a.pause(); } catch {}
            return;
          }
          // A non-activation pre-gate attempt whose promise resolved AFTER the
          // gate armed must NOT auto-unmute behind the overlay — only an
          // activating gesture may enter with sound. Keep muted warm-up.
          if (showEnterRef.current && !hasActivation) {
            a.muted = true;
            a.volume = 0;
            return;
          }
          fadeVolumeTo(TARGET_VOLUME, FADE_MS);
          // Only stop listening once sound is ACTUALLY playing.
          detach();
          markAudibleStarted();
        }).catch(() => {
          // The gesture didn't start audio (clip not buffered yet at that
          // instant, or the browser refused this particular gesture). KEEP the
          // listeners attached so the NEXT gesture retries (the canplay handler
          // below also retries once enough audio buffers) AND restore muted
          // playback so the decoder stays warm — otherwise the failed unmute
          // just paused the clip and the page would sit silent until then.
          if (cancelled) return;
          a.muted = true;
          // But if the visitor muted / entered without sound, leave it PAUSED —
          // don't warm-resume a track they silenced.
          if (mutedRef.current) return;
          const pp = a.play();
          if (pp) pp.catch(() => {});
        });
      } else {
        // Legacy browsers: play() returns void → assume it started.
        fadeVolumeTo(TARGET_VOLUME, FADE_MS);
        detach();
        markAudibleStarted();
      }
    };

    function attachUnmuteListeners() {
      if (unmuteListenersAttached) return;
      window.addEventListener("pointerdown", unmuteOnInteraction, { passive: true });
      window.addEventListener("pointerup", unmuteOnInteraction, { passive: true });
      window.addEventListener("keydown", unmuteOnInteraction);
      window.addEventListener("scroll", unmuteOnInteraction, { passive: true });
      window.addEventListener("touchstart", unmuteOnInteraction, { passive: true });
      window.addEventListener("touchend", unmuteOnInteraction, { passive: true });
      window.addEventListener("wheel", unmuteOnInteraction, { passive: true });
      window.addEventListener("mousemove", unmuteOnInteraction, { passive: true });
      window.addEventListener("click", unmuteOnInteraction);
      unmuteListenersAttached = true;
    }

    const detach = () => {
      if (!unmuteListenersAttached) return;
      window.removeEventListener("pointerdown", unmuteOnInteraction);
      window.removeEventListener("pointerup", unmuteOnInteraction);
      window.removeEventListener("keydown", unmuteOnInteraction);
      window.removeEventListener("scroll", unmuteOnInteraction);
      window.removeEventListener("touchstart", unmuteOnInteraction);
      window.removeEventListener("touchend", unmuteOnInteraction);
      window.removeEventListener("wheel", unmuteOnInteraction);
      window.removeEventListener("mousemove", unmuteOnInteraction);
      window.removeEventListener("click", unmuteOnInteraction);
      unmuteListenersAttached = false;
    };
    // Expose detach so the desktop Enter button can drop these listeners
    // once IT has started audible playback inside the click gesture.
    detachUnmuteListenersRef.current = detach;

    if (userPrefersMuted) {
      // Honor explicit mute pref → start muted, no unmute listeners.
      a.volume = 0;
      a.muted = true;
      tryPlay();
    } else {
      // Always attach interaction listeners as the reliable kick-off.
      attachUnmuteListeners();
      // Best-effort: try MUTED autoplay so the audio decoder warms up
      // and the very first interaction can switch to unmuted instantly.
      a.muted = true;
      a.volume = 0;
      tryPlay();
      // ALSO attempt unmuted — some browsers (Chrome with MEI, Safari
      // on a return visit, sites whitelisted by the user) will accept
      // it and we get music immediately without waiting for a gesture.
      a.muted = false;
      const p = a.play();
      if (p) {
        p.then(() => {
          if (cancelled) return;
          // If the visitor chose "Enter without sound" (or muted) in the gap
          // before this resolved, honor it: stay silent + PAUSED (muted ==
          // paused, same as the mute button) and do NOT mark the session as
          // audibly entered.
          if (mutedRef.current) {
            a.muted = true;
            a.volume = 0;
            try { a.pause(); } catch {}
            return;
          }
          // If the Enter gate appeared before this late-resolving autoplay
          // promise settled, the explicit choice is now authoritative — stay
          // muted warm-up rather than auto-starting sound behind the overlay.
          if (showEnterRef.current) { a.muted = true; a.volume = 0; return; }
          fadeVolumeTo(TARGET_VOLUME, FADE_MS);
          detach();
          markAudibleStarted();
        }).catch(() => {
          // Unmuted blocked → keep listeners attached and stay muted
          // until first interaction. tryPlay above keeps muted decoder
          // alive so the gesture-driven unmute is instant.
          if (cancelled) return;
          a.muted = true;
          // But if the visitor chose mute / "Enter without sound", leave it
          // PAUSED — don't warm-resume a track they silenced.
          if (mutedRef.current) return;
          tryPlay();
        });
      }
    }

    // ── canplay retry ────────────────────────────────────────
    // If play() was rejected (commonly because the audio wasn't
    // buffered yet at the moment of the user's first gesture), the
    // `canplay` event fires the instant the browser has enough data
    // to start. Retry play() then so audio kicks off as soon as
    // physically possible — closes the "music doesn't always start"
    // race entirely.
    const onCanPlay = () => {
      if (cancelled) return;
      // Honor current mute preference — if the user muted / chose "Enter
      // without sound" while we were waiting for buffer, leave the clip
      // PAUSED (muted == paused, same as the mute button). Don't resurrect
      // playback they silenced.
      if (mutedRef.current) {
        a.muted = true;
        a.volume = 0;
        return;
      }
      // While the desktop Enter gate is showing, the explicit button is the ONLY
      // way to start audible / mark entered. Keep the decoder warm MUTED here so
      // a buffer-ready retry can't unmute and bypass the gate.
      if (showEnterRef.current) {
        if (a.paused) {
          a.muted = true;
          a.volume = 0;
          const pp = a.play();
          if (pp) pp.catch(() => {});
        }
        return;
      }
      if (a.paused) {
        const p = a.play();
        if (p) {
          p.then(() => {
            // If canplay successfully started audio for a non-muted
            // visitor, fade in and drop the interaction listeners so they
            // don't linger — the gesture-driven unmute is no longer needed.
            if (cancelled || mutedRef.current) return;
            // If the gate appeared while we were waiting for buffer, do NOT
            // unmute / mark-entered automatically — leave it muted warm-up so
            // the explicit Enter choice stays authoritative.
            if (showEnterRef.current) { a.muted = true; a.volume = 0; return; }
            a.muted = false;
            fadeVolumeTo(TARGET_VOLUME, FADE_MS);
            detach();
            markAudibleStarted();
          }).catch(() => {});
        }
      }
    };
    a.addEventListener("canplay", onCanPlay, { once: true });

    // Re-attempt autoplay if the tab regains focus — but ONLY if the
    // user has not muted. v6.13.37 fix: previously this called .play()
    // unconditionally, which (combined with `a.muted` already being
    // `false` from a successful unmuted bootstrap) caused audio to
    // resume after a tab switch even though the user had since
    // toggled mute. Now we hard-respect `mutedRef.current`.
    const onVisible = () => {
      if (cancelled) return;
      if (mutedRef.current) {
        // Defensive: make sure the element itself is muted so a stray
        // .play() from anywhere can never produce audible sound.
        a.muted = true;
        return;
      }
      // While the Enter gate is up, a tab refocus must not resume/unmute and
      // bypass the explicit choice — keep it muted warm-up only.
      if (showEnterRef.current) {
        a.muted = true;
        if (a.paused) {
          const p = a.play();
          if (p) p.catch(() => {});
        }
        return;
      }
      if (a.paused) {
        const p = a.play();
        if (p) p.catch(() => {});
      }
    };
    document.addEventListener("visibilitychange", onVisible);

    // ── Auto-advance the playlist when a track finishes ──────────────
    // The <audio> no longer carries `loop`, so a finished track fires `ended`
    // exactly once. Move to the NEXT track (wrapping after the last) by swapping
    // React state, which re-runs THIS bootstrap for the new clip — reusing all
    // of its play / unmute / buffer robustness. The new <audio> starts
    // autoPlay+muted and bootstrap unmutes it if the visitor hasn't muted, so
    // the queue keeps advancing with sound. When the visitor IS muted the clip
    // is paused (mute-toggle effect), so `ended` never fires and the queue
    // simply waits — exactly "advance to the next song if not muted".
    const currentSrc = track.src;
    const onEnded = () => {
      if (cancelled) return;
      // Spec: advance ONLY if not muted. Muted normally means PAUSED (so `ended`
      // never fires), but the muted warm-up paths can play a muted clip to its
      // end — in that case do NOT advance the queue.
      if (mutedRef.current) return;
      const idx = TRACKS.findIndex((t) => t.src === currentSrc);
      const next = TRACKS[(idx + 1) % TRACKS.length];
      try { sessionStorage.setItem(VISIT_KEY, next.src); } catch {}
      setTrack(next);
    };
    a.addEventListener("ended", onEnded);

    return () => {
      cancelled = true;
      cancelFade();
      detach();
      detachUnmuteListenersRef.current = null;
      a.removeEventListener("canplay", onCanPlay);
      a.removeEventListener("ended", onEnded);
      document.removeEventListener("visibilitychange", onVisible);
      // Do NOT stop playback on unmount — MusicPlayer is in the root
      // layout and should continue playing across page navigations.
    };
  }, [track]);

  // ── Mute-toggle effect: only applies the mute state on USER-driven
  //    toggles, never on initial mount.
  //
  // The previous implementation ran on every render where `muted`
  // or `track` changed — including the very first mount. On that
  // first run, the bootstrap effect was ALSO firing (setting
  // a.muted=true; tryPlay()), so we ended up with rapid-fire
  // a.muted=true → a.muted=false → a.play() → a.play() in microsecond
  // succession. Some browsers debounce / drop one of those calls,
  // which is why users intermittently reported "music doesn't
  // start". Skipping the first run hands ownership of initial
  // playback cleanly to the bootstrap effect.
  const isFirstMuteRun = useRef(true);
  // Tracks the last APPLIED mute state so this effect can tell a real mute
  // toggle apart from a track change (it depends on both `muted` and `track`).
  // On a track change the bootstrap effect already owns playback for the new
  // clip; if this effect ALSO re-issued play()/pause() in the same tick we'd
  // hit the documented double-play() "music doesn't start / glitches" storm.
  const prevMutedRef = useRef(false);
  useEffect(() => {
    mutedRef.current = muted;
    if (isFirstMuteRun.current) {
      isFirstMuteRun.current = false;
      prevMutedRef.current = muted;
      return;
    }
    // Only act on an actual mute change — ignore track-change re-runs.
    if (muted === prevMutedRef.current) return;
    prevMutedRef.current = muted;
    const a = audioRef.current;
    if (!a || !track) return;
    try { sessionStorage.setItem(MUTE_KEY, muted ? "1" : "0"); } catch {}

    if (muted) {
      // v6.13.37 — set element-level muted IMMEDIATELY so any stray
      // play() (visibilitychange, canplay, dim handler, autoplay
      // attribute) can never produce audible sound while the user
      // wants silence. The fade + pause still runs on top of that.
      a.muted = true;
      fadeVolumeTo(0, 350, () => { try { a.pause(); } catch {} });
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
      // v6.13.37 — never raise the volume floor while muted. The
      // dim path used to unconditionally fade to 0.08, which made
      // muted music audibly bleed through whenever a YouTube theater
      // opened. Skip the dim entirely if user is muted.
      if (mutedRef.current) return;
      if (dim) {
        fadeVolumeTo(0.08, 500);
      } else {
        fadeVolumeTo(TARGET_VOLUME, 700);
      }
    };
    window.addEventListener("refgd:music-dim", onDim as EventListener);
    return () => window.removeEventListener("refgd:music-dim", onDim as EventListener);
  }, []);

  // ── Desktop "tap to enter" gate ────────────────────────────────
  // Resolve desktop vs touch once on mount (SSR-safe) and read the session
  // "entered" flag. Mobile keeps its existing scroll/tap unmute path entirely
  // untouched — this overlay is desktop-only.
  useEffect(() => {
    try {
      const touch = window.matchMedia("(pointer: coarse), (max-width: 768px)").matches;
      setIsDesktop(!touch);
    } catch {
      setIsDesktop(false);
    }
    try {
      if (sessionStorage.getItem(ENTERED_KEY) === "1") enteredOnceRef.current = true;
    } catch {}
  }, []);

  // Arm the overlay only once the splash is done AND we're on desktop AND the
  // visitor hasn't muted / already entered. If the browser already allowed
  // audible autoplay (an engaged visitor) the gate is skipped silently;
  // otherwise the Enter overlay shows immediately as the splash clears.
  useEffect(() => {
    if (!entranceReady || !isDesktop || !track) return;
    if (mutedRef.current || enteredOnceRef.current) return;
    // Decide synchronously the instant the splash clears. The audible-autoplay
    // attempt is fired by the bootstrap effect AT MOUNT — i.e. during the
    // >=1.5s loading splash — so its outcome (hasAudibleStartedRef) is already
    // settled here. An engaged visitor whose browser allowed sound never needs
    // the gate; everyone else gets the Enter overlay immediately.
    //
    // The previous code waited an EXTRA 1500ms "in case" audible was still
    // landing, which left the bare home page visible for ~1.5s before the Enter
    // overlay appeared — the reported "home flashes, THEN press-to-enter shows
    // up". The splash (z9999) sits above the Enter overlay (z9998), so showing
    // Enter now simply crossfades straight out of the splash with no home flash.
    if (hasAudibleStartedRef.current) {
      markEnteredOnce();
      return;
    }
    setGate(true);
  }, [entranceReady, isDesktop, track]);

  // Lock background scroll while the gate is up so the cosmic hero scroll
  // handoff can't fire behind it. Restored the instant the overlay clears.
  useEffect(() => {
    if (!showEnter) return;
    const prevOverflow = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.touchAction = prevTouch;
    };
  }, [showEnter]);

  // Enter click — runs INSIDE the user gesture, so a.play() is allowed to start
  // audible sound on every browser. On the rare reject (clip not buffered at
  // that exact instant) we restore warm muted playback and KEEP the overlay so
  // the next click retries — we never strand the page silent or dismiss the
  // gate without sound (only audible success / auto-skip marks the session).
  const handleEnter = () => {
    const a = audioRef.current;
    if (!a) {
      setGate(false);
      return;
    }
    if (mutedRef.current) {
      setGate(false);
      markEnteredOnce();
      return;
    }
    a.muted = false;
    a.volume = 0;
    const p = a.play();
    if (p) {
      p.then(() => {
        // If the visitor flipped to muted / "Enter without sound" before this
        // resolved, honor it: stay silent + PAUSED, don't fade or mark audible.
        if (mutedRef.current) {
          a.muted = true;
          a.volume = 0;
          try { a.pause(); } catch {}
          return;
        }
        fadeVolumeTo(TARGET_VOLUME, FADE_MS);
        detachUnmuteListenersRef.current?.();
        markAudibleStarted();
      }).catch(() => {
        a.muted = true;
        // Don't warm-resume if the visitor chose mute in the meantime.
        if (mutedRef.current) return;
        const pp = a.play();
        if (pp) pp.catch(() => {});
      });
    } else {
      fadeVolumeTo(TARGET_VOLUME, FADE_MS);
      detachUnmuteListenersRef.current?.();
      markAudibleStarted();
    }
  };

  // Secondary Enter path: enter the site but keep the music OFF. Sets the mute
  // preference (session-scoped, the same store/key the mute button uses), marks
  // the session entered so the gate never re-appears, and clears the overlay.
  // We mute + pause synchronously so no sound can blip out between this click
  // and the mute-toggle effect running; that effect then keeps it silenced.
  const handleEnterMuted = () => {
    const a = audioRef.current;
    if (a) {
      a.muted = true;
      try { a.pause(); } catch {}
    }
    mutedRef.current = true;
    // Drop the global gesture (pointer/touch/scroll/click…) listeners NOW so a
    // stray interaction can't kick off muted playback the visitor opted out of.
    detachUnmuteListenersRef.current?.();
    setMuted(true);
    try { sessionStorage.setItem(MUTE_KEY, "1"); } catch {}
    markEnteredOnce();
    setGate(false);
  };

  const enterOverlay =
    showEnter && isDesktop ? (
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Enter RefundGod with sound"
        onClick={(e) => { e.stopPropagation(); handleEnter(); }}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background:
            "radial-gradient(ellipse at 30% 30%, #1b1340 0%, #0a0c1a 55%, #000 100%)",
          display: "grid",
          placeItems: "center",
          cursor: "pointer",
          WebkitBackdropFilter: "blur(2px)",
          backdropFilter: "blur(2px)",
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "radial-gradient(circle at 22% 28%, rgba(167,139,250,0.28), transparent 45%)," +
              "radial-gradient(circle at 78% 70%, rgba(34,211,238,0.22), transparent 50%)," +
              "radial-gradient(circle at 50% 100%, rgba(245,185,69,0.18), transparent 60%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            textAlign: "center",
            maxWidth: 460,
            padding: "0 24px",
          }}
        >
          <div
            className="pulse-glow-violet"
            style={{
              display: "inline-grid",
              placeItems: "center",
              width: 104,
              height: 104,
              borderRadius: "50%",
              background:
                "radial-gradient(circle at 30% 30%, rgba(255,225,140,0.42), rgba(167,139,250,0.22) 55%, transparent 100%)",
              border: "1px solid rgba(255,225,140,0.35)",
              marginBottom: 30,
            }}
          >
            <div
              style={{
                fontFamily: "'Space Grotesk', Geist, system-ui, sans-serif",
                fontWeight: 800,
                fontSize: 40,
                letterSpacing: "-0.04em",
                background:
                  "linear-gradient(135deg, #ffe28a 0%, #ffffff 50%, #a78bfa 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                lineHeight: 1,
              }}
            >
              RG
            </div>
          </div>

          <h2
            style={{
              fontFamily: "'Space Grotesk', Geist, system-ui, sans-serif",
              fontWeight: 700,
              fontSize: 24,
              letterSpacing: "0.30em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.96)",
              margin: 0,
              marginBottom: 10,
              textShadow:
                "0 0 24px rgba(167,139,250,0.55), 0 0 48px rgba(255,225,140,0.18)",
            }}
          >
            RefundGod
          </h2>

          <p
            style={{
              fontFamily: "Geist, system-ui, sans-serif",
              fontSize: 12,
              letterSpacing: "0.30em",
              textTransform: "uppercase",
              color: "rgba(167,139,250,0.95)",
              margin: 0,
              marginBottom: 34,
            }}
          >
            Tap to enter — with sound
          </p>

          <button
            type="button"
            autoFocus
            onClick={(e) => { e.stopPropagation(); handleEnter(); }}
            aria-label="Enter with sound on"
            data-cursor="link"
            data-cursor-label="enter"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 12,
              padding: "16px 40px",
              borderRadius: 999,
              border: "1px solid rgba(255,225,140,0.45)",
              background: "linear-gradient(135deg, #ffe28a, #f5b945 55%, #d99520)",
              color: "#0a0c1a",
              fontFamily: "'Space Grotesk', Geist, system-ui, sans-serif",
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: "0.16em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow:
                "0 0 30px rgba(245,185,69,0.45), 0 10px 40px rgba(0,0,0,0.45)",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M11 5 6 9H2v6h4l5 4V5z" />
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
            </svg>
            Enter
          </button>

          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); handleEnterMuted(); }}
            onPointerDown={(e) => e.stopPropagation()}
            onPointerUp={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            aria-label="Enter with sound off"
            data-cursor="link"
            data-cursor-label="enter muted"
            style={{
              display: "block",
              margin: "20px auto 0",
              padding: "8px 16px",
              border: "none",
              background: "none",
              color: "rgba(167,139,250,0.78)",
              fontFamily: "Geist, system-ui, sans-serif",
              fontSize: 11,
              letterSpacing: "0.22em",
              textTransform: "uppercase",
              cursor: "pointer",
              textDecoration: "underline",
              textUnderlineOffset: 4,
            }}
          >
            Enter without sound
          </button>
        </div>
      </div>
    ) : null;

    // If dismissed: render audio-only (music keeps playing, controls hidden).
    // On touch/mobile dismissal is session-scoped so this self-heals next visit;
    // on desktop it persists (localStorage), exactly as before.
    if (dismissed) {
      return (
        <>
          {track && (
            <audio ref={audioRef} src={track.src} autoPlay muted preload="auto"
              aria-label={`Background music — ${track.label}`} />
          )}
          {enterOverlay}
        </>
      );
    }

    return (
      <>
        {track && (
          <audio
            ref={audioRef}
            src={track.src}
            autoPlay
            muted
            preload="auto"
            aria-label={`Background music — ${track.label}`}
          />
        )}
        {/* Music controls — fixed bottom-right, on every page */}
        {/* v6.14.x — On mobile the control sat at bottom:20px, which on
            iOS Safari falls UNDER the bottom browser toolbar / home
            indicator, so the sound button "disappeared". Raise it clear of
            that chrome (safe-area inset + extra lift) on phones; desktop
            keeps its original bottom-right rest position. */}
        <div className="fixed right-5 z-[60] flex items-end gap-1.5 bottom-[max(1.25rem,calc(env(safe-area-inset-bottom,0px)+4.5rem))] sm:bottom-6 sm:right-6">
          {/* Small × close button above the mute button — shown on EVERY device.
              On mobile it uses a ≥40px tap target (h-10) with extra separation
              (gap-3) from the gold mute button below, so it is reachable without
              being a fat-finger hazard; desktop keeps its original 24px target.
              Dismissal persists on desktop (localStorage) but is session-scoped
              on touch (see dismissalStore) so an accidental tap is never
              permanent there. */}
          <div className="flex flex-col items-center gap-3 sm:gap-1">
            <button
              type="button"
              onClick={() => {
                setDismissed(true);
                try { dismissalStore()?.setItem(DISMISSED_KEY, "1"); } catch {}
              }}
              aria-label="Hide music controls"
              data-cursor="link"
              data-cursor-label="hide player"
              className="grid h-10 w-10 sm:h-6 sm:w-6 place-items-center rounded-full border border-white/20 bg-ink-900/80 text-white/50 backdrop-blur-sm transition hover:border-white/40 hover:text-white/80 active:scale-95"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" className="sm:h-[9px] sm:w-[9px]">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            {/* Mute / unmute button */}
            <button
              type="button"
              onClick={() => setMuted((m) => !m)}
              aria-label={muted ? "Unmute background music" : "Mute background music"}
              aria-pressed={muted}
              data-cursor="link"
              data-cursor-label={muted ? "unmute" : "mute"}
              className="grid h-12 w-12 place-items-center rounded-full text-ink-950 transition active:scale-95"
              style={{ background: "linear-gradient(135deg, #ffe28a, #f5b945 55%, #d99520)" }}
            >
              {muted ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5 6 9H2v6h4l5 4V5z" />
                  <line x1="22" y1="9" x2="16" y2="15" />
                  <line x1="16" y1="9" x2="22" y2="15" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 5 6 9H2v6h4l5 4V5z" />
                  <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                  <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                </svg>
              )}
            </button>
          </div>
        </div>
        {enterOverlay}
      </>
    );
  }
  