"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Voice-note recorder for the composer mic button.
 *
 * Container preference: audio/mp4 (AAC) FIRST — it records on Safari/iOS and
 * modern Chrome and, crucially, PLAYS BACK everywhere. webm/opus is the
 * fallback for older Chrome/Firefox; iOS Safari cannot decode webm/opus, so
 * mp4 must win whenever the browser offers it.
 *
 * On stop, the captured blob is decoded with WebAudio to extract a 32-bucket
 * peak waveform (base36 chars 0-v, matching the server's validation) and a
 * trustworthy duration; when decoding fails (no WebAudio, exotic container)
 * we fall back to the wall-clock elapsed time and a flat mid-height waveform.
 */

export interface VoiceRecording {
  blob: Blob;
  durationSec: number;
  waveform: string;
}

const WAVEFORM_BUCKETS = 32;
const MAX_RECORD_S = 600;

function pickMime(): string {
  if (typeof MediaRecorder === "undefined") return "";
  if (MediaRecorder.isTypeSupported?.("audio/mp4")) return "audio/mp4";
  if (MediaRecorder.isTypeSupported?.("audio/webm;codecs=opus"))
    return "audio/webm;codecs=opus";
  if (MediaRecorder.isTypeSupported?.("audio/webm")) return "audio/webm";
  return "";
}

async function extractWaveform(
  blob: Blob,
  fallbackSec: number,
): Promise<{ durationSec: number; waveform: string }> {
  const flat = "g".repeat(WAVEFORM_BUCKETS); // mid-height bars
  try {
    const AC: typeof AudioContext | undefined =
      typeof window !== "undefined"
        ? (window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext)
        : undefined;
    if (!AC) return { durationSec: fallbackSec, waveform: flat };
    const ctx = new AC();
    try {
      const buf = await ctx.decodeAudioData(await blob.arrayBuffer());
      const data = buf.getChannelData(0);
      const bucketLen = Math.max(1, Math.floor(data.length / WAVEFORM_BUCKETS));
      let peaks: number[] = [];
      for (let b = 0; b < WAVEFORM_BUCKETS; b += 1) {
        let peak = 0;
        const start = b * bucketLen;
        const end = Math.min(start + bucketLen, data.length);
        // Sample sparsely inside the bucket — full scans of long clips stall.
        const step = Math.max(1, Math.floor((end - start) / 200));
        for (let i = start; i < end; i += step) {
          const v = Math.abs(data[i]);
          if (v > peak) peak = v;
        }
        peaks.push(peak);
      }
      const max = Math.max(...peaks, 0.001);
      peaks = peaks.map((p) => p / max);
      const waveform = peaks
        .map((p) => Math.min(31, Math.round(p * 31)).toString(36))
        .join("");
      return {
        durationSec: buf.duration > 0 ? buf.duration : fallbackSec,
        waveform,
      };
    } finally {
      void ctx.close().catch(() => undefined);
    }
  } catch {
    return { durationSec: fallbackSec, waveform: flat };
  }
}

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);
  const cancelledRef = useRef(false);
  const resolveRef = useRef<((r: VoiceRecording | null) => void) | null>(null);

  const cleanup = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    recorderRef.current = null;
    setRecording(false);
  }, []);

  useEffect(
    () => () => {
      cancelledRef.current = true;
      try {
        recorderRef.current?.stop();
      } catch {
        /* already stopped */
      }
      cleanup();
    },
    [cleanup],
  );

  /** Ask for the mic and start recording. Resolves false when denied. */
  const start = useCallback(async (): Promise<boolean> => {
    if (recording || processing) return false;
    setError(null);
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices?.getUserMedia ||
      typeof MediaRecorder === "undefined"
    ) {
      setError("Voice recording isn't supported in this browser");
      return false;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setError("Microphone access was denied");
      return false;
    }
    const mime = pickMime();
    let rec: MediaRecorder;
    try {
      rec = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
    } catch {
      stream.getTracks().forEach((t) => t.stop());
      setError("Voice recording isn't supported in this browser");
      return false;
    }
    chunksRef.current = [];
    cancelledRef.current = false;
    rec.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    rec.onstop = () => {
      const resolve = resolveRef.current;
      resolveRef.current = null;
      const elapsedSec = Math.max(
        1,
        Math.round((Date.now() - startedAtRef.current) / 1000),
      );
      const blob = new Blob(chunksRef.current, {
        type: rec.mimeType || mime || "audio/webm",
      });
      chunksRef.current = [];
      cleanup();
      if (cancelledRef.current || blob.size === 0) {
        resolve?.(null);
        return;
      }
      setProcessing(true);
      void extractWaveform(blob, elapsedSec).then(({ durationSec, waveform }) => {
        setProcessing(false);
        resolve?.({
          blob,
          durationSec: Math.min(Math.max(1, Math.round(durationSec)), MAX_RECORD_S),
          waveform,
        });
      });
    };
    recorderRef.current = rec;
    streamRef.current = stream;
    startedAtRef.current = Date.now();
    setElapsed(0);
    rec.start(250);
    setRecording(true);
    timerRef.current = window.setInterval(() => {
      const s = Math.floor((Date.now() - startedAtRef.current) / 1000);
      setElapsed(s);
      if (s >= MAX_RECORD_S) {
        // Hard cap — auto-stop like Telegram.
        try {
          recorderRef.current?.stop();
        } catch {
          /* already stopped */
        }
      }
    }, 250);
    return true;
  }, [recording, processing, cleanup]);

  /** Stop and get the finished recording (null when cancelled/empty). */
  const stop = useCallback((): Promise<VoiceRecording | null> => {
    const rec = recorderRef.current;
    if (!rec || rec.state === "inactive") return Promise.resolve(null);
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      try {
        rec.stop();
      } catch {
        resolveRef.current = null;
        cleanup();
        resolve(null);
      }
    });
  }, [cleanup]);

  /** Discard the take entirely. */
  const cancel = useCallback(() => {
    cancelledRef.current = true;
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        cleanup();
      }
    } else {
      cleanup();
    }
  }, [cleanup]);

  return { recording, elapsed, processing, error, setError, start, stop, cancel };
}
