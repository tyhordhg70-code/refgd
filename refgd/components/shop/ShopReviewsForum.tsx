"use client";

  import { useMemo, useState } from "react";
  import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
  import EditableText from "@/components/EditableText";
  import reviewsData from "@/data/shop-reviews.json";

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

  function avatarGradient(author: string) {
    let h = 0;
    for (let i = 0; i < author.length; i++) h = (h * 31 + author.charCodeAt(i)) | 0;
    return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
  }

  function rankColor(rank: string) {
    if (rank === "Administrator") return "text-purple-400 border-purple-500/40 bg-purple-500/10";
    if (rank.includes("Executive")) return "text-red-400 border-red-500/40 bg-red-500/10";
    if (rank.includes("Subscribed")) return "text-emerald-400 border-emerald-500/40 bg-emerald-500/10";
    if (rank === "Senior Member") return "text-amber-400 border-amber-500/40 bg-amber-500/10";
    return "text-slate-400 border-slate-600/40 bg-slate-700/20";
  }

  function PostAvatar({ author }: { author: string }) {
    const [a, b] = avatarGradient(author);
    const initials = author.replace("@", "").slice(0, 2).toUpperCase();
    return (
      <div
        className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg"
        style={{ background: `linear-gradient(135deg, ${a}, ${b})` }}
      >
        {initials}
      </div>
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
        initial={reduced ? false : { opacity: 0, y: 20 }}
        whileInView={reduced ? {} : { opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.4, delay: Math.min(index * 0.06, 0.4), ease: "easeOut" }}
        className="border border-white/[0.07] rounded-2xl overflow-hidden bg-white/[0.02] hover:bg-white/[0.04] transition-colors duration-300"
      >
        {/* Post header bar */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/[0.06] bg-white/[0.03]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-slate-500">#</span>
            <span className="text-xs font-bold text-slate-400">{review.postNum}</span>
            {review.title && (
              <span className="text-xs text-slate-300 font-medium ml-1 truncate max-w-[240px]">
                {review.title}
              </span>
            )}
          </div>
          <span className="text-xs text-slate-600 font-mono">{review.date}</span>
        </div>

        {/* Post body */}
        <div className="flex gap-0">
          {/* User sidebar — hidden on mobile */}
          <div className="hidden sm:flex flex-col items-center gap-2 w-[148px] flex-shrink-0 px-4 py-4 border-r border-white/[0.06] bg-white/[0.02]">
            <PostAvatar author={review.author} />
            <div className="text-center mt-1">
              <p className="text-sm font-bold text-white leading-tight break-all">{review.author}</p>
              <p className="text-lg leading-none mt-0.5">{review.country}</p>
            </div>
            <span
              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${rankCls} leading-tight text-center`}
            >
              {review.rank}
            </span>
            <div className="w-full mt-2 space-y-0.5">
              {[
                ["Posts", review.posts.toLocaleString()],
                ["Thanks", review.thanks.toLocaleString()],
                ["Activity", review.activity],
                ["Longevity", review.longevity],
              ].map(([label, val]) => (
                <div key={label} className="flex justify-between text-[10px]">
                  <span className="text-slate-600">{label}</span>
                  <span className="text-slate-400 font-mono">{val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Post content */}
          <div className="flex-1 px-5 py-4 min-w-0">
            {/* Mobile author strip */}
            <div className="flex sm:hidden items-center gap-3 mb-3">
              <PostAvatar author={review.author} />
              <div>
                <p className="text-sm font-bold text-white">
                  {review.author}
                  <span className="ml-1.5">{review.country}</span>
                </p>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${rankCls}`}>
                  {review.rank}
                </span>
              </div>
            </div>

            {/* Quote block */}
            {review.quote && (
              <div className="mb-4 rounded-lg border-l-2 border-violet-500/50 bg-violet-950/20 px-4 py-3">
                <p className="text-[11px] text-slate-500 mb-1 font-semibold">
                  Originally Posted by {review.quote.author}
                </p>
                <p className="text-xs text-slate-400 italic leading-relaxed line-clamp-3">
                  {review.quote.text}
                </p>
              </div>
            )}

            {/* Body */}
            <div className="space-y-2.5">
              {lines.map((line, i) => (
                <p key={i} className="text-sm text-slate-300 leading-relaxed">
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

  export default function ShopReviewsForum({
    editIdPrefix = "shop.reviews",
  }: {
    editIdPrefix?: string;
  }) {
    const reduced = useReducedMotion();
    const [showAll, setShowAll] = useState(false);
    const [collapsed, setCollapsed] = useState(false);

    const all: Review[] = useMemo(() => seededShuffle(reviewsData as Review[], 42), []);
    const visible = showAll ? all : all.slice(0, INITIAL_VISIBLE);

    return (
      <section id="reviews" className="relative py-20 px-4">
        {/* Section header */}
        <div className="max-w-4xl mx-auto mb-10">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="h-px w-8 bg-gradient-to-r from-transparent to-violet-500" />
                <EditableText
                  id={`${editIdPrefix}.eyebrow`}
                  defaultValue="Community Vouches"
                  className="text-xs font-semibold tracking-widest text-violet-400 uppercase"
                  tag="span"
                />
              </div>
              <EditableText
                id={`${editIdPrefix}.title`}
                defaultValue="Dear customers, please leave your vouches for the Evasion Book here. Was it worth it? What are your honest thoughts?"
                className="text-2xl sm:text-3xl font-bold text-white leading-snug"
                tag="h2"
              />
              <EditableText
                id={`${editIdPrefix}.subtitle`}
                defaultValue="Level 1 — $149 · Level 2 — $399 (mentorship included). Real reviews from real buyers."
                className="mt-3 text-sm text-slate-400"
                tag="p"
              />
            </div>
            <button
              onClick={() => setCollapsed((v) => !v)}
              className="flex-shrink-0 text-xs text-slate-500 hover:text-slate-300 transition-colors border border-white/10 rounded-lg px-3 py-1.5 mt-1"
            >
              {collapsed ? "Show vouches ↓" : "Collapse ↑"}
            </button>
          </div>
          <div className="mt-6 h-px bg-gradient-to-r from-violet-500/30 via-white/10 to-transparent" />
        </div>

        {/* Posts feed */}
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? {} : { opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="max-w-4xl mx-auto"
            >
              <div className="space-y-3">
                {visible.map((review, i) => (
                  <ForumPost key={review.id} review={review} index={i} reduced={reduced} />
                ))}
              </div>

              {all.length > INITIAL_VISIBLE && (
                <div className="mt-6 flex justify-center">
                  <button
                    onClick={() => setShowAll((v) => !v)}
                    className="text-sm font-semibold text-violet-400 hover:text-violet-300 border border-violet-500/30 hover:border-violet-400/50 rounded-xl px-6 py-2.5 transition-all duration-200 bg-violet-500/5 hover:bg-violet-500/10"
                  >
                    {showAll
                      ? "Show less ↑"
                      : `Load ${all.length - INITIAL_VISIBLE} more vouches ↓`}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </section>
    );
  }
  