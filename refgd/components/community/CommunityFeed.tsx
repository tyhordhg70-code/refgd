"use client";

import { useMemo, useState, type ReactNode } from "react";

/**
 * Client-side community feed: a Telegram-style, tabbed message stream fed
 * entirely by the server (DB is the source of truth). No @usernames are ever
 * shown — only the display name and photo, exactly as forwarded. Photos are
 * served from /api/community/media/[id] (Postgres BYTEA).
 */

export interface VouchView {
  id: string;
  authorName: string;
  body: string;
  mediaIds: string[];
  pinned: boolean;
  createdAt: string;
  originDate: string | null;
}

export interface FeedSection {
  key: string;
  label: string;
  blurb: string;
  vouches: VouchView[];
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Deterministic (SSR-safe) date formatting straight from the timestamp text. */
function formatDate(ts: string | null): string {
  if (!ts) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(ts);
  if (!m) return "";
  const month = MONTHS[Number(m[2]) - 1] ?? "";
  return `${month} ${Number(m[3])}, ${m[1]}`;
}

const AVATAR_COLORS = [
  "from-amber-400/80 to-orange-500/80",
  "from-cyan-400/80 to-blue-500/80",
  "from-violet-400/80 to-fuchsia-500/80",
  "from-emerald-400/80 to-teal-500/80",
  "from-rose-400/80 to-pink-500/80",
  "from-sky-400/80 to-indigo-500/80",
];

function avatarClass(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

const URL_RE = /(https?:\/\/[^\s]+|(?:^|)t\.me\/[^\s]+)/g;

/** Render body text with URLs turned into safe links (React escapes the rest). */
function renderBody(body: string): ReactNode {
  if (!body) return null;
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  let k = 0;
  while ((match = URL_RE.exec(body)) !== null) {
    if (match.index > last) out.push(body.slice(last, match.index));
    const raw = match[0];
    const href = raw.startsWith("http") ? raw : `https://${raw}`;
    out.push(
      <a
        key={`l${k}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-amber-300 underline decoration-amber-300/40 underline-offset-2 hover:text-amber-200"
      >
        {raw}
      </a>,
    );
    last = match.index + raw.length;
    k += 1;
  }
  if (last < body.length) out.push(body.slice(last));
  return out;
}

function VouchMessage({ v }: { v: VouchView }) {
  const when = formatDate(v.originDate ?? v.createdAt);
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 sm:p-5">
      <header className="flex items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarClass(
            v.authorName,
          )} text-sm font-bold text-black/80`}
          aria-hidden
        >
          {initials(v.authorName)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-white">
            {v.pinned && <span className="mr-1" aria-label="Pinned">📌</span>}
            {v.authorName}
          </p>
          {when && <p className="text-xs text-white/45">{when}</p>}
        </div>
      </header>

      {v.body && (
        <p className="mt-3 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-white/80">
          {renderBody(v.body)}
        </p>
      )}

      {v.mediaIds.length > 0 && (
        <div
          className={`mt-3 grid gap-2 ${
            v.mediaIds.length > 1 ? "grid-cols-2" : "grid-cols-1"
          }`}
        >
          {v.mediaIds.map((id) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={id}
              src={`/api/community/media/${id}`}
              alt="Vouch attachment"
              loading="lazy"
              className="max-h-[520px] w-full rounded-xl border border-white/10 bg-black/40 object-contain"
            />
          ))}
        </div>
      )}
    </article>
  );
}

export default function CommunityFeed({ sections }: { sections: FeedSection[] }) {
  const [active, setActive] = useState(sections[0]?.key ?? "");
  const current = useMemo(
    () => sections.find((s) => s.key === active) ?? sections[0],
    [sections, active],
  );

  if (!current) return null;

  return (
    <div className="container-px pb-24">
      <div className="mx-auto max-w-3xl">
        {/* Tab bar */}
        <div className="sticky top-16 z-20 -mx-4 mb-6 flex gap-2 overflow-x-auto border-b border-white/10 bg-ink-950/70 px-4 py-3 backdrop-blur-md">
          {sections.map((s) => {
            const on = s.key === current.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setActive(s.key)}
                className={`shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
                  on
                    ? "bg-amber-400 text-black"
                    : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                {s.label}
                <span
                  className={`ml-2 text-xs ${on ? "text-black/60" : "text-white/40"}`}
                >
                  {s.vouches.length}
                </span>
              </button>
            );
          })}
        </div>

        <p className="mb-5 text-sm text-white/55">{current.blurb}</p>

        {current.vouches.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-16 text-center">
            <p className="text-white/60">Nothing here yet — check back soon.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {current.vouches.map((v) => (
              <VouchMessage key={v.id} v={v} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
