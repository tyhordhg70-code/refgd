"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import EditableText from "@/components/EditableText";
import reviewsData from "@/data/shop-reviews.json";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";
import { isMobileLike } from "@/lib/iosCheck";

type Review = {
  id: string;
  postNum: number;
  date: string;
  author: string;
  rank: string;
  country: string;
  posts: number;
  thanks: number;
  activity: string;
  longevity: string;
  bucket: string;
  title?: string | null;
  quote?: { author: string; text: string } | null;
  body: string;
  avatar?: string | null;
  thankers?: string[] | null;
  lastEdited?: string | null;
};

const VOUCHES_EVENT = "open-vouches";

/** Fire from anywhere (FAB, buttons, nav) to pop the vouches thread. */
export function openVouches() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(VOUCHES_EVENT));
  }
}

/**
 * Subscribe to whether the vouches modal is open. Background layers (the liquid
 * blobs, the floating category cards, the hero glow) use this to freeze their
 * animations while the modal is open, so the modal's desktop backdrop-blur stays
 * cheap and smooth — it composites over a static scene instead of re-blurring a
 * fully animated page every frame (which previously pegged the GPU compositor).
 */
export function useVouchesOpen(): boolean {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onVis = (e: Event) =>
      setOpen(!!(e as CustomEvent<{ open?: boolean }>).detail?.open);
    window.addEventListener("vouches:visibility", onVis as EventListener);
    return () =>
      window.removeEventListener("vouches:visibility", onVis as EventListener);
  }, []);
  return open;
}

/* ---- Ordering ----------------------------------------------------------
   No shuffle. Posts render as a proper in-order discussion thread
   (chronological by postNum), with genuine vouches/testimonials floated to
   the front so the first pages focus on feedback rather than random Q&A. */
const POSITIVE = [
  "thank", "worth", "recommend", "amazing", "awesome", "best", "love",
  "grateful", "legit", "happy", "glad", "excellent", "highly", "great book",
  "life saver", "lifesaver", "game changer", "incredible", "perfect",
  "satisfied", "blessing", "worth it", "well worth", "a++", "5 star",
  "five star", "real deal",
];
function vouchScore(body: string): number {
  const b = body.toLowerCase();
  let s = 0;
  for (const w of POSITIVE) if (b.includes(w)) s++;
  if (/anyone know|how do i|how can i|need help|any advice|having (a |an )?(problem|issue)|not sure if|does anyone/.test(b)) s -= 2;
  return s;
}
function orderReviews(arr: Review[]): Review[] {
  return [...arr].sort((a, b) => {
    const av = vouchScore(a.body) >= 1 ? 1 : 0;
    const bv = vouchScore(b.body) >= 1 ? 1 : 0;
    if (av !== bv) return bv - av;
    return a.postNum - b.postNum;
  });
}

// Two word pools that combine into NAME_A.length × NAME_B.length distinct
// handles. The old design used a fixed list of 30 names, so once a post's
// thank count exceeded 30 the chip list dead-ended on a static, unclickable
// "and N others". With ~1,500 generatable combos the list can keep expanding
// to cover any realistic thank count, so every remaining thanker is reachable
// through a clickable "+ N more" button instead.
const NAME_A = [
  "stealth", "ebay", "flip", "nova", "silent", "gold", "phantom", "retail",
  "box", "aged", "vcc", "drop", "refund", "opsec", "gray", "pay", "anon",
  "swift", "cold", "hustle", "lowkey", "bank", "ghost", "profit", "quiet",
  "comeback", "shadow", "rapid", "prime", "vault", "cyber", "night", "apex",
  "zen", "iron", "lucky", "turbo", "mega", "ultra", "slick", "crimson",
  "frost", "onyx", "echo", "drift", "blaze", "probe", "stackz", "fade", "wire",
];
const NAME_B = [
  "king", "queen", "master", "seller", "buyer", "ninja", "guru", "owl",
  "money", "ship", "storage", "roll", "fox", "wolf", "hawk", "ace", "pro",
  "jr", "hd", "tx", "x", "z", "99", "77", "io", "hq", "2k", "zero", "labs",
  "club",
];
// Hard cap on rendered chips so a post with a huge thank count can never try
// to materialise thousands of DOM nodes.
const MAX_THANKERS = 300;

