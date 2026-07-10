"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { EMOJI_FE0F_KEEP } from "./emoji-fe0f";
import { EMOJI_CACHE_VERSION } from "@/lib/custom-emoji";
import {
  emojiDebugBump,
  emojiDebugError,
  sanitizeLottieData,
} from "./emoji-debug";

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

/**
 * Local-timezone date key (used for date-pill grouping AFTER hydration —
 * the UTC `dateKey` keeps SSR deterministic; see `useLocalDates`).
 */
export function dateKeyLocal(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return dateKey(iso);
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mo}-${da}`;
}

/**
 * True once hydrated: gates date-group math onto the DEVICE's timezone
 * (same SSR-safe pattern as LocalTime — server renders UTC groups, the
 * client re-groups to local right after mount so a 23:30 message lands under
 * the viewer's own calendar day).
 */
export function useLocalDates(): boolean {
  const [local, setLocal] = useState(false);
  useEffect(() => setLocal(true), []);
  return local;
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
 *
 * `animated` (message-bubble surfaces only): render each standard emoji via
 * <AnimatedEmoji> — Telegram's official animated artwork with an automatic
 * same-glyph static-sprite fallback — instead of the static Apple sprite.
 * Previews, picker chrome and button labels stay static (matches Web A).
 */
export function renderTextWithEmoji(
  text: string,
  keyPrefix = "t",
  animated = false,
): ReactNode[] {
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
        animated ? (
          <AnimatedEmoji key={`${keyPrefix}-e${li}-${k}`} ch={m[0]} />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={`${keyPrefix}-e${li}-${k}`}
            src={emojiSrc(m[0])}
            className="emoji emoji-small"
            alt={m[0]}
            draggable={false}
            loading="lazy"
          />
        ),
      );
      k += 1;
      last = m.index + m[0].length;
    }
    if (last < line.length) out.push(line.slice(last));
  });
  return out;
}

/**
 * A message whose ENTIRE trimmed body is one standard-emoji grapheme (e.g.
 * "🔥", "❤️", a flag or a ZWJ family) — Telegram renders those as a jumbo
 * ANIMATED emoji instead of a text bubble. Returns the emoji or null.
 */
const SINGLE_EMOJI_RE = new RegExp(`^(?:${EMOJI_RE.source})$`, "u");
export function isSingleStandardEmoji(text: string): string | null {
  const t = text.trim();
  if (!t || t.length > 24) return null;
  return SINGLE_EMOJI_RE.test(t) ? t : null;
}

/** Emoji sequence → the animated-emoji route's hex codepoint key. */
function emojiHexKey(seq: string): string {
  return Array.from(seq)
    .map((c) => (c.codePointAt(0) ?? 0).toString(16))
    .join("-");
}

/**
 * Telegram-style animated standard emoji: plays the official AnimatedEmojies
 * .tgs artwork (served as Lottie JSON by /api/community/animated-emoji) with
 * the vendored player; on ANY failure (no artwork for this emoji, route 404
 * without the bot token, player unavailable) it falls back to the static
 * Apple sprite of the SAME glyph — unlike pack emoji, a static same-glyph
 * substitute is correct here.
 */
export function AnimatedEmoji({ ch }: { ch: string }) {
  const [fallback, setFallback] = useState(false);
  // A recycled node can switch to a different emoji: reset the cascade.
  useEffect(() => {
    setFallback(false);
  }, [ch]);
  if (fallback) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={emojiSrc(ch)}
        className="emoji emoji-small tg-custom-emoji"
        alt={ch}
        draggable={false}
        loading="lazy"
      />
    );
  }
  return (
    <LottieEmoji
      src={`/api/community/animated-emoji/${emojiHexKey(ch)}`}
      alt={ch}
      onError={() => setFallback(true)}
    />
  );
}

// Bare `@refundgod` (the group's public handle, all over imported vouches)
// linkifies straight to the Telegram group; `@everyone` renders as a blue
// mention (the server only broadcasts it when an admin posted it).
const URL_RE = /(https?:\/\/[^\s]+|t\.me\/[^\s]+|@refundgod\b|@everyone\b)/gi;

/**
 * Force muted + play on mount so an animated custom-emoji <video> autoplays:
 * React drops the `muted` attribute during SSR, which otherwise blocks autoplay
 * until hydration (same trick the member-avatar video uses). Every video is
 * also registered with a shared IntersectionObserver + a visibilitychange
 * handler so offscreen/hidden-tab tiles stop decoding (dozens of looping
 * .webm decoders were the picker's main scroll lag) — IO does NOT fire on tab
 * switches, so both hooks are needed (see the tab-visibility lesson).
 */
const emojiVideos = new Set<HTMLVideoElement>();
let emojiVideoIO: IntersectionObserver | null = null;
let emojiVideoWired = false;

/**
 * Scroll-idle gate — the remaining "emojis are lagging" lever: dozens of
 * looping .webm decoders + Lottie renderers compete with scroll compositing
 * on exactly the frames where jank is most visible. Telegram's clients do
 * the same trick — heavy animations freeze while the finger/wheel is moving
 * and resume the instant scrolling settles. One capture-phase listener
 * (scroll doesn't bubble, but it DOES capture) hears every scroller: the
 * message list, the picker grid, the page itself.
 */
let scrollGateWired = false;
let emojiScrolling = false;
let scrollIdleTimer: number | null = null;
const lottieScrollHandles = new Set<{ pause(): void; resume(): void }>();

function wireEmojiScrollGate(): void {
  if (scrollGateWired || typeof window === "undefined") return;
  scrollGateWired = true;
  window.addEventListener(
    "scroll",
    () => {
      if (!emojiScrolling) {
        emojiScrolling = true;
        for (const v of emojiVideos) v.pause();
        for (const h of lottieScrollHandles) h.pause();
      }
      if (scrollIdleTimer !== null) window.clearTimeout(scrollIdleTimer);
      scrollIdleTimer = window.setTimeout(() => {
        emojiScrolling = false;
        scrollIdleTimer = null;
        if (document.hidden) return;
        // Resume only what's actually visible: re-observing forces the IO to
        // re-report each video's intersection (same trick the
        // visibilitychange resume below uses) instead of blind-playing all.
        for (const v of Array.from(emojiVideos)) {
          if (!v.isConnected) {
            emojiVideoIO?.unobserve(v);
            emojiVideos.delete(v);
            continue;
          }
          emojiVideoIO?.unobserve(v);
          emojiVideoIO?.observe(v);
        }
        for (const h of lottieScrollHandles) h.resume();
      }, 250);
    },
    { capture: true, passive: true },
  );
}

function emojiVideoPlay(v: HTMLVideoElement): void {
  v.muted = true;
  const p = v.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

function wireEmojiVideoPlayback(): void {
  if (emojiVideoWired || typeof window === "undefined") return;
  emojiVideoWired = true;
  if (typeof IntersectionObserver !== "undefined") {
    emojiVideoIO = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = e.target as HTMLVideoElement;
          if (!v.isConnected) {
            // Unmounted node (callback refs can't unobserve for us) — drop it.
            emojiVideoIO?.unobserve(v);
            emojiVideos.delete(v);
            continue;
          }
          if (e.isIntersecting && !document.hidden && !emojiScrolling)
            emojiVideoPlay(v);
          else v.pause();
        }
      },
      { rootMargin: "100px" },
    );
  }
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      for (const v of emojiVideos) v.pause();
      return;
    }
    // Resume only what's actually visible: re-observing forces the IO to
    // re-report each video's intersection instead of blind-playing them all.
    for (const v of Array.from(emojiVideos)) {
      if (!v.isConnected) {
        emojiVideoIO?.unobserve(v);
        emojiVideos.delete(v);
        continue;
      }
      emojiVideoIO?.unobserve(v);
      emojiVideoIO?.observe(v);
    }
  });
}

function playCustomEmojiVideo(el: HTMLVideoElement | null) {
  if (!el) {
    // React calls the callback ref with null at unmount; the removed node is
    // already detached by now, so sweep every disconnected video out of the
    // registry (a module-level ref can't tell WHICH element unmounted).
    for (const v of emojiVideos) {
      if (!v.isConnected) {
        emojiVideoIO?.unobserve(v);
        emojiVideos.delete(v);
      }
    }
    return;
  }
  wireEmojiVideoPlayback();
  wireEmojiScrollGate();
  emojiVideos.add(el);
  emojiVideoIO?.observe(el);
  if (typeof document !== "undefined" && document.hidden) return;
  if (emojiScrolling) return; // the idle resume will re-report + play it
  emojiVideoPlay(el);
}

type EmojiStage =
  | { kind: "img"; src: string }
  | { kind: "video"; src: string }
  | { kind: "lottie"; src: string };

/* ── Persistent emoji media cache (Cache Storage + blob URLs) ─────────────
 * The serve route is immutable/1-year, but that alone never made repeats
 * fast: `<video>` elements go through the browser's MEDIA cache (Range
 * requests), which routinely bypasses the HTTP cache the warmer filled — so
 * every animated tile re-downloaded on every panel open/visit. This layer
 * stores the raw bytes in Cache Storage (survives reloads, unlike blob URLs)
 * and hands `<video>`/Lottie a same-session blob URL rebuilt from those
 * bytes: zero network, no Range games. Cache name embeds the emoji cache
 * version, so a `?v` bump auto-purges every stale entry. */
const EMOJI_MEDIA_CACHE = `refgd-emoji-${EMOJI_CACHE_VERSION}`;
let emojiCachePromise: Promise<Cache | null> | null = null;

function openEmojiCache(): Promise<Cache | null> {
  if (typeof window === "undefined" || typeof caches === "undefined") {
    return Promise.resolve(null);
  }
  if (!emojiCachePromise) {
    emojiCachePromise = caches
      .open(EMOJI_MEDIA_CACHE)
      .then((cache) => {
        // Sweep caches from older EMOJI_CACHE_VERSIONs in the background.
        void caches
          .keys()
          .then((keys) => {
            for (const k of keys) {
              if (k.startsWith("refgd-emoji-") && k !== EMOJI_MEDIA_CACHE) {
                void caches.delete(k);
              }
            }
          })
          .catch(() => undefined);
        return cache;
      })
      .catch(() => null);
  }
  return emojiCachePromise;
}

/** Fetch through the persistent cache: Cache Storage hit → no network;
 *  miss → network, and an OK response is stored for every later visit.
 *  Returns null on any failure (caller falls back / cascades). */
async function cachedEmojiFetch(url: string): Promise<Response | null> {
  const cache = await openEmojiCache();
  if (cache) {
    try {
      const hit = await cache.match(url);
      if (hit) return hit;
    } catch {
      /* ignore — fall through to network */
    }
  }
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    if (cache) {
      try {
        await cache.put(url, res.clone());
      } catch {
        /* quota/opaque — serve without persisting */
      }
    }
    return res;
  } catch {
    return null;
  }
}

/* Session blob-URL memo on top of the byte cache: one object URL per source
 * URL, created only for media that actually mounts near the viewport (the
 * warmer deliberately does NOT create blob URLs — thousands of them would
 * pin all pack artwork in memory). */
const emojiBlobUrls = new Map<string, string>();
const emojiBlobPending = new Map<string, Promise<string | null>>();

function emojiBlobUrl(url: string): Promise<string | null> {
  const memo = emojiBlobUrls.get(url);
  if (memo) return Promise.resolve(memo);
  let p = emojiBlobPending.get(url);
  if (!p) {
    p = (async () => {
      const res = await cachedEmojiFetch(url);
      if (!res) return null;
      try {
        const blob = await res.blob();
        if (blob.size === 0) return null;
        const existing = emojiBlobUrls.get(url);
        if (existing) return existing;
        const u = URL.createObjectURL(blob);
        emojiBlobUrls.set(url, u);
        return u;
      } catch {
        return null;
      }
    })().finally(() => emojiBlobPending.delete(url));
    emojiBlobPending.set(url, p);
  }
  return p;
}

/**
 * Blob src for an API-served emoji stage (`<video>` AND the API `<img>`
 * stage). Returns the ready object URL (instantly on repeat mounts via the
 * memo), null while the bytes load, or the ORIGINAL url when the cache path
 * fails — direct network loading is the fallback, and its onError still
 * advances the cascade. Routing the <img> stage through here matters in the
 * Telegram Mini App: its webview's plain HTTP cache is effectively
 * ephemeral, so static pack artwork re-downloaded EVERY session even though
 * the warmer had already written the bytes into persistent Cache Storage —
 * this hands the <img> those persisted bytes with zero network.
 */
function useEmojiMediaSrc(url: string | null): string | null {
  const [src, setSrc] = useState<string | null>(() =>
    url ? (emojiBlobUrls.get(url) ?? null) : null,
  );
  useEffect(() => {
    if (!url) {
      setSrc(null);
      return undefined;
    }
    const memo = emojiBlobUrls.get(url);
    if (memo) {
      setSrc(memo);
      return undefined;
    }
    setSrc(null);
    let alive = true;
    void emojiBlobUrl(url).then((u) => {
      if (alive) setSrc(u ?? url);
    });
    return () => {
      alive = false;
    };
  }, [url]);
  return src;
}

/** Bounded retry backoff for custom-emoji artwork (spreads Bot API stampedes). */
const EMOJI_RETRY_DELAYS_MS = [2000, 5000, 12000];

type LottieAnim = {
  play(): void;
  pause(): void;
  destroy(): void;
  // lottie-web extra: false = render on whole frames only (~halves CPU).
  setSubframe?(useSubFrames: boolean): void;
};
type LottieLib = {
  loadAnimation(opts: Record<string, unknown>): LottieAnim;
};

let lottieLibPromise: Promise<LottieLib | null> | null = null;

/**
 * Lazy-load the vendored Lottie renderer (public/vendor/lottie-light.min.js —
 * no npm dependency: this repo's dual lockfiles make dependency changes a
 * Render-outage risk). Loaded once, on the first Lottie emoji that scrolls
 * into view; resolves null (→ error cascade) if the script can't load.
 */
export function loadLottieLib(): Promise<LottieLib | null> {
  if (typeof window === "undefined") return Promise.resolve(null);
  if (!lottieLibPromise) {
    lottieLibPromise = new Promise((resolve) => {
      const w = window as unknown as { lottie?: LottieLib };
      if (w.lottie) {
        resolve(w.lottie);
        return;
      }
      const s = document.createElement("script");
      s.src = "/vendor/lottie-light.min.js";
      s.async = true;
      s.onload = () => resolve(w.lottie ?? null);
      s.onerror = () => {
        lottieLibPromise = null; // allow a later retry to re-attempt the load
        emojiDebugError("lottie script load FAILED");
        resolve(null);
      };
      document.head.appendChild(s);
    });
  }
  return lottieLibPromise;
}

/**
 * Animated Lottie (.tgs) custom emoji: fetches the route's inflated Lottie
 * JSON and plays it with the vendored renderer — the same way Telegram Web A
 * animates these packs. Work starts only when the tile nears the viewport
 * (IntersectionObserver) so a Lottie-heavy picker grid doesn't fetch/build
 * hundreds of players at once, and playback pauses offscreen to keep the
 * main thread cool. Any failure calls onError → the cascade's retry path.
 */
function LottieEmoji({
  id,
  src,
  alt,
  onError,
  onReady,
}: {
  /** Custom-emoji document id; unicode animated emoji have none. */
  id?: string;
  src: string;
  alt: string;
  onError: () => void;
  onReady?: () => void;
}) {
  const boxRef = useRef<HTMLSpanElement | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    let cancelled = false;
    let anim: LottieAnim | null = null;
    let started = false;
    let visible = false;
    // Scroll-idle gate registration — Lottie players pause with the videos
    // while the user is actively scrolling and resume (only the visible
    // ones) once scrolling settles.
    const scrollHandle = {
      pause: () => anim?.pause(),
      resume: () => {
        if (visible && anim) anim.play();
      },
    };
    lottieScrollHandles.add(scrollHandle);
    wireEmojiScrollGate();

    const start = async () => {
      if (started) return;
      started = true;
      try {
        emojiDebugBump("lottie:start");
        // Persistent-cache path: repeat visits parse the JSON straight from
        // Cache Storage instead of re-downloading it.
        const res = await cachedEmojiFetch(src);
        if (!res) throw new Error("fetch failed");
        const ct = res.headers.get("content-type") ?? "";
        if (!ct.includes("json")) throw new Error(`ct ${ct}`);
        emojiDebugBump("lottie:fetch-ok");
        const data: unknown = sanitizeLottieData(await res.json());
        emojiDebugBump("lottie:json-ok");
        const lottie = await loadLottieLib();
        if (!lottie) throw new Error("lottie lib unavailable");
        emojiDebugBump("lottie:lib-ok");
        if (cancelled || !boxRef.current) return;
        anim = lottie.loadAnimation({
          container: boxRef.current,
          renderer: "svg",
          loop: true,
          autoplay: true,
          animationData: data,
          rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
        });
        // Whole-frame rendering: Web A does the same — subframe interpolation
        // roughly doubles Lottie CPU for no visible gain at emoji size.
        if (typeof anim.setSubframe === "function") anim.setSubframe(false);
        // Built mid-scroll (or after scrolling away): don't start hot — the
        // idle resume / IO re-entry will play it when appropriate.
        if (emojiScrolling || !visible) anim.pause();
        emojiDebugBump("ok:lottie");
        onReadyRef.current?.();
      } catch (e) {
        emojiDebugBump("fail:lottie");
        emojiDebugError(
          `lottie …${src.slice(-28)}: ${String((e as Error)?.message ?? e)}`,
        );
        if (!cancelled) onErrorRef.current();
      }
    };

    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        if (e.isIntersecting) {
          visible = true;
          void start();
          if (anim && !emojiScrolling) anim.play();
        } else {
          visible = false;
          if (anim) anim.pause();
        }
      },
      { rootMargin: "100px" },
    );
    io.observe(box);

    return () => {
      cancelled = true;
      lottieScrollHandles.delete(scrollHandle);
      io.disconnect();
      if (anim) anim.destroy();
    };
  }, [src]);

  return (
    // data-document-id/data-alt: copying a bubble while the emoji is in its
    // Lottie stage must still serialize to a [ce:] token (editHtmlToBody
    // matches the document id on ANY element) — without them the emoji was
    // silently LOST from copied text. Unicode animated emoji carry only
    // data-alt: they round-trip as the plain character.
    <span
      ref={boxRef}
      className="emoji emoji-small tg-custom-emoji"
      role="img"
      aria-label={alt}
      data-document-id={id}
      data-alt={alt}
    />
  );
}

/**
 * Shared near-viewport latch — how Telegram Web A keeps a 2,000+ tile picker
 * usable: NOTHING downloads until its tile approaches the viewport. One
 * IntersectionObserver serves every custom-emoji tile (per-tile observers at
 * this scale are their own perf problem). The latch is one-way: once a tile
 * has been near the viewport it stays "near" (artwork is already cached).
 * Without this, every offscreen <video> stage fetched eagerly on mount —
 * hundreds of parallel downloads saturating the browser's per-origin
 * connection pool, starving ALL emoji requests (visible tiles included).
 */
const tileIOEntries = new Map<
  Element,
  { cb: () => void; io: IntersectionObserver }
>();
// Per-root observers: a root:null observer's rootMargin is CLIPPED by any
// scrolling ancestor (the picker grid is overflow-y:auto), so lookahead
// inside the grid would be ~0px and tiles would pop in exactly at the edge.
// Rooting the observer at the grid itself restores real prefetch distance.
// WeakMap so an unmounted grid frees its observer with the DOM node.
const tileIORoots = new WeakMap<Element, IntersectionObserver>();
let tileIOViewport: IntersectionObserver | null = null;

function makeTileIO(root: Element | null): IntersectionObserver {
  return new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        const entry = tileIOEntries.get(e.target);
        if (entry) {
          tileIOEntries.delete(e.target);
          entry.io.unobserve(e.target);
          entry.cb();
        }
      }
    },
    // 1000px lookahead: far enough that a fast flick-scroll can't outrun the
    // latch (tiles were mounting blank at the edge mid-scroll), still lazy
    // enough that a multi-thousand-tile picker doesn't flood the network.
    { root, rootMargin: "1000px" },
  );
}

function observeTile(el: Element, cb: () => void): void {
  if (typeof IntersectionObserver === "undefined") {
    cb();
    return;
  }
  const root = el.closest(".tg-emoji-grid");
  let io: IntersectionObserver;
  if (root) {
    io = tileIORoots.get(root) ?? makeTileIO(root);
    tileIORoots.set(root, io);
  } else {
    io = tileIOViewport ?? makeTileIO(null);
    tileIOViewport = io;
  }
  tileIOEntries.set(el, { cb, io });
  io.observe(el);
}

function unobserveTile(el: Element): void {
  const entry = tileIOEntries.get(el);
  if (entry) {
    tileIOEntries.delete(el);
    entry.io.unobserve(el);
  }
}

/**
 * Background tile warmer — the other half of Telegram Web A's "instant"
 * picker: Web A feels instant because its media is already in the client
 * cache, not because it downloads 1,000+ tiles at once. When the Custom tab's
 * pack list arrives, every tile URL is queued here and fetched a few at a
 * time; the responses land in the browser's HTTP cache (the route serves
 * immutable, 1-year), so tiles render instantly the moment they mount — and
 * on every later visit the whole picker paints from disk with zero network.
 * Low concurrency on purpose: the visible tiles' own requests always have
 * headroom (the old eager flood starved them). Deliberately KEEPS draining
 * while the tab is hidden (owner ask: emoji must be warm even when the app
 * isn't the active tab) — at 4-wide against an immutable cache this is a
 * trickle, unlike the 2.5s polling loop the tab-visibility lesson banned.
 */
const warmQueued = new Set<string>();
const warmPending: string[] = [];
let warmActive = 0;
const WARM_CONCURRENCY = 4;

function warmStep(): void {
  while (warmActive < WARM_CONCURRENCY && warmPending.length > 0) {
    const id = warmPending.shift();
    if (!id) break;
    warmActive++;
    // Warm into the PERSISTENT Cache Storage layer (cachedEmojiFetch skips
    // the network entirely for already-cached ids, so re-warms are free);
    // draining the body finishes the write without keeping anything around.
    cachedEmojiFetch(`/api/community/emoji/${id}?v=${EMOJI_CACHE_VERSION}`)
      .then((r) => (r ? r.blob().catch(() => null) : null))
      .catch(() => null)
      .then(() => {
        warmActive--;
        warmStep();
      });
  }
}

export function warmEmojiTiles(ids: string[]): void {
  if (typeof window === "undefined") return;
  for (const id of ids) {
    if (warmQueued.has(id)) continue;
    warmQueued.add(id);
    warmPending.push(id);
  }
  warmStep();
}

/**
 * Per-id resolved-stage memo (localStorage): the cascade below discovers each
 * emoji's real kind by failing forward (img → video → lottie), and an animated
 * .webm tile pays that churn — a full download decoded as an <img>, erroring,
 * then re-rendered as <video> — on EVERY mount. Remembering the winning stage
 * makes every later render jump straight to the right element: no wasted
 * decode, no blank flash. Keyed by EMOJI_CACHE_VERSION so a cache-version
 * bump (which can change what the API serves per id) restarts discovery.
 */
const STAGE_MEMO_KEY = `tg-emoji-stage-v1:${EMOJI_CACHE_VERSION}`;
let stageMemo: Record<string, number> | null = null;
let stageMemoSaveTimer: number | null = null;

function loadStageMemo(): Record<string, number> {
  if (stageMemo) return stageMemo;
  try {
    const raw = localStorage.getItem(STAGE_MEMO_KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    stageMemo =
      parsed && typeof parsed === "object"
        ? (parsed as Record<string, number>)
        : {};
  } catch {
    stageMemo = {};
  }
  return stageMemo;
}

function recallStage(id: string): number {
  if (typeof window === "undefined") return 0;
  const n = loadStageMemo()[id];
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 3
    ? n
    : 0;
}

function rememberStage(id: string, idx: number): void {
  if (typeof window === "undefined") return;
  const memo = loadStageMemo();
  if (memo[id] === idx) return;
  memo[id] = idx;
  if (stageMemoSaveTimer !== null) return; // a save is already scheduled
  stageMemoSaveTimer = window.setTimeout(() => {
    stageMemoSaveTimer = null;
    try {
      localStorage.setItem(STAGE_MEMO_KEY, JSON.stringify(loadStageMemo()));
    } catch {
      // storage full/blocked — memo stays in-memory for this session
    }
  }, 800);
}

/**
 * Build-time kind manifest (/tg-emoji/kinds-v1.json, generated from the
 * server's emoji cache): `v` = animated .webm ids, `l` = Lottie .tgs ids —
 * every OTHER cached id is a static image. Without it, a FIRST-visit Lottie
 * tile pays four sequential steps (static-webp 404 → its JSON downloaded and
 * decode-failed as <img> → again as <video> → finally the Lottie fetch), and
 * that multiplied across a picker of thousands is exactly the "emoji take
 * forever to show up" complaint. With it, every known id jumps STRAIGHT to
 * its real renderer on the very first mount — like Telegram, which knows each
 * document's type up front. Ids missing from the manifest (freshly cached
 * packs) simply keep the failing-forward cascade. Ids that have a self-hosted
 * /tg-emoji/<id>.webp file are deliberately EXCLUDED at generation time so
 * the instant static artwork keeps winning stage 0 for them.
 */
let emojiKinds: Map<string, number> | null = null;
let emojiKindsStarted = false;
const emojiKindsWaiters = new Set<() => void>();

function ensureEmojiKinds(): void {
  if (emojiKindsStarted || typeof window === "undefined") return;
  emojiKindsStarted = true;
  fetch("/tg-emoji/kinds-v2.json")
    .then((r) => (r.ok ? (r.json() as Promise<unknown>) : null))
    .then((j) => {
      const m = new Map<string, number>();
      if (j && typeof j === "object") {
        const { v, l } = j as { v?: unknown; l?: unknown };
        if (Array.isArray(v)) {
          for (const id of v) if (typeof id === "string") m.set(id, 2);
        }
        if (Array.isArray(l)) {
          for (const id of l) if (typeof id === "string") m.set(id, 3);
        }
      }
      emojiKinds = m;
      for (const w of emojiKindsWaiters) w();
      emojiKindsWaiters.clear();
    })
    .catch(() => {
      // Manifest unavailable — the cascade still resolves every tile.
      emojiKinds = new Map();
      for (const w of emojiKindsWaiters) w();
      emojiKindsWaiters.clear();
    });
}

/** Known direct stage for an id (0 if unknown), or null while still loading. */
function emojiKindStage(id: string): number | null {
  return emojiKinds ? (emojiKinds.get(id) ?? 0) : null;
}

/** Run cb once the manifest resolves (immediately if it already has). */
function onEmojiKinds(cb: () => void): () => void {
  if (emojiKinds) {
    cb();
    return () => {};
  }
  emojiKindsWaiters.add(cb);
  return () => emojiKindsWaiters.delete(cb);
}

/* Content-type probe for ids the BUILD-TIME manifest doesn't know — packs
 * taught (bot DM / paste discovery) AFTER the last deploy. One GET against
 * the immutable serve route classifies the document by mime; the bytes land
 * in the browser HTTP cache, so the follow-up ceLottie fetch / <video> load
 * is free. The verdict is written into emojiKinds so every later resolve —
 * and every later-mounted bubble tile — jumps straight to the right
 * renderer. Fail-soft: a miss/error answers "img" WITHOUT caching the
 * probe, so a rate-limit blip never pins a fresh animated pack static. */
const emojiKindProbes = new Map<string, Promise<number>>();
function probeEmojiKind(id: string): Promise<number> {
  let p = emojiKindProbes.get(id);
  if (!p) {
    p = fetch(`/api/community/emoji/${id}?v=${EMOJI_CACHE_VERSION}`)
      .then((r) => {
        if (!r.ok) {
          emojiKindProbes.delete(id);
          return 0;
        }
        const ct = r.headers.get("content-type") ?? "";
        const stage = ct.includes("video") ? 2 : ct.includes("json") ? 3 : 1;
        emojiKinds?.set(id, stage);
        return stage;
      })
      .catch(() => {
        emojiKindProbes.delete(id);
        return 0;
      });
    emojiKindProbes.set(id, p);
  }
  return p;
}

/**
 * Public kind resolver for the EDIT surfaces (editHtml.ts): reports whether
 * an id is a known video (.webm) / Lottie (.tgs) pack emoji once the kinds
 * manifest loads (immediately when already cached). Ids missing from the
 * manifest (freshly taught packs) are resolved by a one-shot content-type
 * probe against the serve route — without it, a pack imported after the
 * last deploy rendered as the static alt glyph in the composer until the
 * next manifest regeneration.
 */
export function resolveEmojiKind(
  id: string,
  cb: (kind: "img" | "video" | "lottie") => void,
): void {
  ensureEmojiKinds();
  onEmojiKinds(() => {
    const s = emojiKindStage(id) ?? 0;
    if (s === 0 && /^\d{1,32}$/.test(id)) {
      void probeEmojiKind(id).then((p) =>
        cb(p === 2 ? "video" : p === 3 ? "lottie" : "img"),
      );
      return;
    }
    cb(s === 2 ? "video" : s === 3 ? "lottie" : "img");
  });
}

/**
 * Custom (premium pack) emoji sticker rendered from the Telegram document id.
 *
 * ORIGINALS ONLY — NEVER SUBSTITUTE: the tile always shows the real pack
 * artwork (owner requirement). Source cascade: self-hosted webp (/tg-emoji,
 * only some ids) → /api/community/emoji <img> (static packs) → <video>
 * (animated .webm packs) → Lottie player (animated .tgs packs, exactly how
 * Telegram Web A renders them). When every stage fails (Bot API hiccup/rate
 * limit during a cache re-warm), the tile RETRIES the API with backoff
 * (`&r=N` busts any negative cache) instead of swapping in an Apple-sprite
 * lookalike — a generic sprite reads as the WRONG emoji next to pack artwork.
 * While waiting (and after giving up) it renders a transparent placeholder,
 * never a substitute glyph.
 *
 * Blank-emoji traps handled: (1) an SSR-emitted <img> whose 404/decode error
 * fires before hydration wires up onError — a mount effect re-checks
 * `complete && naturalWidth === 0` and advances the cascade; (2) the cascade
 * resets whenever `id`/`alt` changes so a recycled node re-tries artwork
 * instead of inheriting the previous emoji's exhausted state; (3) the API
 * itself 404s known-blank alpha-only thumbnails so a "successful" load can no
 * longer paint an invisible image.
 */
export function CustomEmojiImg({
  id,
  alt,
  preferAnimated,
}: {
  id: string;
  alt: string;
  /**
   * Skip the self-hosted static webp (stage 0) and resolve the REAL pack
   * document via the API cascade instead. Some animated pack emoji have a
   * static still that is genuinely DIFFERENT artwork (the Duck-pack ✈️
   * still is a plain plane; the duck only appears in the animation), so
   * surfaces like topic icons opt in to the animated original.
   */
  preferAnimated?: boolean;
}) {
  // Near-viewport latch (see observeTile above): render an empty box and
  // download NOTHING until this tile approaches the viewport — exactly how
  // Telegram Web A survives multi-thousand-tile pickers.
  const [near, setNear] = useState(false);
  const nearRef = useRef(false);
  const observedRef = useRef<HTMLSpanElement | null>(null);
  const holderRef = useCallback((el: HTMLSpanElement | null) => {
    if (observedRef.current && observedRef.current !== el) {
      unobserveTile(observedRef.current);
    }
    observedRef.current = el;
    if (el && !nearRef.current) {
      observeTile(el, () => {
        nearRef.current = true;
        setNear(true);
      });
    }
  }, []);
  const [attempt, setAttempt] = useState(0);
  // Each stage only advances on error (never loops back): self-hosted webp →
  // API image → API video → API Lottie (fetch + vendored player). The ?v
  // (EMOJI_CACHE_VERSION) busts BOTH the immutable browser/CDN cache AND the
  // Postgres cache (the route versions its cache key by ?v), so ids cached as
  // a low-res STATIC thumbnail under the old fileId logic get re-fetched as
  // the real original document (.webm for video packs, Lottie JSON for
  // animated packs, full sticker for static packs) instead of forever
  // serving the old still.
  const stages = useMemo<EmojiStage[]>(() => {
    const retry = attempt > 0 ? `&r=${attempt}` : "";
    const api = `/api/community/emoji/${id}?v=${EMOJI_CACHE_VERSION}${retry}`;
    return [
      { kind: "img", src: `/tg-emoji/${id}.webp` },
      { kind: "img", src: api },
      { kind: "video", src: api },
      { kind: "lottie", src: api },
    ];
  }, [id, attempt]);
  const [idx, setIdx] = useState(0);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const attemptRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  // Restart whenever this node is reused for a new emoji — at the remembered
  // winning stage when we've resolved this id before (instant, no cascade
  // churn), else at the manifest-known stage for its real kind (video/Lottie
  // ids skip the doomed webp/img attempts entirely on FIRST visit), else at
  // the artwork source. Recall happens here (post-hydration) rather than in
  // the useState initializer so SSR markup can't mismatch. If the manifest
  // is still in flight, subscribe and fast-forward when it lands — never
  // backwards, so a tile that already cascaded ahead keeps its progress.
  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    attemptRef.current = 0;
    setAttempt(0);
    ensureEmojiKinds();
    const known = emojiKindStage(id);
    // preferAnimated floors the cascade at the API stages — the self-hosted
    // static still (stage 0) is never shown even when the file exists.
    const floor = preferAnimated ? 1 : 0;
    setIdx(Math.max(recallStage(id), known ?? 0, floor));
    if (known !== null) return;
    return onEmojiKinds(() =>
      setIdx((i) => Math.max(i, emojiKindStage(id) ?? 0)),
    );
  }, [id, alt, preferAnimated]);

  useEffect(
    () => () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const advance = () =>
    setIdx((i) => {
      const failed = stages[i] as EmojiStage | undefined;
      if (failed && failed.kind !== "lottie") {
        // Lottie failures are already counted (with reasons) in LottieEmoji.
        emojiDebugBump(`fail:${failed.kind}${i === 0 ? ":self" : ""}`);
      }
      if (i >= stages.length - 1) emojiDebugBump("exhausted");
      if (i < stages.length - 1) return i + 1;
      // All artwork stages failed. Schedule a bounded backoff retry back at
      // the API image stage; meanwhile render the transparent placeholder.
      const a = attemptRef.current;
      if (a < EMOJI_RETRY_DELAYS_MS.length && timerRef.current === null) {
        timerRef.current = window.setTimeout(() => {
          timerRef.current = null;
          attemptRef.current = a + 1;
          setAttempt(a + 1);
          setIdx(1);
        }, EMOJI_RETRY_DELAYS_MS[a]);
      }
      return stages.length;
    });

  // Catch a decode error that fired before hydration attached onError. Only the
  // <img> stages set imgRef; React nulls it out when the <img> unmounts, so a
  // <video>/placeholder render can't act on a stale detached node.
  useEffect(() => {
    const el = imgRef.current;
    if (el && el.complete && el.naturalWidth === 0) advance();
    // advance is stable enough; only re-run when the shown source changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idx, attempt]);

  // Resolved BEFORE the early returns so the media blob hook below runs on
  // every render (hooks rule); it's a no-op (null url) until the tile is
  // near and its cascade sits at an API-served stage. Covers the video
  // stage AND the API <img> stage (both go through the persistent Cache
  // Storage layer); the self-hosted webp stage (idx 0) keeps a direct src —
  // a blob path would double-fetch its common 404 before cascading.
  const stage = near ? (stages[idx] as EmojiStage | undefined) : undefined;
  const mediaSrc = useEmojiMediaSrc(
    stage && (stage.kind === "video" || (stage.kind === "img" && idx >= 1))
      ? stage.src
      : null,
  );

  // Both placeholder spans carry data-document-id/data-alt so copying a
  // bubble mid-load still round-trips the [ce:] token (same reason as the
  // LottieEmoji span — the serializer matches the id on any element).
  if (!near) {
    return (
      <span
        ref={holderRef}
        className="emoji emoji-small tg-custom-emoji"
        role="img"
        aria-label={alt}
        data-document-id={id}
        data-alt={alt}
      />
    );
  }
  if (!stage) {
    // Waiting for a retry (or exhausted): hold the emoji's box, show nothing —
    // never a substitute glyph.
    return (
      <span
        className="emoji emoji-small tg-custom-emoji"
        role="img"
        aria-label={alt}
        data-document-id={id}
        data-alt={alt}
      />
    );
  }
  if (stage.kind === "lottie") {
    return (
      <LottieEmoji
        id={id}
        src={stage.src}
        alt={alt}
        onError={advance}
        onReady={() => rememberStage(id, 3)}
      />
    );
  }
  if (stage.kind === "video") {
    if (!mediaSrc) {
      // Blob still building from Cache Storage / network — hold the box.
      return (
        <span
          className="emoji emoji-small tg-custom-emoji"
          role="img"
          aria-label={alt}
          data-document-id={id}
          data-alt={alt}
        />
      );
    }
    return (
      <video
        ref={playCustomEmojiVideo}
        src={mediaSrc}
        className="emoji emoji-small tg-custom-emoji"
        data-document-id={id}
        data-alt={alt}
        autoPlay
        loop
        muted
        playsInline
        draggable={false}
        onLoadedData={() => {
          emojiDebugBump("ok:video");
          rememberStage(id, 2);
        }}
        onError={advance}
      />
    );
  }
  // API <img> stage: paint from the persistent Cache Storage blob (repeat
  // visits skip the network entirely — the Mini-App webview's HTTP cache is
  // ephemeral, so a direct src re-downloaded every session). While the blob
  // builds, hold the box exactly like the video stage; on cache failure
  // mediaSrc falls back to the original URL and onError still cascades.
  const imgSrc = idx >= 1 ? mediaSrc : stage.src;
  if (!imgSrc) {
    return (
      <span
        className="emoji emoji-small tg-custom-emoji"
        role="img"
        aria-label={alt}
        data-document-id={id}
        data-alt={alt}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={imgSrc}
      className="emoji emoji-small tg-custom-emoji"
      alt={alt}
      data-document-id={id}
      draggable={false}
      // Deliberately NOT loading="lazy": the near-viewport latch above already
      // gates the mount, and lazy added a SECOND browser gate that deferred
      // the fetch again until the tile hit the viewport edge — that (not
      // download speed) was the blank-while-scrolling flash, since the bytes
      // are usually already in the HTTP cache from the warmer. decoding=async
      // keeps the decode off the scroll's critical path.
      decoding="async"
      onLoad={() => {
        emojiDebugBump(idx === 0 ? "ok:img:self" : "ok:img");
        rememberStage(id, idx === 0 ? 0 : 1);
      }}
      onError={advance}
    />
  );
}

/** Text segment with URLs linkified + Apple emoji (no custom-emoji tokens). */
function renderLinkified(
  body: string,
  keyPrefix: string,
  animated = false,
): ReactNode[] {
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
          animated,
        ),
      );
    }
    const raw = match[0];
    if (/^@everyone$/i.test(raw)) {
      out.push(
        <span key={`${keyPrefix}l${k}`} className="text-entity-mention">
          {raw}
        </span>,
      );
    } else if (/^@refundgod$/i.test(raw)) {
      out.push(
        <a
          key={`${keyPrefix}l${k}`}
          className="text-entity-link"
          href="https://t.me/refundgod"
          target="_blank"
          rel="noopener noreferrer"
        >
          {raw}
        </a>,
      );
    } else {
      const href = raw.startsWith("http") ? raw : `https://${raw}`;
      out.push(
        <a
          key={`${keyPrefix}l${k}`}
          className="text-entity-link"
          href={href}
          target="_blank"
          rel="noopener noreferrer"
        >
          {raw}
        </a>,
      );
    }
    last = match.index + raw.length;
    k += 1;
  }
  if (last < body.length) {
    out.push(
      ...renderTextWithEmoji(body.slice(last), `${keyPrefix}s${k}`, animated),
    );
  }
  return out;
}

