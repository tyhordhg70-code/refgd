"use client";
import { useEffect, useRef, useState } from "react";

/**
 * YouTubeTheater — embeds a YouTube video with a click-to-theater mode.
 *
 * Default state:  inline, rounded card, soft glow.
 * Theater state:  full-bleed dark overlay, video centred & enlarged,
 *                 background music in MusicPlayer is dimmed via the
 *                 `refgd:music-dim` custom event the player listens for.
 *
 * Press Esc, click the backdrop or the close button to exit theater
 * mode; the music returns to its previous volume.
 */
export default function YouTubeTheater({
  videoId,
  title = "RefundGod — Trailer",
  className = "",
  poster,
}: {
  videoId: string;
  title?: string;
  className?: string;
  poster?: string;
}) {
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    window.dispatchEvent(new CustomEvent("refgd:music-dim", { detail: { dim: true } }));
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      window.dispatchEvent(new CustomEvent("refgd:music-dim", { detail: { dim: false } }));
    };
  }, [open]);

  const thumb = poster || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  return (
    <>
      <div
        className={`relative overflow-hidden rounded-3xl border border-white/10 ${className}`}
        style={{
          boxShadow: hover
            ? "0 40px 100px -30px rgba(124,58,237,0.55), 0 0 0 1px rgba(167,139,250,0.25) inset"
            : "0 30px 80px -30px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04) inset",
          transition: "box-shadow .35s ease",
        }}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <button
          type="button"
          className="group relative block w-full"
          onClick={() => setOpen(true)}
          aria-label={`Play ${title} in theater mode`}
        >
          <div className="relative aspect-video w-full overflow-hidden bg-black">
            {/* Poster image */}
            <img
              src={thumb}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full scale-105 object-cover opacity-90 transition-transform duration-700 group-hover:scale-110"
            />
            <div
              aria-hidden
              className="absolute inset-0"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.7) 100%)",
              }}
            />
            {/* Play button */}
            <div className="absolute inset-0 grid place-items-center">
              <span
                className="grid h-20 w-20 place-items-center rounded-full text-black shadow-[0_20px_60px_-10px_rgba(167,139,250,0.6)] transition-transform duration-300 group-hover:scale-110 sm:h-24 sm:w-24"
                style={{
                  background:
                    "radial-gradient(circle at 30% 30%, #ffffff, #d8b4fe 70%, #a78bfa)",
                }}
              >
                <svg width="34" height="34" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </div>
            {/* Theater badge */}
            <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.3em] text-white/90 backdrop-blur-md">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
              theater mode
            </div>
            {/* Title strip */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between p-4 sm:p-6">
              <span className="text-base font-semibold text-white drop-shadow sm:text-lg">
                {title}
              </span>
              <span className="text-xs uppercase tracking-[0.3em] text-white/70">
                tap to expand
              </span>
            </div>
          </div>
        </button>
      </div>

      {open ? (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-[200] grid place-items-center bg-black/85 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
          aria-label={title}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div className="relative w-full max-w-[1400px] px-4 sm:px-8">
            <div
              className="overflow-hidden rounded-2xl border border-white/15"
              style={{ boxShadow: "0 60px 160px -20px rgba(124,58,237,0.55)" }}
            >
              <div className="relative aspect-video w-full bg-black">
                <iframe
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1`}
                  title={title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between text-white/80">
              <span className="text-sm uppercase tracking-[0.3em]">
                Music auto-dimmed · Esc to close
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
