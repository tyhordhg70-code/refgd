"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { EMOJI_FE0F_KEEP } from "./emoji-fe0f";

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

/**
 * img-apple-64 sprite URL for an emoji sequence (FE0F stripped, hex-joined).
 * Served from jsdelivr's copy of the *same* iamcal img-apple-64 set that
 * Telegram Web A vendors, NOT web.telegram.org: the Telegram CDN sends no
 * Cross-Origin-Resource-Policy / Access-Control-Allow-Origin, so inside the
 * Telegram Mini App (a cross-origin webview) those <img>s were blocked and
 * rendered blank. jsdelivr sends `Cross-Origin-Resource-Policy: cross-origin`
 * + `Access-Control-Allow-Origin: *`, and the pinned tag is immutably cached.
 */
export function emojiSrc(seq: string): string {
  const stripped = Array.from(seq)
    .map((c) => (c.codePointAt(0) ?? 0).toString(16))
    .filter((h) => h !== "fe0f");
  // iamcal img-apple-64 KEEPS the -fe0f suffix for a fixed set of "text-default"
  // emoji (e.g. ❤ → 2764-fe0f.png). Blindly stripping fe0f 404'd the heart (and
  // every other text-default glyph), so re-append it for those keys only.
  const key = stripped.join("-");
  const codes = EMOJI_FE0F_KEEP.has(key) ? [...stripped, "fe0f"] : stripped;
  return `https://cdn.jsdelivr.net/gh/iamcal/emoji-data@v15.1.2/img-apple-64/${codes.join("-")}.png`;
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
 * Custom (premium pack) emoji sticker rendered from the Telegram document id.
 *
 * ARTWORK-FIRST: the visible <img> starts on the real pack artwork and only
 * falls back to the Apple sprite if the artwork fails to decode. The visible
 * element IS the artwork (a lazy <img>), not an eager `new Image()` probe per
 * emoji — a message list mounting hundreds of custom emoji at once stampeded
 * those probes, starving them so many glyphs ended up stuck on their WRONG
 * Apple fallback. Source cascade: self-hosted webp (/tg-emoji, only some ids)
 * → /api/community/emoji thumb (Bot API, prod only) → Apple sprite (last, so it
 * can never stay blank).
 *
 * Two blank-emoji traps handled: (1) an SSR-emitted <img> whose 404/decode
 * error fires before hydration wires up onError — a mount effect re-checks
 * `complete && naturalWidth === 0` and advances the cascade; (2) the cascade
 * index resets whenever `id`/`alt` changes so a recycled node re-tries artwork
 * instead of inheriting the previous emoji's exhausted fallback.
 */
export function CustomEmojiImg({ id, alt }: { id: string; alt: string }) {
  const sources = useMemo(
    () => [`/tg-emoji/${id}.webp`, `/api/community/emoji/${id}`, emojiSrc(alt)],
    [id, alt],
  );
  const [idx, setIdx] = useState(0);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Restart at the artwork source whenever this node is reused for a new emoji.
  useEffect(() => {
    setIdx(0);
  }, [id, alt]);

  const advance = () => setIdx((i) => (i < sources.length - 1 ? i + 1 : i));

  // Catch a decode error that fired before hydration attached onError.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) advance();
    // advance is stable enough; only re-run when the shown source changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={sources[idx]}
      className="emoji emoji-small tg-custom-emoji"
      alt={alt}
      draggable={false}
      loading="lazy"
      onError={advance}
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

/* ── Inline markdown-lite (Web A TextFormatter output) ──────────────
 * The composer stays plain text; the floating TextFormatter wraps the
 * selection in these lightweight markers, and this parser turns them back
 * into styled spans on render. Deliberately small (not full markdown):
 * bold, strike, italic, spoiler, monospace and [text](url).
 */
interface InlineRule {
  re: RegExp;
  /** recurse = allow nested formatting; emoji = plain text + emoji;
   *  raw = verbatim (monospace). */
  mode: "recurse" | "emoji" | "raw";
  wrap: (key: string, kids: ReactNode, m: RegExpExecArray) => ReactNode;
}

const INLINE_RULES: InlineRule[] = [
  {
    re: /\|\|([\s\S]+?)\|\|/,
    mode: "recurse",
    wrap: (key, kids) => (
      <span key={key} className="tg-spoiler" tabIndex={0}>
        {kids}
      </span>
    ),
  },
  {
    re: /\*\*([\s\S]+?)\*\*/,
    mode: "recurse",
    wrap: (key, kids) => <strong key={key}>{kids}</strong>,
  },
  {
    re: /~~([\s\S]+?)~~/,
    mode: "recurse",
    wrap: (key, kids) => <s key={key}>{kids}</s>,
  },
  {
    re: /__([\s\S]+?)__/,
    mode: "recurse",
    wrap: (key, kids) => <em key={key}>{kids}</em>,
  },
  {
    re: /`([^`]+?)`/,
    mode: "raw",
    wrap: (key, kids) => (
      <code key={key} className="tg-mono">
        {kids}
      </code>
    ),
  },
  {
    re: /\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/,
    mode: "emoji",
    wrap: (key, kids, m) => (
      <a key={key} href={m[2]} target="_blank" rel="noopener noreferrer">
        {kids}
      </a>
    ),
  },
];

/**
 * Parse a text segment for inline markdown-lite tokens, falling back to
 * URL-linkified + emoji text for the runs between tokens.
 */
function renderInline(text: string, keyPrefix: string): ReactNode[] {
  let best: { rule: InlineRule; m: RegExpExecArray } | null = null;
  for (const rule of INLINE_RULES) {
    const m = new RegExp(rule.re.source).exec(text);
    if (m && (best === null || m.index < best.m.index)) best = { rule, m };
  }
  if (best === null) return renderLinkified(text, keyPrefix);
  const { rule, m } = best;
  const out: ReactNode[] = [];
  if (m.index > 0) {
    out.push(...renderLinkified(text.slice(0, m.index), `${keyPrefix}p`));
  }
  const inner = m[1];
  const kids: ReactNode =
    rule.mode === "recurse"
      ? renderInline(inner, `${keyPrefix}i`)
      : rule.mode === "emoji"
        ? renderTextWithEmoji(inner, `${keyPrefix}i`)
        : inner;
  out.push(rule.wrap(`${keyPrefix}t`, kids, m));
  const rest = text.slice(m.index + m[0].length);
  if (rest) out.push(...renderInline(rest, `${keyPrefix}r`));
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
      out.push(...renderInline(body.slice(last, match.index), `c${k}`));
    }
    out.push(<CustomEmojiImg key={`ce${k}`} id={match[1]} alt={match[2]} />);
    last = match.index + match[0].length;
    k += 1;
  }
  if (last < body.length) {
    out.push(...renderInline(body.slice(last), `c${k}`));
  }
  return out;
}