/* ── Inline markdown-lite (Web A TextFormatter output) ──────────────
 * The composer stays plain text; the floating TextFormatter wraps the
 * selection in these lightweight markers, and this parser turns them back
 * into styled spans on render. Deliberately small (not full markdown):
 * bold, strike, underline, italic, spoiler, monospace and [text](url).
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
    re: /\+\+([\s\S]+?)\+\+/,
    mode: "recurse",
    wrap: (key, kids) => <u key={key}>{kids}</u>,
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
      <a
        key={key}
        className="text-entity-link"
        href={m[2]}
        target="_blank"
        rel="noopener noreferrer"
      >
        {kids}
      </a>
    ),
  },
];

/**
 * Parse a text segment for inline markdown-lite tokens, falling back to
 * URL-linkified + emoji text for the runs between tokens.
 */
function renderInline(
  text: string,
  keyPrefix: string,
  animated = false,
): ReactNode[] {
  let best: { rule: InlineRule; m: RegExpExecArray } | null = null;
  for (const rule of INLINE_RULES) {
    const m = new RegExp(rule.re.source).exec(text);
    if (m && (best === null || m.index < best.m.index)) best = { rule, m };
  }
  if (best === null) return renderLinkified(text, keyPrefix, animated);
  const { rule, m } = best;
  const out: ReactNode[] = [];
  if (m.index > 0) {
    out.push(
      ...renderLinkified(text.slice(0, m.index), `${keyPrefix}p`, animated),
    );
  }
  const inner = m[1];
  const kids: ReactNode =
    rule.mode === "recurse"
      ? renderInline(inner, `${keyPrefix}i`, animated)
      : rule.mode === "emoji"
        ? renderTextWithEmoji(inner, `${keyPrefix}i`, animated)
        : inner;
  out.push(rule.wrap(`${keyPrefix}t`, kids, m));
  const rest = text.slice(m.index + m[0].length);
  if (rest) out.push(...renderInline(rest, `${keyPrefix}r`, animated));
  return out;
}

