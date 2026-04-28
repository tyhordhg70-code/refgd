"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEditContext } from "@/lib/edit-context";

/**
 * YouTubeTheater — embeds a YouTube video with a click-to-theater mode.
 *
 * Default state:  inline, rounded card, soft glow.
 * Theater state:  full-bleed dark overlay, video centred & enlarged,
 *                 background music in MusicPlayer is dimmed via the
 *                 `refgd:music-dim` custom event the player listens for.
 *
 * Press Esc, click the backdrop or the close button to exit theater
 * mode; the music returns to its previous volume. The close button is
 * focused on open and the previously-active element is restored on
 * close, providing a basic focus trap for keyboard users.
 *
 * Admin editing:
 *  – When `editId` is provided and the visitor is an admin in edit
 *    mode, a small input strip appears above the player so the admin
 *    can swap the video by pasting a new YouTube URL or ID. The new
 *    ID is persisted through the standard EditContext `setValue`
 *    pipeline (Save/Discard/Undo all just work).
 */
export default function YouTubeTheater({
  videoId,
  title = "RefundGod — Trailer",
  className = "",
  poster,
  editId,
}: {
  videoId: string;
  title?: string;
  className?: string;
  poster?: string;
  /** Optional content-block id so admins can swap the video inline. */
  editId?: string;
}) {
  const ctx = useEditContext();
  const adminEditing = !!editId && ctx.isAdmin && ctx.editMode;

  // Resolve the active video ID through the EditContext when an editId
  // is present, so admin edits show up immediately and persist on Save.
  const resolvedVideoId = useMemo(() => {
    const raw = editId ? ctx.getValue(editId, videoId) : videoId;
    return parseYouTubeId(raw) || videoId;
  }, [editId, videoId, ctx]);

  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeBtnRef = useRef<HTMLButtonElement | null>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    // Remember what was focused so we can restore it on close.
    lastFocusRef.current = (document.activeElement as HTMLElement) || null;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
      if (e.key === "Tab") {
        // Trap focus inside the dialog so screen-reader / keyboard
        // users can't tab back into the dimmed page behind it.
        const root = dialogRef.current;
        if (!root) return;
        const focusables = Array.from(
          root.querySelectorAll<HTMLElement>(
            "a[href],button:not([disabled]),iframe,input,[tabindex]:not([tabindex='-1'])"
          )
        ).filter((el) => !el.hasAttribute("aria-hidden"));
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          last.focus();
          e.preventDefault();
        } else if (!e.shiftKey && document.activeElement === last) {
          first.focus();
          e.preventDefault();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    window.dispatchEvent(new CustomEvent("refgd:music-dim", { detail: { dim: true } }));

    // Focus the Close button after a tick so the autoplaying iframe
    // doesn't steal focus first.
    const t = setTimeout(() => closeBtnRef.current?.focus(), 60);

    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      window.dispatchEvent(new CustomEvent("refgd:music-dim", { detail: { dim: false } }));
      clearTimeout(t);
      // Restore focus to whatever opened the dialog.
      if (lastFocusRef.current && typeof lastFocusRef.current.focus === "function") {
        lastFocusRef.current.focus();
      }
    };
  }, [open]);

  const thumb = poster || `https://img.youtube.com/vi/${resolvedVideoId}/maxresdefault.jpg`;

  return (
    <>
      {adminEditing ? (
        <div className="mb-3 flex items-center gap-3 rounded-xl border border-amber-300/40 bg-amber-300/[0.06] px-4 py-3 text-xs text-amber-100">
          <span className="font-semibold uppercase tracking-[0.25em] text-amber-300">
            ✎ Video
          </span>
          <input
            type="text"
            defaultValue={ctx.getValue(editId!, videoId)}
            placeholder="Paste a YouTube URL or 11-character ID"
            className="flex-1 rounded-md border border-amber-300/30 bg-black/40 px-3 py-1.5 font-mono text-sm text-white outline-none ring-amber-300/0 focus:ring-2 focus:ring-amber-300/70"
            onBlur={(e) => {
              const next = e.currentTarget.value.trim();
              const id = parseYouTubeId(next) || next;
              if (id && id !== ctx.getValue(editId!, videoId)) {
                ctx.setValue(editId!, id);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
          />
          <span className="hidden font-mono text-[10px] text-amber-200/70 sm:inline">
            id: {resolvedVideoId}
          </span>
        </div>
      ) : null}

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
                  src={`https://www.youtube.com/embed/${resolvedVideoId}?autoplay=1&rel=0&modestbranding=1`}
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
                ref={closeBtnRef}
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white/60"
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

/**
 * Pull the 11-char video ID out of any YouTube URL (watch?v=, youtu.be/,
 * shorts/, embed/) or accept a bare ID. Returns null if the input
 * doesn't look like a YouTube reference.
 */
function parseYouTubeId(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  // Bare 11-char ID
  if (/^[A-Za-z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const u = new URL(trimmed);
    const v = u.searchParams.get("v");
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    const path = u.pathname.split("/").filter(Boolean);
    // youtu.be/<id>, /shorts/<id>, /embed/<id>, /v/<id>
    const last = path[path.length - 1];
    if (last && /^[A-Za-z0-9_-]{11}$/.test(last)) return last;
  } catch {
    /* not a URL */
  }
  return null;
}
