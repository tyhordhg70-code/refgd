"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";

/** Formats seconds as m:ss (Telegram style — no leading zero on minutes). */
export function fmtDuration(t: number | null | undefined): string {
  let v = typeof t === "number" && Number.isFinite(t) && t > 0 ? t : 0;
  v = Math.round(v);
  const m = Math.floor(v / 60);
  const s = v % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Telegram Web A style fullscreen video player: tap the clip to play/pause,
 * scrub the seekline (click or drag), mute toggle and fullscreen — all custom
 * chrome over a bare <video>, matching the real app instead of the browser's
 * default controls. Controls auto-hide after a beat while playing and come
 * back on any pointer movement or tap.
 */
export default function VideoPlayer({
  src,
  poster,
  durationHint,
}: {
  src: string;
  poster?: string;
  /** Duration in seconds shown until the metadata actually loads. */
  durationHint?: number | null;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const seekRef = useRef<HTMLDivElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(
    typeof durationHint === "number" && durationHint > 0 ? durationHint : 0,
  );
  const [buffered, setBuffered] = useState(0);
  const [shown, setShown] = useState(true);
  const hideTimer = useRef<number | null>(null);
  const dragging = useRef(false);

  const poke = () => {
    setShown(true);
    if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      const v = videoRef.current;
      if (v && !v.paused && !dragging.current) setShown(false);
    }, 2600);
  };

  useEffect(() => {
    poke();
    // The viewer opens from an explicit tap on the clip — that user gesture
    // lets autoplay-with-sound through on every platform that allows it; if
    // the browser still refuses, fall back to a muted start instead of a
    // black frame.
    const v = videoRef.current;
    if (v) {
      v.play().catch(() => {
        v.muted = true;
        setMuted(true);
        v.play().catch(() => {});
      });
    }
    return () => {
      if (hideTimer.current !== null) window.clearTimeout(hideTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) void v.play().catch(() => {});
    else v.pause();
    poke();
  };

  const seekTo = (clientX: number) => {
    const v = videoRef.current;
    const bar = seekRef.current;
    if (!v || !bar) return;
    const total = v.duration;
    if (!Number.isFinite(total) || total <= 0) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    v.currentTime = ratio * total;
    setCur(ratio * total);
  };

  const onSeekDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    seekTo(e.clientX);
    poke();
  };
  const onSeekMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    seekTo(e.clientX);
    poke();
  };
  const onSeekUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    dragging.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
    seekTo(e.clientX);
    poke();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted || v.volume === 0) {
      v.muted = false;
      if (v.volume === 0) {
        v.volume = 1;
        setVolume(1);
      }
      setMuted(false);
    } else {
      v.muted = true;
      setMuted(true);
    }
    poke();
  };

  const onVolume = (value: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = value;
    v.muted = value === 0;
    setVolume(value);
    setMuted(value === 0);
    poke();
  };

  const toggleFullscreen = () => {
    const root = rootRef.current;
    if (!root) return;
    if (document.fullscreenElement) void document.exitFullscreen();
    else void root.requestFullscreen?.().catch(() => {});
    poke();
  };

  const progress = dur > 0 ? Math.min(1, cur / dur) : 0;
  const buffredPct = dur > 0 ? Math.min(1, buffered / dur) : 0;

  return (
    <div
      ref={rootRef}
      className={`tg-vp${shown ? "" : " tg-vp-idle"}`}
      onClick={(e) => e.stopPropagation()}
      onPointerMove={poke}
    >
      {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
      <video
        ref={videoRef}
        className="tg-vp-video"
        src={src}
        poster={poster}
        preload="metadata"
        playsInline
        onClick={togglePlay}
        onPlay={() => {
          setPlaying(true);
          poke();
        }}
        onPause={() => {
          setPlaying(false);
          setShown(true);
        }}
        onEnded={() => {
          setPlaying(false);
          setShown(true);
        }}
        onTimeUpdate={(e) => {
          if (!dragging.current) setCur(e.currentTarget.currentTime);
        }}
        onLoadedMetadata={(e) => {
          const d = e.currentTarget.duration;
          if (Number.isFinite(d) && d > 0) setDur(d);
        }}
        onProgress={(e) => {
          const b = e.currentTarget.buffered;
          if (b.length > 0) setBuffered(b.end(b.length - 1));
        }}
      />

      {/* NO overlay button on the picture (owner mandate + Telegram parity —
          the real clients keep the frame clean while playing; tap the video
          itself to toggle). All chrome lives in the bottom control bar:
          volume on the left, play/pause dead center, fullscreen right, and
          a time + seekline row underneath — the Telegram player layout. */}
      <div className="tg-vp-controls" onClick={(e) => e.stopPropagation()}>
        <div className="tg-vp-buttons">
          <button
            type="button"
            className="tg-vp-btn"
            aria-label={muted ? "Unmute" : "Mute"}
            onClick={toggleMute}
          >
            <i
              className={`icon ${muted ? "icon-muted" : "icon-volume-2"}`}
              aria-hidden
            />
          </button>
          <input
            type="range"
            className="tg-vp-volume"
            aria-label="Volume"
            min={0}
            max={1}
            step={0.02}
            value={muted ? 0 : volume}
            onChange={(e) => onVolume(Number(e.currentTarget.value))}
          />
          <button
            type="button"
            className="tg-vp-btn tg-vp-playbtn"
            aria-label={playing ? "Pause" : "Play"}
            onClick={togglePlay}
          >
            <i
              className={`icon ${playing ? "icon-pause" : "icon-play"}`}
              aria-hidden
            />
          </button>
          <span className="tg-vp-spacer" />
          <button
            type="button"
            className="tg-vp-btn"
            aria-label="Fullscreen"
            onClick={toggleFullscreen}
          >
            <i className="icon icon-fullscreen" aria-hidden />
          </button>
        </div>
        <div className="tg-vp-timeline">
          <span className="tg-vp-time">{fmtDuration(cur)}</span>
          <div
            ref={seekRef}
            className="tg-vp-seekline"
            role="slider"
            aria-label="Seek"
            aria-valuemin={0}
            aria-valuemax={Math.round(dur)}
            aria-valuenow={Math.round(cur)}
            onPointerDown={onSeekDown}
            onPointerMove={onSeekMove}
            onPointerUp={onSeekUp}
            onPointerCancel={() => {
              dragging.current = false;
            }}
          >
            <div className="tg-vp-track">
              <div
                className="tg-vp-buffered"
                style={{ width: `${buffredPct * 100}%` }}
              />
              <div
                className="tg-vp-progress"
                style={{ width: `${progress * 100}%` }}
              />
              <div
                className="tg-vp-knob"
                style={{ left: `${progress * 100}%` }}
              />
            </div>
          </div>
          <span className="tg-vp-time">{fmtDuration(dur)}</span>
        </div>
      </div>
    </div>
  );
}