/**
 * Deterministic, guaranteed-terminating list of named thankers covering up to
 * `count` handles (capped at MAX_THANKERS). Genuine usernames from the thread
 * come first, then a seeded Fisher-Yates walk over the NAME_A×NAME_B combo
 * space fills the remainder, deduped. Because the pool can reach `count`, the
 * UI no longer strands users behind an unclickable "and N others".
 */
function buildThankers(seed: number, count: number, real?: string[] | null): string[] {
  const target = Math.min(Math.max(0, count), MAX_THANKERS);
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (raw: string) => {
    if (out.length >= target) return;
    const name = raw.startsWith("@") ? raw : `@${raw}`;
    const k = name.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    out.push(name);
  };
  if (real) for (const r of real) push(r);
  if (out.length < target) {
    const total = NAME_A.length * NAME_B.length;
    const order = Array.from({ length: total }, (_, i) => i);
    let s = (seed * 2654435761) >>> 0;
    for (let i = order.length - 1; i > 0; i--) {
      s = (s * 1103515245 + 12345) >>> 0;
      const j = s % (i + 1);
      [order[i], order[j]] = [order[j], order[i]];
    }
    for (const combo of order) {
      if (out.length >= target) break;
      const a = NAME_A[combo % NAME_A.length];
      const b = NAME_B[Math.floor(combo / NAME_A.length) % NAME_B.length];
      push(`${a}${b}`);
    }
  }
  return out;
}

// Build a username → real avatar URL lookup from the imported reviews so that
// when a review author (e.g. "refundgod") appears as a thanker chip, we can
// show their actual forum profile picture instead of a generated DiceBear one.
const AUTHOR_AVATAR_MAP: Record<string, string> = {};
for (const r of reviewsData as Review[]) {
  if (r.author && r.avatar) {
    AUTHOR_AVATAR_MAP[r.author.replace(/^@/, "").toLowerCase()] = r.avatar;
  }
}

// Pool of every genuine forum avatar referenced anywhere in the reviews data.
// Thanker chips are mostly forum users who never authored a review, so they
// have no direct avatar match — instead of falling back to a cartoon DiceBear
// face we assign each one a real forum photo deterministically (by username
// hash), so every chip shows an authentic-looking profile picture.
const REAL_AVATAR_POOL: string[] = Array.from(
  new Set(
    (reviewsData as Review[])
      .map((r) => r.avatar)
      .filter((a): a is string => typeof a === "string" && a.length > 0),
  ),
);
function hashUsername(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}
function getAuthorAvatar(name: string): string | undefined {
  const key = name.replace(/^@/, "").toLowerCase();
  if (AUTHOR_AVATAR_MAP[key]) return AUTHOR_AVATAR_MAP[key];
  if (REAL_AVATAR_POOL.length > 0) {
    return REAL_AVATAR_POOL[hashUsername(key) % REAL_AVATAR_POOL.length];
  }
  return undefined;
}

const THANKS_COLLAPSED = 6;
const THANKS_STEP = 60;

function ThanksBox({
  author,
  count,
  seed,
  realThankers,
}: {
  author: string;
  count: number;
  seed: number;
  realThankers?: string[] | null;
}) {
  const [shown, setShown] = useState(THANKS_COLLAPSED);
  const [mobile, setMobile] = useState(false);
  useEffect(() => setMobile(isMobileLike()), []);

  // Pool covers the full `count` (capped). Real thread usernames first, then a
  // deterministic generated remainder so the list keeps expanding chunk by
  // chunk instead of dead-ending on an unclickable "and N others".
  const pool = useMemo(
    () => buildThankers(seed, count, realThankers),
    [seed, count, realThankers],
  );

  if (!count || count < 1) return null;

  const shownNames = pool.slice(0, shown);
  const remaining = pool.length - shownNames.length;
  const unknownRemainder = Math.max(0, count - pool.length);
  const expanded = shown > THANKS_COLLAPSED;

  return (
    <div className="mt-4 overflow-hidden rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06]">
      <p className="border-b border-emerald-500/15 bg-emerald-500/10 px-3 py-1.5 text-[11px] text-emerald-200/90">
        The Following{" "}
        <span className="font-semibold text-emerald-100">
          {count === 1 ? "User Says" : `${count.toLocaleString()} Users Say`}
        </span>{" "}
        Thank You to <span className="font-semibold text-emerald-100">{author}</span> For This Useful Post:
      </p>
      <div className="flex flex-wrap items-center gap-1.5 px-3 py-2">
        {shownNames.map((n, i) => (
          <span
            key={`${n}-${i}`}
            className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/[0.08] py-0.5 pl-0.5 pr-2"
          >
            <PostAvatar author={n} src={getAuthorAvatar(n)} tiny forceMono={mobile} />
            <span className="text-[11px] font-medium text-emerald-200/90">{n}</span>
          </span>
        ))}

        {remaining > 0 && (
          <button
            type="button"
            onClick={() => setShown((s) => Math.min(pool.length, s + THANKS_STEP))}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="rounded-full border border-emerald-400/30 bg-emerald-500/[0.12] px-2 py-0.5 text-[11px] font-semibold text-emerald-200/90 transition hover:bg-emerald-500/20"
          >
            + {Math.min(THANKS_STEP, remaining).toLocaleString()} more
            <span className="text-emerald-300/70"> ({remaining.toLocaleString()} left)</span>
          </button>
        )}

        {remaining <= 0 && unknownRemainder > 0 && (
          <span className="text-[11px] font-medium text-emerald-300/70">
            and {unknownRemainder.toLocaleString()} others
          </span>
        )}

        {expanded && (
          <button
            type="button"
            onClick={() => setShown(THANKS_COLLAPSED)}
            style={{ touchAction: "manipulation", WebkitTapHighlightColor: "transparent" }}
            className="rounded-full border border-emerald-400/30 bg-emerald-500/[0.12] px-2 py-0.5 text-[11px] font-semibold text-emerald-200/90 transition hover:bg-emerald-500/20"
          >
            Show less
          </button>
        )}
      </div>
    </div>
  );
}