/** `[ce:<documentId>:<alt>]` — custom emoji token written by the composer. */
const CE_RE = /\[ce:(\d+):([^\]]+)\]/g;

/** Server-composed @Display-Name mention token — see rewriteMentions() in
 *  lib/community.ts. Rendered as a Web-A blue mention; previews collapse it
 *  back to `@Name` (exactly one `@`, even when the display name has its own,
 *  like the owner's "@RefundGod"). */
const M_RE = /\[m:(\d+):([^\]\n]{1,64})\]/g;

export function mentionLabel(name: string): string {
  return name.startsWith("@") ? name : `@${name}`;
}

/** `[voice:<mediaId>:<durSec>:<waveform>]` — server-composed voice note body. */
const VOICE_TOKEN_RE = /^\[voice:(\d+):(\d+):([0-9a-v]{0,64})\]$/;

/** `[poll:<id>]` — server-composed poll message body. */
const POLL_TOKEN_RE = /^\[poll:(\d+)\]$/;

export function parseVoiceToken(
  body: string,
): { mediaId: string; duration: number; waveform: string } | null {
  const m = VOICE_TOKEN_RE.exec(body.trim());
  if (!m) return null;
  return { mediaId: m[1], duration: Number(m[2]), waveform: m[3] };
}

export function parsePollToken(body: string): string | null {
  const m = POLL_TOKEN_RE.exec(body.trim());
  return m ? m[1] : null;
}

