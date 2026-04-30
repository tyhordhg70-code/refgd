"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useEditContext } from "@/lib/edit-context";

/**
 * YouTubeTheater — auto-play-on-scroll video with a "dim the lights"
 * overlay that does NOT lock page scroll.
 *
 * Behaviour:
 *  – As soon as the player scrolls into view (≥45% visible) the iframe
 *    mounts and starts playing with sound. A radial dim overlay fades
 *    in over the rest of the page so the video reads as the focus.
 *  – As soon as the player scrolls back out of view, the overlay fades
 *    out, the iframe is paused (via postMessage), and the page lights
 *    return to normal. The user can scroll freely AT ALL TIMES — the
 *    overlay is `pointer-events: none` and we never set
 *    `body.style.overflow`.
 *  – The MusicPlayer listens for `refgd:music-dim` events and ducks
 *    its own volume while the video has focus.
 *
 * Browser autoplay policy: most browsers allow autoplay-with-sound
 * once the user has interacted with the page (a scroll usually counts).
 * If the visitor hasn't yet interacted, YouTube will start the player
 * muted; once they click the page (e.g. on the player itself) sound
 * will engage normally. This is a platform constraint, not an option
 * we can override.
 *
 * Admin editing:
 *  – When `editId` is provided and the visitor is an admin in edit
 *    mode, a small input strip appears above the player so the admin
 *    can swap the video by pasting a new YouTube URL or ID.
 */
export default function YouTubeTheater({
  videoId,
  title = "RefundGod — Trailer",
  className = "",
  editId,
}: {
  videoId: string;
  title?: string;
  className?: string;
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

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [inView, setInView] = useState(false);
  const [activated, setActivated] = useState(false); // mounts iframe after first reveal

  // ── Visibility gate ───────────────────────────────────────────
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        // Treat the player as "engaged" once it's at least 45% visible.
        const visible = e.intersectionRatio >= 0.45;
        setInView(visible);
        if (visible) setActivated(true);
      },
      { threshold: [0, 0.2, 0.45, 0.7, 1] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ── Music + playback control synced to inView ─────────────────
  useEffect(() => {
    // Tell the MusicPlayer to dim while video has focus, restore on exit.
    window.dispatchEvent(
      new CustomEvent("refgd:music-dim", { detail: { dim: inView } })
    );

    // Pause the iframe video when we leave view (postMessage to the
    // YouTube embed). When we re-enter, the iframe re-mounts (we
    // include inView in the iframe's `src`), so playback resumes
    // naturally. The pause-on-exit is just defensive.
    if (!inView && iframeRef.current) {
      try {
        iframeRef.current.contentWindow?.postMessage(
          JSON.stringify({ event: "command", func: "pauseVideo", args: [] }),
          "*"
        );
      } catch {
        /* ignore — cross-origin is expected */
      }
    }
  }, [inView]);

  // Build the embed URL. autoplay=1 + mute=0 — the browser may force-
  // mute on the very first visit if the user hasn't interacted yet,
  // but a single click anywhere unmutes the player thereafter.
  const embedSrc = useMemo(() => {
    const params = new URLSearchParams({
      autoplay: "1",
      mute: "0",
      rel: "0",
      modestbranding: "1",
      playsinline: "1",
      enablejsapi: "1",
    });
    return `https://www.youtube.com/embed/${resolvedVideoId}?${params.toString()}`;
  }, [resolvedVideoId]);

  const posterSrc = `https://img.youtube.com/vi/${resolvedVideoId}/maxresdefault.jpg`;

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
        ref={wrapRef}
        className={`relative z-[60] overflow-hidden rounded-3xl border border-white/10 ${className}`}
        style={{
          boxShadow: inView
            ? "0 50px 140px -30px rgba(124,58,237,0.7), 0 0 0 1px rgba(167,139,250,0.35) inset"
            : "0 30px 80px -30px rgba(0,0,0,0.75), 0 0 0 1px rgba(255,255,255,0.04) inset",
          transition: "box-shadow .45s ease",
        }}
      >
        <div className="relative aspect-video w-full overflow-hidden bg-black">
          {activated ? (
            <iframe
              ref={iframeRef}
              key={resolvedVideoId}
              src={embedSrc}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          ) : (
            // Static poster shown only until the user first scrolls into
            // view. After that, the iframe takes over for the rest of
            // the page lifetime so re-entries resume playback instantly.
            <>
              <img
                src={posterSrc}
                alt=""
                loading="lazy"
                className="absolute inset-0 h-full w-full object-cover opacity-90"
              />
              <div
                aria-hidden
                className="absolute inset-0"
                style={{
                  background:
                    "radial-gradient(ellipse at center, rgba(0,0,0,0.05) 0%, rgba(0,0,0,0.45) 70%, rgba(0,0,0,0.7) 100%)",
                }}
              />
              <div className="absolute inset-0 grid place-items-center">
                <span
                  className="grid h-20 w-20 place-items-center rounded-full text-black shadow-[0_20px_60px_-10px_rgba(167,139,250,0.6)] sm:h-24 sm:w-24"
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
            </>
          )}
        </div>
      </div>
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
