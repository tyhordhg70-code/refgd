"use client";
import { useEffect, useState } from "react";

interface Props {
  text: string;
  cta: string;
  url: string;
  /** Auto-fade after this many ms (default 5 minutes). */
  autoFadeMs?: number;
}

const STORAGE_KEY = "rg:banner-dismissed";

export default function AnnouncementBanner({ text, cta, url, autoFadeMs = 5 * 60 * 1000 }: Props) {
  const [hidden, setHidden] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissedAt = sessionStorage.getItem(STORAGE_KEY);
    if (dismissedAt) return;
    setHidden(false);
    const t = setTimeout(() => {
      setFading(true);
      // remove from layout after fade transition
      setTimeout(() => setHidden(true), 800);
    }, autoFadeMs);
    return () => clearTimeout(t);
  }, [autoFadeMs]);

  if (hidden) return null;

  function dismiss() {
    setFading(true);
    sessionStorage.setItem(STORAGE_KEY, String(Date.now()));
    setTimeout(() => setHidden(true), 400);
  }

  return (
    <div
      role="region"
      aria-label="Announcement"
      className={`relative isolate z-40 transition-opacity duration-700 ${
        fading ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="relative overflow-hidden bg-gradient-to-r from-fuchsia-600 via-violet-600 to-sky-500">
        {/* shimmer */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-0"
          style={{
            backgroundImage:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
            backgroundSize: "200% 100%",
            animation: "shimmer 3s linear infinite",
          }}
        />
        <div className="container-px relative flex items-center justify-between gap-3 py-2.5 text-sm">
          <div className="flex items-center gap-2 text-white">
            <span aria-hidden="true" className="inline-block h-2 w-2 animate-pulse rounded-full bg-white" />
            <span className="font-medium">{text}</span>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-white backdrop-blur transition hover:bg-white/25"
            >
              {cta} →
            </a>
          </div>
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={dismiss}
            className="grid h-7 w-7 place-items-center rounded-full text-white/80 transition hover:bg-white/15 hover:text-white"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
