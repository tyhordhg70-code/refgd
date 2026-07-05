"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Telegram Web A-style voice-note bubble body: round play/pause button,
 * 32-bar peak waveform (base36 chars 0-v from the recorder), elapsed/total
 * time. Clicking the waveform seeks. The <audio> element streams from
 * /api/community/chat-media/[id] (Range-enabled for iOS).
 */

function fmtTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

const BUCKETS = 32;

export default function VoiceMessage({
  src,
  duration,
  waveform,
  own,
}: {
  src: string;
  duration: number;
  waveform: string;
  own: boolean;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0); // 0..1
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);

  // Normalize to exactly 32 bars; flat mid-height when the token had none.
  const bars: number[] = [];
  for (let i = 0; i < BUCKETS; i += 1) {
    const ch = waveform.charAt(
      waveform.length > 0
        ? Math.floor((i / BUCKETS) * waveform.length)
        : 0,
    );
    const v = ch ? parseInt(ch, 36) : NaN;
    bars.push(Number.isFinite(v) ? Math.min(31, Math.max(0, v)) : 16);
  }

  useEffect(() => {
    const tick = () => {
      const a = audioRef.current;
      if (a && a.duration > 0) {
        setProgress(a.currentTime / a.duration);
        setCurrent(a.currentTime);
      }
      rafRef.current = playing ? requestAnimationFrame(tick) : null;
    };
    if (playing) rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [playing]);

  // Never keep audio running when the tab is hidden or the bubble unmounts.
  useEffect(() => {
    const onHide = () => {
      if (document.hidden) audioRef.current?.pause();
    };
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      audioRef.current?.pause();
    };
  }, []);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      const p = a.play();
      if (p && typeof p.catch === "function") p.catch(() => {});
    } else {
      a.pause();
    }
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    const a = audioRef.current;
    if (!a) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const frac = Math.min(
      1,
      Math.max(0, (e.clientX - rect.left) / Math.max(1, rect.width)),
    );
    const dur = a.duration > 0 && Number.isFinite(a.duration) ? a.duration : duration;
    a.currentTime = frac * dur;
    setProgress(frac);
    setCurrent(frac * dur);
  };

  const playedBars = Math.round(progress * BUCKETS);

  return (
    <div className={`tg-voice${own ? " is-own" : ""}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => {
          setPlaying(false);
          setProgress(0);
          setCurrent(0);
        }}
      />
      <button
        type="button"
        className="tg-voice-play"
        onClick={toggle}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
      >
        <i
          className={`icon ${playing ? "icon-pause" : "icon-play"}`}
          aria-hidden
        />
      </button>
      <div className="tg-voice-right">
        <div
          className="tg-voice-wave"
          onClick={seek}
          role="slider"
          aria-label="Seek"
          aria-valuemin={0}
          aria-valuemax={Math.round(duration)}
          aria-valuenow={Math.round(current)}
        >
          {bars.map((v, i) => (
            <span
              key={i}
              className={`tg-voice-bar${i < playedBars ? " is-played" : ""}`}
              style={{ height: `${Math.round(4 + (v / 31) * 16)}px` }}
            />
          ))}
        </div>
        <div className="tg-voice-time">
          {playing || current > 0 ? fmtTime(current) : fmtTime(duration)}
        </div>
      </div>
    </div>
  );
}