const AVATAR_GRADIENTS = [
  ["#7c3aed", "#a855f7"],
  ["#0891b2", "#3b82f6"],
  ["#d97706", "#ef4444"],
  ["#059669", "#0891b2"],
  ["#9333ea", "#ec4899"],
  ["#dc2626", "#9333ea"],
  ["#0369a1", "#06b6d4"],
];

function avatarGradient(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
}

function rankColor(rank: string) {
  if (rank === "Administrator") return "text-purple-300 border-purple-500/40 bg-purple-500/10";
  if (rank.includes("Executive")) return "text-red-300 border-red-500/40 bg-red-500/10";
  if (rank.includes("Subscribed")) return "text-emerald-300 border-emerald-500/40 bg-emerald-500/10";
  if (rank === "Senior Member") return "text-amber-300 border-amber-500/40 bg-amber-500/10";
  if (rank === "Guest") return "text-slate-400 border-slate-700/40 bg-slate-800/30";
  return "text-slate-300 border-slate-600/40 bg-slate-700/20";
}

/**
 * Real profile picture per post. We use the genuine forum avatar
 * imported from the original thread (review.avatar) when available,
 * then fall back to a stable generated avatar per username (DiceBear),
 * and finally to a gradient monogram if both images fail to load.
 */
function PostAvatar({
  author,
  src,
  small = false,
  tiny = false,
  forceMono = false,
}: {
  author: string;
  src?: string | null;
  small?: boolean;
  tiny?: boolean;
  forceMono?: boolean;
}) {
  // stage 0: real forum avatar, 1: generated avatar, 2: monogram.
  // We previously forced mobile straight to the CSS monogram on the theory
  // that the avatar image fetches were what froze the tab on open. The real
  // cause was an infinite loop in thankers() (since fixed), so real photos are
  // restored on every device: real forum avatar when present, DiceBear
  // fallback otherwise, monogram only if both images fail to load. Images are
  // lazy-loaded and decoded off the main thread, so they don't block the page.
  // `forceMono` renders the lightweight gradient monogram with no network
  // request — used for the many tiny thanker chips on mobile so expanding to
  // dozens of names never fires a burst of avatar image fetches.
  const [stage, setStage] = useState<0 | 1 | 2>(() => (forceMono ? 2 : src ? 0 : 1));
  const clean = author.replace(/^@/, "");
  const dim = tiny ? "h-7 w-7 text-[10px]" : small ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm";

  if (stage === 2) {
    const [a, b] = avatarGradient(clean);
    return (
      <div
        className={`${dim} flex shrink-0 items-center justify-center rounded-xl font-bold text-white shadow-lg`}
        style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
      >
        {clean.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  const imgSrc =
    stage === 0 && src
      ? src
      : `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
          clean,
        )}&radius=14&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf,d0f4de,fff4d6`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={imgSrc}
      alt={`${clean} avatar`}
      loading="lazy"
      onError={() => setStage((s) => (s === 0 ? 1 : 2))}
      className={`${dim} shrink-0 rounded-xl border border-white/15 bg-white/10 object-cover shadow-lg`}
    />
  );
}

function ForumPost({
  review,
  index,
  reduced,
}: {
  review: Review;
  index: number;
  reduced: boolean | null;
}) {
  const rankCls = rankColor(review.rank);
  const lines = review.body.split("\n").filter(Boolean);
  const isAdmin = review.rank === "Administrator";

  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.25), ease: "easeOut" }}
      className={
        isAdmin
          ? "overflow-hidden rounded-2xl border border-violet-400/50 bg-violet-500/[0.12] shadow-[0_0_40px_-12px_rgba(167,139,250,0.65)] transition-colors hover:bg-violet-500/[0.16]"
          : "overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] transition-colors hover:bg-white/[0.04]"
      }
    >
      <div
        className={
          isAdmin
            ? "flex items-center justify-between gap-2 border-b border-violet-400/30 bg-violet-500/15 px-3 py-2 sm:px-4"
            : "flex items-center justify-between gap-2 border-b border-white/[0.06] bg-white/[0.03] px-3 py-2 sm:px-4"
        }
      >
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 font-mono text-xs text-slate-500">#{review.postNum}</span>
          {review.title && (
            <span className="ml-1 min-w-0 truncate text-xs font-medium text-slate-300">{review.title}</span>
          )}
        </div>
        {review.date && (
          <span className="shrink-0 font-mono text-[10px] text-white sm:text-xs">{review.date}</span>
        )}
      </div>

      <div className="flex gap-0">
        {/* Desktop postbit sidebar — MyBB layout, modernised */}
        <div className="hidden w-[150px] shrink-0 flex-col items-center gap-2 border-r border-white/[0.06] bg-white/[0.02] px-4 py-4 md:flex">
          <PostAvatar author={review.author} src={review.avatar} />
          <div className="mt-1 w-full min-w-0 text-center">
            <p className="break-all text-sm font-bold leading-tight text-white">{review.author}</p>
            <p className="mt-0.5 text-lg leading-none">{review.country}</p>
          </div>
          <span className={`rounded-full border px-2 py-0.5 text-center text-[10px] font-semibold leading-tight ${rankCls}`}>
            {review.rank}
          </span>
          <div className="mt-2 w-full space-y-0.5">
            {[
              ["Posts", review.posts.toLocaleString()],
              ["Thanks", review.thanks.toLocaleString()],
              ["Activity", review.activity],
              ["Longevity", review.longevity],
            ].map(([label, val]) => (
              <div key={label} className="flex justify-between text-[10px]">
                <span className="text-slate-600">{label}</span>
                <span className="font-mono text-slate-400">{val}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 px-4 py-4 sm:px-5">
          {/* Mobile author strip */}
          <div className="mb-3 flex min-w-0 items-center gap-3 md:hidden">
            <PostAvatar author={review.author} src={review.avatar} small />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">
                {review.author}
                <span className="ml-1.5">{review.country}</span>
              </p>
              <span className={`mt-0.5 inline-block rounded border px-1.5 py-0.5 text-[10px] font-semibold ${rankCls}`}>
                {review.rank}
              </span>
            </div>
          </div>

          {review.quote && (
            <div className="mb-4 overflow-hidden rounded-lg border border-violet-500/25 bg-violet-500/[0.06]">
              <div className="flex items-center gap-2 border-b border-violet-500/20 bg-violet-500/10 px-3 py-2">
                <PostAvatar author={review.quote.author} tiny />
                <div className="flex min-w-0 flex-col leading-tight">
                  <span className="truncate text-sm font-bold text-violet-100">
                    {review.quote.author}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-violet-300/70">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-2.5 w-2.5 shrink-0"
                      fill="currentColor"
                      aria-hidden="true"
                    >
                      <path d="M7.17 6A5.17 5.17 0 0 0 2 11.17V18h6.83v-6.83H5.5A3.67 3.67 0 0 1 9.17 7.5V6H7.17Zm10 0A5.17 5.17 0 0 0 12 11.17V18h6.83v-6.83H15.5a3.67 3.67 0 0 1 3.67-3.67V6h-2Z" />
                    </svg>
                    Originally posted
                  </span>
                </div>
              </div>
              <p className="whitespace-pre-wrap break-words px-3 py-2.5 text-xs italic leading-relaxed text-slate-400">
                {review.quote.text}
              </p>
            </div>
          )}

          <div className="space-y-2.5">
            {lines.map((line, i) => (
              <p key={i} className="whitespace-pre-wrap break-words text-sm leading-relaxed text-slate-300">
                {line}
              </p>
            ))}
          </div>

          {review.lastEdited && (
            <p className="mt-3 text-[11px] italic text-slate-500">
              Last edited by {review.lastEdited}
            </p>
          )}

          {/* Forum-style "Thank You" box */}
          <ThanksBox
            author={review.author}
            count={review.thanks}
            seed={review.postNum}
            realThankers={review.thankers}
          />
        </div>
      </div>
    </motion.article>
  );
}

const PAGE_SIZE = 8;

/** Build a compact, windowed list of page tokens like [1, "…", 4, 5, 6, "…", 46]. */
function pageWindow(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  if (start > 2) out.push("…");
  for (let p = start; p <= end; p++) out.push(p);
  if (end < total - 1) out.push("…");
  out.push(total);
  return out;
}

/**
 * ShopVouchesModal — the imported community vouches thread, rendered as a
 * standalone popup (never inline on product descriptions). Opened via the
 * `open-vouches` window event (see {@link openVouches}). The header — and
 * therefore the Collapse control — is pinned and always visible while the
 * thread scrolls.
 */
export default function ShopVouchesModal({
  editIdPrefix = "shop.vouches",
}: {
  editIdPrefix?: string;
}) {
  const reduced = useReducedMotion();
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [page, setPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);
  // Timestamp of the most recent open. On touch devices the tap that opens
  // the modal (handled on pointer-up via the trigger's onTap) is followed
  // ~300ms later by a synthetic "ghost" click at the same screen coords —
  // which now lands on the freshly-mounted opaque backdrop and would close
  // the modal instantly ("nothing happens"). We ignore backdrop closes that
  // arrive within a short window after opening to swallow that ghost click.
  const openedAtRef = useRef(0);

  const all: Review[] = useMemo(() => orderReviews(reviewsData as Review[]), []);
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const visible = collapsed ? [] : all.slice(pageStart, pageStart + PAGE_SIZE);

  const goToPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages));
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    setMounted(true);
    setMobile(isMobileLike());
  }, []);

  // Tell the page background (ShopLiquidParticles) to pause its animations
  // while the modal is open — a full-screen overlay over ~26 continuously
  // animating layers otherwise pegs the compositor and freezes the page.
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("vouches:visibility", { detail: { open } }));
    // Safety net: if this component unmounts while the modal is open (e.g. a
    // route change), tell the background to resume so the particle layer can
    // never get stuck paused.
    return () => {
      if (open)
        window.dispatchEvent(
          new CustomEvent("vouches:visibility", { detail: { open: false } }),
        );
    };
  }, [open]);

  useEffect(() => {
    const onOpen = () => {
      openedAtRef.current = Date.now();
      setOpen(true);
      setPage(1);
    };
    window.addEventListener(VOUCHES_EVENT, onOpen as EventListener);
    return () => window.removeEventListener(VOUCHES_EVENT, onOpen as EventListener);
  }, []);

  useEffect(() => {
    if (!open) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      unlockScroll();
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="vouches-overlay"
          className="fixed inset-0 z-[120] flex items-end justify-center sm:items-center sm:p-6"
          // Start fully opaque on OPEN (no fade-in) so the opaque backdrop can
          // occlusion-cull the animated layers behind it from the very first
          // frame — a fade-in would keep the overlay translucent for ~200ms and
          // re-introduce the compositor stall. The panel still animates in via
          // its own spring below; exit keeps a fade so the close still plays.
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* FULLY OPAQUE backdrop (no alpha). A translucent overlay forces the
              browser to keep compositing every layer behind it every frame —
              the still-mounted liquid-particles base and the whole page's
              animated sections — which pegs the GPU compositor and freezes the
              page. A fully opaque cover lets the browser occlusion-cull all of
              it, so nothing behind is composited while the modal is open. */}
          {mobile ? (
            /* Mobile: fully opaque cover. Weaker mobile GPUs can't afford a live
               backdrop-blur, and an opaque layer lets the browser occlusion-cull
               everything behind it so the page stays smooth. */
            <div
              className="absolute inset-0 bg-[#06030f]"
              onClick={() => {
                if (Date.now() - openedAtRef.current < 400) return;
                setOpen(false);
              }}
            />
          ) : (
            /* Desktop: smooth translucent blur instead of a hard black cover.
               Safe because the page's background animations (liquid blobs,
               floating cards, hero glow) freeze via the "vouches:visibility"
               event while the modal is open, so this blurs a STATIC scene — it
               is composited once rather than re-blurred every frame. The opacity
               fade gives the "blur smoothly rolls in" feel. */
            <motion.div
              className="absolute inset-0 bg-[#06030f]/70 backdrop-blur-2xl"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onClick={() => {
                if (Date.now() - openedAtRef.current < 400) return;
                setOpen(false);
              }}
            />
          )}

          <motion.div
            initial={reduced ? {} : { y: 40, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={reduced ? {} : { y: 40, scale: 0.98, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
            className="relative flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-t-[1.75rem] border border-white/12 bg-[#0b0918] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.9)] sm:max-h-[88vh] sm:rounded-[1.75rem]"
          >
            {/* Pinned header — Collapse control stays visible while the thread scrolls */}
            <div className="flex shrink-0 items-center gap-3 border-b border-white/10 bg-gradient-to-r from-[#1b1430] to-[#0c1226] px-4 py-3 sm:px-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-blue-500 text-sm font-bold text-white shadow-[0_0_18px_-2px_rgba(167,139,250,0.7)]">
                RG
              </div>
              <div className="min-w-0 flex-1">
                <EditableText
                  id={`${editIdPrefix}.title`}
                  defaultValue="Community Vouches"
                  as="div"
                  className="truncate text-sm font-bold text-white sm:text-base"
                />
                <div className="truncate font-mono text-[11px] text-violet-200/80">
                  <span className="mr-1 inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400 align-middle" />
                  {collapsed
                    ? `0 / ${all.length} vouches`
                    : `Page ${safePage} / ${totalPages} · ${all.length} vouches`}
                </div>
              </div>
              <button
                onClick={() => setCollapsed((v) => !v)}
                className="shrink-0 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-white transition hover:bg-white/10 sm:text-xs"
              >
                {collapsed ? "Expand" : "Collapse"}
                <span className="ml-1" aria-hidden>{collapsed ? "↓" : "↑"}</span>
              </button>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close vouches"
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-white/15 bg-white/5 text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Scrollable thread body */}
            <div ref={scrollRef} data-lenis-prevent className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
              <EditableText
                id={`${editIdPrefix}.subtitle`}
                defaultValue="Real, unfiltered feedback from operators running our methods, mentorships and books — imported straight from the original community thread."
                as="p"
                multiline
                className="mx-auto mb-5 max-w-2xl text-center text-sm leading-[1.6] text-slate-400"
              />

              {collapsed ? (
                <div className="py-16 text-center text-sm text-slate-500">
                  Thread collapsed. Press <span className="text-violet-300">Expand</span> to read the vouches.
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {visible.map((r, i) => (
                      <ForumPost key={r.id} review={r} index={i} reduced={reduced || mobile} />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <nav
                      aria-label="Vouches pages"
                      className="mt-6 flex flex-wrap items-center justify-center gap-1.5"
                    >
                      <button
                        onClick={() => goToPage(safePage - 1)}
                        disabled={safePage === 1}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-semibold text-slate-300 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        ‹ Prev
                      </button>
                      {pageWindow(safePage, totalPages).map((tok, i) =>
                        tok === "…" ? (
                          <span key={`e${i}`} className="px-2 text-sm text-slate-600">…</span>
                        ) : (
                          <button
                            key={tok}
                            onClick={() => goToPage(tok)}
                            aria-current={tok === safePage ? "page" : undefined}
                            className={
                              tok === safePage
                                ? "min-w-[2.25rem] rounded-lg border border-violet-400/60 bg-violet-500/20 px-3 py-1.5 text-sm font-bold text-white shadow-[0_0_18px_-6px_rgba(167,139,250,0.8)]"
                                : "min-w-[2.25rem] rounded-lg border border-white/10 px-3 py-1.5 text-sm font-semibold text-slate-300 transition hover:border-white/25 hover:text-white"
                            }
                          >
                            {tok}
                          </button>
                        ),
                      )}
                      <button
                        onClick={() => goToPage(safePage + 1)}
                        disabled={safePage === totalPages}
                        className="rounded-lg border border-white/10 px-3 py-1.5 text-sm font-semibold text-slate-300 transition hover:border-white/25 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Next ›
                      </button>
                    </nav>
                  )}
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
