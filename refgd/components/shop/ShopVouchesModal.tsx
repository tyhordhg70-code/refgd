"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
  avatar?: string | null;
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
}: {
  author: string;
  src?: string | null;
  small?: boolean;
  tiny?: boolean;
}) {
  // stage 0: real forum avatar, 1: generated avatar, 2: monogram
  const [stage, setStage] = useState<0 | 1 | 2>(src ? 0 : 1);
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
          <span className="shrink-0 font-mono text-[10px] text-slate-600 sm:text-xs">{review.date}</span>
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
  const [collapsed, setCollapsed] = useState(false);
  const [page, setPage] = useState(1);
  const scrollRef = useRef<HTMLDivElement>(null);

  const all: Review[] = useMemo(() => seededShuffle(reviewsData as Review[], 42), []);
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * PAGE_SIZE;
  const visible = collapsed ? [] : all.slice(pageStart, pageStart + PAGE_SIZE);

  const goToPage = (p: number) => {
    setPage(Math.min(Math.max(1, p), totalPages));
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const onOpen = () => {
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
            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-3 py-4 sm:px-5 sm:py-5">
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