/**
 * A message whose body is EXACTLY one custom-emoji token renders as a jumbo
 * "video sticker" (no bubble, big artwork) — Web A's single-emoji treatment.
 */
export function isSingleCustomEmoji(
  body: string,
): { id: string; alt: string } | null {
  const m = /^\[ce:(\d+):([^\]]+)\]$/.exec(body.trim());
  return m ? { id: m[1], alt: m[2] } : null;
}

/**
 * Human preview for token bodies — topic-list rows, reply embeds, copy text
 * and notifications must never show a raw `[voice:…]`/`[poll:…]` token.
 */
export function tokenPreview(body: string): string {
  const b = body.trim();
  if (VOICE_TOKEN_RE.test(b)) return "🎤 Voice message";
  if (POLL_TOKEN_RE.test(b)) return "📊 Poll";
  const single = isSingleCustomEmoji(b);
  if (single) return `${single.alt} Sticker`;
  // Rose-style buttonurl tokens collapse to their label in previews;
  // blockquote `> ` markers are highlight styling, not preview text.
  // Custom-emoji tokens collapse to their alt glyph and inline `[text](url)`
  // links to their label so topic-list rows and reply embeds never show a
  // raw `[ce:…]` or markdown-link token.
  return body
    .replace(BUTTON_URL_RE, "$1")
    .replace(CE_RE, "$2")
    .replace(M_RE, (_all, _id, name: string) => mentionLabel(name))
    .replace(/\[([^\]]+?)\]\((?:https?:\/\/)[^\s)]+\)/g, "$1")
    .replace(/^>(?: |$)/gm, "")
    // Bold/italic markers are formatting, not preview text (Web A previews
    // show the plain words) — strip the delimiters, keep the content.
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .trim();
}

