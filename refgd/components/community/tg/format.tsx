"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Shared deterministic formatting helpers for the Telegram replica.
 *
 * Vouch topics are server-rendered, so anything in their initial markup must
 * be a pure function of the data (no locale/timezone reads) or hydration
 * breaks. <LocalTime> renders a deterministic UTC value first and swaps to
 * the visitor's local clock after mount.
 *
 * Emoji render as Telegram Web A's Apple emoji sprites (img-apple-64), the
 * exact same <img class="emoji emoji-small"> markup the real client emits.
 */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Stable 0-6 peer palette index from a display name (Telegram-style). */
export function peerIdx(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) {
    h = (h * 31 + name.charCodeAt(i)) >>> 0;
  }
  return h % 7;
}

/** UTC date key (YYYY-MM-DD) straight from an ISO timestamp string. */
export function dateKey(iso: string): string {
  const m = /^(\d{4}-\d{2}-\d{2})/.exec(iso);
  return m ? m[1] : iso;
}

/** Telegram-style date label: "June 8" (same year) / "June 8, 2025". */
export function dateLabel(key: string, todayYear: number): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(key);
  if (!m) return key;
  const month = MONTHS[Number(m[2]) - 1] ?? "";
  const day = Number(m[3]);
  const year = Number(m[1]);
  return year === todayYear ? `${month} ${day}` : `${month} ${day}, ${year}`;
}

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Deterministic short date for chat-list rows: "Jun 8". */
export function shortDateLabel(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "";
  return `${MONTHS_SHORT[Number(m[2]) - 1] ?? ""} ${Number(m[3])}`;
}

/** Deterministic UTC HH:MM from an ISO timestamp. */
function utcTime(iso: string): string {
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  return m ? `${m[1]}:${m[2]}` : "";
}

function localTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return utcTime(iso);
  const h = d.getHours().toString().padStart(2, "0");
  const min = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${min}`;
}

/**
 * HH:MM clock that is SSR-deterministic (UTC) and corrects itself to the
 * visitor's local timezone right after hydration.
 */
export function LocalTime({ iso }: { iso: string }) {
  const [text, setText] = useState(() => utcTime(iso));
  useEffect(() => {
    setText(localTime(iso));
  }, [iso]);
  return <>{text}</>;
}

/* ── Apple emoji (Telegram Web A img-apple-64 sprites) ───────────── */

const EMOJI_RE =
  /\p{Regional_Indicator}\p{Regional_Indicator}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:[\u{1F3FB}-\u{1F3FF}]|\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:[\u{1F3FB}-\u{1F3FF}]|\uFE0F)?)*/gu;

/** img-apple-64 sprite URL for an emoji sequence (FE0F stripped, hex-joined). */
export function emojiSrc(seq: string): string {
  const codes = Array.from(seq)
    .map((c) => (c.codePointAt(0) ?? 0).toString(16))
    .filter((h) => h !== "fe0f");
  return `https://web.telegram.org/a/img-apple-64/${codes.join("-")}.png`;
}

/**
 * Plain text → React nodes with Web A Apple-emoji imgs and <br> line breaks
 * (the real client emits <br> between lines, not pre-wrap text).
 */
export function renderTextWithEmoji(text: string, keyPrefix = "t"): ReactNode[] {
  const out: ReactNode[] = [];
  const lines = text.split("\n");
  lines.forEach((line, li) => {
    if (li > 0) out.push(<br key={`${keyPrefix}-b${li}`} />);
    let last = 0;
    let k = 0;
    EMOJI_RE.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = EMOJI_RE.exec(line)) !== null) {
      if (m.index > last) out.push(line.slice(last, m.index));
      out.push(
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={`${keyPrefix}-e${li}-${k}`}
          src={emojiSrc(m[0])}
          className="emoji emoji-small"
          alt={m[0]}
          draggable={false}
          loading="lazy"
        />,
      );
      k += 1;
      last = m.index + m[0].length;
    }
    if (last < line.length) out.push(line.slice(last));
  });
  return out;
}

const URL_RE = /(https?:\/\/[^\s]+|t\.me\/[^\s]+)/g;

/**
 * Custom (premium pack) emoji sticker rendered from the Telegram document id,
 * falling back to the plain Apple-emoji sprite when the sticker can't be
 * served (e.g. no bot token in dev, or an animated-only document).
 */
export function CustomEmojiImg({ id, alt }: { id: string; alt: string }) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={emojiSrc(alt)}
        className="emoji emoji-small"
        alt={alt}
        draggable={false}
        loading="lazy"
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/api/community/emoji/${id}`}
      className="emoji emoji-small tg-custom-emoji"
      alt={alt}
      draggable={false}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
}

/** Text segment with URLs linkified + Apple emoji (no custom-emoji tokens). */
function renderLinkified(body: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  let k = 0;
  while ((match = URL_RE.exec(body)) !== null) {
    if (match.index > last) {
      out.push(
        ...renderTextWithEmoji(
          body.slice(last, match.index),
          `${keyPrefix}s${k}`,
        ),
      );
    }
    const raw = match[0];
    const href = raw.startsWith("http") ? raw : `https://${raw}`;
    out.push(
      <a
        key={`${keyPrefix}l${k}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {raw}
      </a>,
    );
    last = match.index + raw.length;
    k += 1;
  }
  if (last < body.length) {
    out.push(...renderTextWithEmoji(body.slice(last), `${keyPrefix}s${k}`));
  }
  return out;
}

/** `[ce:<documentId>:<alt>]` — custom emoji token written by the composer. */
const CE_RE = /\[ce:(\d+):([^\]]+)\]/g;

/**
 * Body text with custom-emoji tokens, linkified URLs and Apple emoji
 * (React escapes the rest).
 */
export function renderBody(body: string): ReactNode {
  if (!body) return null;
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  CE_RE.lastIndex = 0;
  let k = 0;
  while ((match = CE_RE.exec(body)) !== null) {
    if (match.index > last) {
      out.push(...renderLinkified(body.slice(last, match.index), `c${k}`));
    }
    out.push(<CustomEmojiImg key={`ce${k}`} id={match[1]} alt={match[2]} />);
    last = match.index + match[0].length;
    k += 1;
  }
  if (last < body.length) {
    out.push(...renderLinkified(body.slice(last), `c${k}`));
  }
  return out;
}
