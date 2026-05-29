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

    /* ---- Ordering --------------------------------------------------------
       Reviews are no longer shuffled. They render as a proper in-order
       discussion thread (chronological by postNum). To keep the opening of
       the thread focused on genuine vouches/feedback (not random Q&A), posts
       that read like positive testimonials are floated to the front while
       still being internally chronological. */
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
        if (av !== bv) return bv - av; // vouches first
        return a.postNum - b.postNum; // chronological within each group
      });
    }

    /* Deterministic "thanked by" usernames for the forum-style thanks box. */
    const THANKERS = [
      "@stealthking", "@ebayqueen", "@flipmaster", "@nova_seller", "@reseller_j",
      "@silentbuyer", "@goldchain", "@phantom", "@retailninja", "@boxbreaker",
      "@aged_orders", "@vccguru", "@dropking", "@refund_rick", "@opsec_owl",
      "@graymarket", "@payday", "@anon_77", "@swiftship", "@evader",
      "@coldstorage", "@hustle_hank", "@lowkey", "@bankroll", "@ghostbuyer",
      "@profit_pat", "@stackz", "@quietmoney", "@thereup", "@comebackkid",
    ];
    function thankers(seed: number, count: number): string[] {
      const out: string[] = [];
      let s = (seed * 2654435761) >>> 0;
      const used = new Set<number>();
      while (out.length < count) {
        s = (s * 1103515245 + 12345) >>> 0;
        const idx = s % THANKERS.length;
        if (used.has(idx)) continue;
        used.add(idx);
        out.push(THANKERS[idx]);
        if (used.size >= THANKERS.length) break;
      }
      return out;
    }

    function ThanksBox({ author, count, seed }: { author: string; count: number; seed: number }) {
      if (!count || count < 1) return null;
      const shown = Math.min(count, 6);
      const names = thankers(seed, shown);
      const extra = count - names.length;
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
            {names.map((n) => (
              <span
                key={n}
                className="inline-flex items-center gap-1 rounded-full border border-emerald-400/25 bg-emerald-500/[0.08] py-0.5 pl-0.5 pr-2"
              >
                <PostAvatar author={n} tiny />
                <span className="text-[11px] font-medium text-emerald-200/90">{n}</span>
              </span>
            ))}
            {extra > 0 && (
              <span className="text-[11px] font-medium text-emerald-300/70">
                and {extra.toLocaleString()} others
              </span>
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
      if (rank === "Guest") return "text-slate-500 border-slate-700/40 bg-slate-800/30";
      return "text-slate-400 border-slate-600/40 bg-slate-700/20";
    }

    function PostAvatar({ author, small = false, tiny = false }: { author: string; small?: boolean; tiny?: boolean }) {
      const [a, b] = avatarGradient(author);
      const initials = author.replace("@", "").slice(0, 2).toUpperCase();
      const size = tiny ? "w-7 h-7 text-[10px]" : small ? "w-10 h-10 text-xs" : "w-12 h-12 text-sm";
      return (
        <div
          className={`${size} rounded-xl flex items-center justify-center text-white font-bold flex-shrink-0 shadow-lg`}
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
          transition={{ duration: 0.4, delay: Math.min(index * 0.04, 0.3), ease: "easeOut" }}
          className="border border-white/[0.07] rounded-2xl overflow-hidden bg-white/[0.02] hover:bg-white/[0.04] transition-colors duration-300"
        >
          {/* Post header bar */}
          <div className="flex items-center justify-between px-3 sm:px-4 py-2 border-b border-white/[0.06] bg-white/[0.03] gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <span className="text-xs font-mono text-slate-500 flex-shrink-0">#</span>
              <span className="text-xs font-bold text-slate-400 flex-shrink-0">{review.postNum}</span>
              {review.title && (
                <span className="text-xs text-slate-300 font-medium ml-1 truncate min-w-0">
                  {review.title}
                </span>
              )}
            </div>
            {review.date && (
              <span className="text-[10px] sm:text-xs text-white font-mono flex-shrink-0">{review.date}</span>
            )}
          </div>

          {/* Post body */}
          <div className="flex gap-0">
            {/* User sidebar — hidden on mobile/tablet, shown on desktop */}
            <div className="hidden md:flex flex-col items-center gap-2 w-[148px] flex-shrink-0 px-4 py-4 border-r border-white/[0.06] bg-white/[0.02]">
              <PostAvatar author={review.author} />
              <div className="text-center mt-1 w-full min-w-0">
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
            <div className="flex-1 px-4 sm:px-5 py-4 min-w-0">
              {/* Mobile/tablet author strip */}
              <div className="flex md:hidden items-center gap-3 mb-3 min-w-0">
                <PostAvatar author={review.author} small />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white truncate">
                    {review.author}
                    <span className="ml-1.5">{review.country}</span>
                  </p>
                  <span className={`inline-block mt-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded border ${rankCls}`}>
                    {review.rank}
                  </span>
                </div>
                <div className="text-right text-[10px] text-slate-600 font-mono flex-shrink-0 hidden xs:block">
                  <div>{review.posts.toLocaleString()} posts</div>
                  <div>{review.thanks.toLocaleString()} thanks</div>
                </div>
              </div>

              {/* Quote block — show the original poster (avatar + name) before the reply */}
              {review.quote && (
                <div className="mb-4 overflow-hidden rounded-lg border border-violet-500/30 bg-violet-950/20">
                  <div className="flex items-center gap-2 border-b border-violet-500/20 bg-violet-500/10 px-3 py-2">
                    <PostAvatar author={review.quote.author} tiny />
                    <div className="flex min-w-0 flex-col leading-tight">
                      <span className="truncate text-sm font-bold text-violet-100">
                        {review.quote.author}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-violet-300/70">
                        Originally posted
                      </span>
                    </div>
                  </div>
                  <p className="px-3 sm:px-4 py-2.5 text-xs text-slate-400 italic leading-relaxed line-clamp-3 break-words">
                    {review.quote.text}
                  </p>
                </div>
              )}

              {/* Body */}
              <div className="space-y-2.5">
                {lines.map((line, i) => (
                  <p key={i} className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap break-words">
                    {line}
                  </p>
                ))}
              </div>

              {/* Forum-style "Thank You" box */}
              <ThanksBox author={review.author} count={review.thanks} seed={review.postNum} />
            </div>
          </div>
        </motion.article>
      );
    }

    const INITIAL_VISIBLE = 8;
    const STEP = 20;

    export default function ShopReviewsForum({
      editIdPrefix = "shop.reviews",
    }: {
      editIdPrefix?: string;
    }) {
      const reduced = useReducedMotion();
      const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
      const [collapsed, setCollapsed] = useState(false);

      const all: Review[] = useMemo(() => orderReviews(reviewsData as Review[]), []);
      const visible = collapsed ? [] : all.slice(0, visibleCount);
      const hasMore = !collapsed && visibleCount < all.length;

      return (
        <section id="reviews" className="relative py-14 sm:py-20 px-3 sm:px-4 overflow-x-clip">
          {/* Section header */}
          <div className="max-w-4xl mx-auto mb-6">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="h-px w-8 bg-gradient-to-r from-transparent to-violet-500" />
              <EditableText
                id={`${editIdPrefix}.eyebrow`}
                defaultValue="Community Vouches"
                className="text-xs font-semibold tracking-widest text-violet-400 uppercase"
                as="span"
              />
            </div>
            <EditableText
              id={`${editIdPrefix}.title`}
              defaultValue="Dear customers, please leave your vouches for the Evasion Book here. Was it worth it? What are your honest thoughts?"
              className="text-xl sm:text-3xl font-bold text-white leading-snug"
              as="h2"
            />
            <EditableText
              id={`${editIdPrefix}.subtitle`}
              defaultValue="Level 1 — $149 · Level 2 — $399 (mentorship included). Real reviews from real buyers."
              className="mt-3 text-sm text-slate-400"
              as="p"
            />
            <div className="mt-6 h-px bg-gradient-to-r from-violet-500/30 via-white/10 to-transparent" />
          </div>

          {/* Sticky toolbar — follows scroll while inside the reviews section.
              Wrapper is pointer-events-none so taps pass through to posts; the
              inner pill re-enables pointer events. */}
          <div className="sticky top-3 sm:top-4 z-30 max-w-4xl mx-auto mb-4 pointer-events-none">
            <div className="pointer-events-auto flex items-center justify-between gap-2 rounded-full border border-white/10 bg-slate-950/90 backdrop-blur-md px-3 sm:px-4 py-2 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.7)]">
              <div className="flex items-center gap-2 text-xs text-slate-400 min-w-0 flex-shrink">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse flex-shrink-0" />
                <span className="font-mono text-slate-500 whitespace-nowrap">
                  {collapsed ? `0 / ${all.length}` : `${Math.min(visibleCount, all.length)} / ${all.length}`}
                </span>
                <span className="hidden sm:inline text-slate-600">vouches</span>
              </div>
              <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
                {!collapsed && hasMore && (
                  <button
                    onClick={() => setVisibleCount((v) => Math.min(v + STEP, all.length))}
                    aria-label={`Load ${Math.min(STEP, all.length - visibleCount)} more vouches`}
                    className="text-[11px] sm:text-xs font-semibold text-violet-300 hover:text-violet-200 px-2 sm:px-2.5 py-1 rounded-full hover:bg-violet-500/10 transition-colors whitespace-nowrap"
                  >
                    +{Math.min(STEP, all.length - visibleCount)}
                    <span className="hidden sm:inline"> more</span>
                  </button>
                )}
                {!collapsed && visibleCount > INITIAL_VISIBLE && (
                  <button
                    onClick={() => setVisibleCount(INITIAL_VISIBLE)}
                    aria-label="Reset to 8 vouches"
                    className="hidden sm:inline text-[11px] sm:text-xs text-slate-500 hover:text-slate-300 px-2.5 py-1 rounded-full hover:bg-white/5 transition-colors"
                  >
                    Reset
                  </button>
                )}
                <button
                  onClick={() => setCollapsed((v) => !v)}
                  className="text-[11px] sm:text-xs font-semibold text-white border border-white/15 hover:border-white/30 rounded-full px-2.5 sm:px-3 py-1 transition-colors bg-white/5 hover:bg-white/10 whitespace-nowrap"
                >
                  {collapsed ? "Expand" : "Collapse"}
                  <span className="ml-1" aria-hidden>{collapsed ? "↓" : "↑"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Posts feed */}
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                key="feed"
                initial={reduced ? false : { opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={reduced ? {} : { opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="max-w-4xl mx-auto overflow-hidden"
              >
                <div className="space-y-3">
                  {visible.map((review, i) => (
                    <ForumPost key={review.id} review={review} index={i} reduced={reduced} />
                  ))}
                </div>

                {hasMore && (
                  <div className="mt-6 flex justify-center gap-3 flex-wrap px-2">
                    <button
                      onClick={() => setVisibleCount((v) => Math.min(v + STEP, all.length))}
                      className="text-sm font-semibold text-violet-400 hover:text-violet-300 border border-violet-500/30 hover:border-violet-400/50 rounded-xl px-5 sm:px-6 py-2.5 transition-all duration-200 bg-violet-500/5 hover:bg-violet-500/10"
                    >
                      Load {Math.min(STEP, all.length - visibleCount)} more ↓
                    </button>
                    <button
                      onClick={() => setVisibleCount(all.length)}
                      className="text-sm font-semibold text-slate-400 hover:text-slate-200 border border-white/10 hover:border-white/20 rounded-xl px-5 sm:px-6 py-2.5 transition-all duration-200"
                    >
                      Show all {all.length}
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </section>
      );
    }
  