/* ── Rose-style `[LABEL](buttonurl://url)` inline buttons ────────────
 * Telegram bots (Rose, etc.) attach URL buttons under a message with this
 * exact markdown-ish token. We render them the way Telegram Web A renders
 * bot inline keyboards: full-width rounded buttons UNDER the text, one per
 * row, with `:same` appending a button to the previous row.
 */
const BUTTON_URL_RE =
  /\[([^\]\n]{1,64})\]\(buttonurl:\/\/([^\s)]+?)(:same)?\)/g;

interface BodyButton {
  label: string;
  url: string;
  sameRow: boolean;
}

/** Pull buttonurl tokens out of a body; returns leftover text + buttons. */
function extractBodyButtons(body: string): {
  text: string;
  buttons: BodyButton[];
} {
  const buttons: BodyButton[] = [];
  BUTTON_URL_RE.lastIndex = 0;
  const text = body
    .replace(BUTTON_URL_RE, (_all, label: string, url: string, same) => {
      buttons.push({
        label: label.trim(),
        url: url.trim(),
        sameRow: Boolean(same),
      });
      return "";
    })
    // Collapse the blank lines the removed tokens leave behind.
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return { text, buttons };
}

/** buttonurl target → safe href. Bare hosts get https://; local paths pass. */
function buttonHref(url: string): { href: string; external: boolean } {
  if (/^https?:\/\//i.test(url)) return { href: url, external: true };
  // Protocol-relative `//evil.com` would otherwise pass the `/` internal
  // check below and render as a trusted same-tab link — force it external.
  if (url.startsWith("//")) {
    return { href: `https:${url}`, external: true };
  }
  if (url.startsWith("/") || url.startsWith("#")) {
    return { href: url, external: false };
  }
  return { href: `https://${url}`, external: true };
}

function renderButtonRows(buttons: BodyButton[]): ReactNode {
  const rows: BodyButton[][] = [];
  for (const b of buttons) {
    if (b.sameRow && rows.length > 0) rows[rows.length - 1].push(b);
    else rows.push([b]);
  }
  return (
    <div className="tg-btn-rows" key="tg-btns">
      {rows.map((row, ri) => (
        <div className="tg-btn-row" key={`r${ri}`}>
          {row.map((b, bi) => {
            const { href, external } = buttonHref(b.url);
            return (
              <a
                key={`b${bi}`}
                className="Button tiny primary has-ripple no-upper-case tg-msg-btn"
                href={href}
                {...(external
                  ? { target: "_blank", rel: "noopener noreferrer" }
                  : {})}
              >
                <span className="tg-btn-label">
                  {renderTextWithEmoji(b.label, `btn${ri}-${bi}`)}
                </span>
              </a>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/**
 * Welcome-message placeholders (Rose parity): {first} → the viewer's first
 * name, {chatname} → the community's display name. Case-insensitive.
 */
export function applyWelcomePlaceholders(
  body: string,
  firstName?: string | null,
): string {
  const first = (firstName ?? "").trim().split(/\s+/)[0] || "friend";
  return body
    .replace(/\{first\}/gi, first)
    .replace(/\{chatname\}/gi, "RefundGod Law Firm");
}

/**
 * Body text with custom-emoji tokens, linkified URLs and Apple emoji
 * (React escapes the rest).
 */
export function renderBody(body: string): ReactNode {
  if (!body) return null;
  // Rose-style buttonurl pre-pass: pull the button tokens out first so the
  // inline [text](url) rule never sees them, then append Web-A-style button
  // rows under the remaining text.
  const { text: bodyText, buttons } = extractBodyButtons(body);
  // Blockquote pre-pass: consecutive `> `-prefixed lines become a Web-A-style
  // highlighted quote block (vendored bare-`blockquote` element rules in
  // tg-webapp.css supply the accent box). Everything else flows through the
  // usual custom-emoji + inline pipeline unchanged.
  const out: ReactNode[] = [];
  const lines = bodyText.split("\n");
  let text: string[] = [];
  let quote: string[] = [];
  let seg = 0;
  const flushText = () => {
    if (text.length === 0) return;
    out.push(...renderRich(text.join("\n"), `s${seg}`));
    seg += 1;
    text = [];
  };
  const flushQuote = () => {
    if (quote.length === 0) return;
    out.push(
      <blockquote key={`q${seg}`} className="tg-quote">
        {renderRich(quote.join("\n"), `q${seg}`)}
      </blockquote>,
    );
    seg += 1;
    quote = [];
  };
  for (const line of lines) {
    // "> foo" or a bare ">" (empty quote line — trailing spaces get stripped
    // upstream). A ">"-prefix WITHOUT the space must not match, or historical
    // emoticon lines like ">.<" would be restyled as quotes.
    const m = /^>(?: (.*))?$/.exec(line);
    if (m) {
      flushText();
      quote.push(m[1] ?? "");
    } else {
      flushQuote();
      text.push(line);
    }
  }
  flushText();
  flushQuote();
  if (buttons.length > 0) out.push(renderButtonRows(buttons));
  return out;
}

/** Custom-emoji tokens + inline markdown for one text segment.
 *  Every renderBody surface is a message bubble (chat, vouches, seeds), so
 *  bare standard emoji render ANIMATED here — Telegram's official artwork
 *  with a same-glyph static-sprite fallback. This is also the only cure for
 *  historical messages whose premium-emoji entities were lost at ingestion:
 *  their bare 🛒/🌟/📝 now animate instead of sitting as static sprites. */
function renderRich(bodyText: string, keyPrefix: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  // Fresh combined scanner per call (module-level /g regexes share lastIndex
  // across re-entrant renders): custom-emoji tokens AND mention tokens in one
  // left-to-right pass so ordering between them is preserved.
  const richRe = new RegExp(`${CE_RE.source}|${M_RE.source}`, "g");
  let k = 0;
  while ((match = richRe.exec(bodyText)) !== null) {
    if (match.index > last) {
      out.push(
        ...renderInline(
          bodyText.slice(last, match.index),
          `${keyPrefix}c${k}`,
          true,
        ),
      );
    }
    if (match[1] !== undefined) {
      out.push(
        <CustomEmojiImg
          key={`${keyPrefix}ce${k}`}
          id={match[1]}
          alt={match[2]}
        />,
      );
    } else {
      out.push(
        <span key={`${keyPrefix}m${k}`} className="text-entity-mention">
          {mentionLabel(match[4])}
        </span>,
      );
    }
    last = match.index + match[0].length;
    k += 1;
  }
  if (last < bodyText.length) {
    out.push(...renderInline(bodyText.slice(last), `${keyPrefix}c${k}`, true));
  }
  return out;
}
