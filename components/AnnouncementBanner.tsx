"use client";
import { useEffect, useState } from "react";
import { useEditContext } from "@/lib/edit-context";
import EditableText from "./EditableText";
import EditableLink from "./EditableLink";

interface Props {
  text: string;
  cta: string;
  url: string;
  /** Auto-fade after this many ms (default 3 minutes total browsing time). */
  autoFadeMs?: number;
}

const DISMISS_KEY = "rg:banner-dismissed";
const FIRST_SEEN_KEY = "rg:banner-first-seen";

export default function AnnouncementBanner({
  text,
  cta,
  url,
  autoFadeMs = 3 * 60 * 1000,
}: Props) {
  const [hidden, setHidden] = useState(true);
  const [fading, setFading] = useState(false);
  // When the admin is editing, force the banner visible so it can be edited
  // even if it has been auto-faded or dismissed for this device.
  const { isAdmin, editMode } = useEditContext();
  const forceVisible = isAdmin && editMode;

  useEffect(() => {
    if (typeof window === "undefined") return;

    // User-dismissed in this browser? Keep hidden permanently for this device.
    if (localStorage.getItem(DISMISS_KEY)) return;

    // Track first-seen timestamp across page navigations so the 3-minute
    // timer is "browsing time on the site", not "time on this page".
    const now = Date.now();
    const firstSeenStr = localStorage.getItem(FIRST_SEEN_KEY);
    const firstSeen = firstSeenStr ? Number(firstSeenStr) : now;
    if (!firstSeenStr) localStorage.setItem(FIRST_SEEN_KEY, String(firstSeen));

    const elapsed = now - firstSeen;
    if (elapsed >= autoFadeMs) return; // already past the fade window

    setHidden(false);
    const remaining = autoFadeMs - elapsed;
    const t = setTimeout(() => {
      setFading(true);
      setTimeout(() => setHidden(true), 800);
    }, remaining);
    return () => clearTimeout(t);
  }, [autoFadeMs]);

  if (hidden && !forceVisible) return null;

  function dismiss() {
    setFading(true);
    try { localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch {}
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
        <div className="container-px relative flex items-center justify-between gap-3 py-2 text-xs sm:text-sm">
          <div className="flex min-w-0 items-center gap-2 text-white">
            <span aria-hidden="true" className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            <EditableText
              id="banner.text"
              defaultValue={text}
              as="span"
              className="truncate font-medium"
            />
            <EditableLink
              idHref="banner.url"
              defaultHref={url}
              idLabel="banner.cta"
              defaultLabel={cta}
              external
              className="inline-flex shrink-0 items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur transition hover:bg-white/25 sm:text-xs"
            />
          </div>
          <button
            type="button"
            aria-label="Dismiss announcement"
            onClick={dismiss}
            className="grid h-6 w-6 shrink-0 place-items-center rounded-full text-white/85 transition hover:bg-white/15 hover:text-white"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
