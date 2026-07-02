"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * Shared deterministic formatting helpers for the Telegram replica.
 *
 * Vouch topics are server-rendered, so anything in their initial markup must
 * be a pure function of the data (no locale/timezone reads) or hydration
 * breaks. <LocalTime> renders a deterministic UTC value first and swaps to
 * the visitor's local clock after mount.
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

const URL_RE = /(https?:\/\/[^\s]+|t\.me\/[^\s]+)/g;

/** Body text with URLs linkified (React escapes everything else). */
export function renderBody(body: string): ReactNode {
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
      <a key={`l${k}`} href={href} target="_blank" rel="noopener noreferrer">
        {raw}
      </a>,
    );
    last = match.index + raw.length;
    k += 1;
  }
  if (last < body.length) out.push(body.slice(last));
  return out;
}
