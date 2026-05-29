"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import EditableText from "@/components/EditableText";
import reviewsData from "@/data/shop-reviews.json";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

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
};

const VOUCHES_EVENT = "open-vouches";

/** Fire from anywhere (FAB, buttons, nav) to pop the vouches thread. */
export function openVouches() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(VOUCHES_EVENT));
  }
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const out = [...arr];
  let s = seed;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
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
 * Real profile picture per post. Original MyBB avatars couldn't be
 * imported, so we deterministically generate a stable, unique avatar
 * per username (DiceBear) and gracefully fall back to a gradient
 * monogram if the image ever fails to load.
 */
function PostAvatar({ author, small = false }: { author: string; small?: boolean }) {
  const [failed, setFailed] = useState(false);
  const clean = author.replace(/^@/, "");
  const dim = small ? "h-10 w-10 text-xs" : "h-12 w-12 text-sm";

  if (failed) {
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

  const url = `https://api.dicebear.com/9.x/avataaars/svg?seed=${encodeURIComponent(
    clean,
  )}&radius=14&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf,d0f4de,fff4d6`;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={`${clean} avatar`}
      loading="lazy"
      onError={() => setFailed(true)}
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

  return (
    <motion.article
      initial={reduced ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.03, 0.25), ease: "easeOut" }}
      className="overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.02] transition-colors hover:bg-white/[0.04]"
    >
      <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] bg-white/[0.03] px-3 py-2 sm:px-4">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="shrink-0 font-mono text-xs text-slate-500">#{review.postNum}</span>
          {review.title && (
            <span className="ml-1 min-w-0 truncate text-xs font-medium text-slate-300">{review.title}</span>
          )}
        </div>
        {review.date && (
          <span className="shrink-0 font-mono text-[10px] text-slate-600 sm:text-xs">{review.date}</span>
        )}
      </div>

      <div className="flex gap-0">
        {/* Desktop postbit sidebar — MyBB layout, modernised */}
        <div className="hidden w-[150px] shrink-0 flex-col items-center gap-2 border-r border-white/[0.06] bg-white/[0.02] px-4 py-4 md:flex">
          <PostAvatar author={review.author} />
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
            <PostAvatar author={review.author} small />
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
            <div className="mb-4 rounded-lg border-l-2 border-violet-500/50 bg-violet-950/20 px-3 py-3 sm:px-4">
              <p className="mb-1 text-[11px] font-semibold text-slate-500">
                Originally Posted by {review.quote.author}
              </p>
              <p className="line-clamp-3 break-words text-xs italic leading-relaxed text-slate-400">
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
        </div>
      </div>
    </motion.article>
  );
}

const INITIAL_VISIBLE = 8;
const STEP = 20;

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
  const [collapsed, setCollapsed] = useState(false);
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);

  const all: Review[] = useMemo(() => seededShuffle(reviewsData as Review[], 42), []);
  const visible = collapsed ? [] : all.slice(0, visibleCount);
  const hasMore = !collapsed && visibleCount < all.length;

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onOpen = () => setOpen(true);
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
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setOpen(false)} />

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
                  {collapsed ? 0 : Math.min(visibleCount, all.length)} / {all.length} vouches
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
            <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
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
                      <ForumPost key={r.id} review={r} index={i} reduced={reduced} />
                    ))}
                  </div>

                  {hasMore && (
                    <div className="mt-6 flex flex-wrap justify-center gap-3">
                      <button
                        onClick={() => setVisibleCount((v) => Math.min(v + STEP, all.length))}
                        className="rounded-xl border border-violet-500/30 bg-violet-500/5 px-5 py-2.5 text-sm font-semibold text-violet-300 transition hover:border-violet-400/50 hover:bg-violet-500/10"
                      >
                        Load {Math.min(STEP, all.length - visibleCount)} more ↓
                      </button>
                      <button
                        onClick={() => setVisibleCount(all.length)}
                        className="rounded-xl border border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-400 transition hover:border-white/20 hover:text-slate-200"
                      >
                        Show all {all.length}
                      </button>
                    </div>
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
