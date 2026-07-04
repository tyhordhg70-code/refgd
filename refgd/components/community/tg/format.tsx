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
 * Force muted + play on mount so an animated custom-emoji <video> autoplays:
 * React drops the `muted` attribute during SSR, which otherwise blocks autoplay
 * until hydration (same trick the member-avatar video uses).
 */
function playCustomEmojiVideo(el: HTMLVideoElement | null) {
  if (!el) return;
  el.muted = true;
  const p = el.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

type EmojiStage =
  | { kind: "img"; src: string }
  | { kind: "video"; src: string }
  | { kind: "lottie"; src: string };

/** Bounded retry backoff for custom-emoji artwork (spreads Bot API stampedes). */
const EMOJI_RETRY_DELAYS_MS = [2000, 5000, 12000];

type LottieAnim = { play(): void; pause(): void; destroy(): void };
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
function loadLottieLib(): Promise<LottieLib | null> {
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
  src,
  alt,
  onError,
}: {
  src: string;
  alt: string;
  onError: () => void;
}) {
  const boxRef = useRef<HTMLSpanElement | null>(null);
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return undefined;
    let cancelled = false;
    let anim: LottieAnim | null = null;
    let started = false;

    const start = async () => {
      if (started) return;
      started = true;
      try {
        emojiDebugBump("lottie:start");
        const res = await fetch(src);
        if (!res.ok) throw new Error(`http ${res.status}`);
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
        emojiDebugBump("ok:lottie");
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
          void start();
          if (anim) anim.play();
        } else if (anim) {
          anim.pause();
        }
      },
      { rootMargin: "100px" },
    );
    io.observe(box);

    return () => {
      cancelled = true;
      io.disconnect();
      if (anim) anim.destroy();
    };
  }, [src]);

  return (
    <span
      ref={boxRef}
      className="emoji emoji-small tg-custom-emoji"
      role="img"
      aria-label={alt}
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
    { root, rootMargin: "600px" },
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
 * headroom (the old eager flood starved them). Pauses while the tab is
 * hidden (background tabs must not hammer the API — see the tab-visibility
 * lesson) and resumes on visibilitychange.
 */
const warmQueued = new Set<string>();
const warmPending: string[] = [];
let warmActive = 0;
let warmListenerWired = false;
const WARM_CONCURRENCY = 4;

function warmStep(): void {
  if (typeof document !== "undefined" && document.hidden) return;
  while (warmActive < WARM_CONCURRENCY && warmPending.length > 0) {
    const id = warmPending.shift();
    if (!id) break;
    warmActive++;
    fetch(`/api/community/emoji/${id}?v=${EMOJI_CACHE_VERSION}`)
      .then((r) => (r.ok ? r.blob() : null))
      .catch(() => null)
      .then(() => {
        warmActive--;
        warmStep();
      });
  }
}

export function warmEmojiTiles(ids: string[]): void {
  if (typeof window === "undefined") return;
  if (!warmListenerWired) {
    warmListenerWired = true;
    document.addEventListener("visibilitychange", () => {
      if (!document.hidden) warmStep();
    });
  }
  for (const id of ids) {
    if (warmQueued.has(id)) continue;
    warmQueued.add(id);
    warmPending.push(id);
  }
  warmStep();
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
export function CustomEmojiImg({ id, alt }: { id: string; alt: string }) {
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

  // Restart at the artwork source whenever this node is reused for a new emoji.
  useEffect(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    attemptRef.current = 0;
    setAttempt(0);
    setIdx(0);
  }, [id, alt]);

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

  if (!near) {
    return (
      <span
        ref={holderRef}
        className="emoji emoji-small tg-custom-emoji"
        role="img"
        aria-label={alt}
      />
    );
  }
  const stage = stages[idx] as EmojiStage | undefined;
  if (!stage) {
    // Waiting for a retry (or exhausted): hold the emoji's box, show nothing —
    // never a substitute glyph.
    return (
      <span
        className="emoji emoji-small tg-custom-emoji"
        role="img"
        aria-label={alt}
      />
    );
  }
  if (stage.kind === "lottie") {
    return <LottieEmoji src={stage.src} alt={alt} onError={advance} />;
  }
  if (stage.kind === "video") {
    return (
      <video
        ref={playCustomEmojiVideo}
        src={stage.src}
        className="emoji emoji-small tg-custom-emoji"
        autoPlay
        loop
        muted
        playsInline
        draggable={false}
        onLoadedData={() => emojiDebugBump("ok:video")}
        onError={advance}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      ref={imgRef}
      src={stage.src}
      className="emoji emoji-small tg-custom-emoji"
      alt={alt}
      draggable={false}
      loading="lazy"
      onLoad={() => emojiDebugBump(idx === 0 ? "ok:img:self" : "ok:img")}
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
