"use client";

  import { useMemo, useState } from "react";
  import { motion, useReducedMotion } from "framer-motion";
  import EditableText from "@/components/EditableText";
  import reviewsData from "@/data/shop-reviews.json";

  type Review = {
    id: string; bucket: string; author: string; handle: string;
    time: string; body: string; likes: number; replies: number;
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
    ["#7c3aed", "#ec4899"], ["#06b6d4", "#3b82f6"], ["#f59e0b", "#ef4444"],
    ["#10b981", "#06b6d4"], ["#a855f7", "#3b82f6"], ["#f43f5e", "#a855f7"],
  ];
  const gradientFor = (id: string) => {
    let h = 0;
    for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
    return AVATAR_GRADIENTS[Math.abs(h) % AVATAR_GRADIENTS.length];
  };

  export default function ShopReviewsTelegram({
    editIdPrefix = "shop.reviews",
  }: { editIdPrefix?: string }) {
    const reduced = useReducedMotion();
    const [showAll, setShowAll] = useState(false);

    const all: Review[] = useMemo(
      () => seededShuffle(reviewsData.reviews as Review[], 17),
      []
    );
    const visible = showAll ? all : all.slice(0, 6);

    return (
      <section id="reviews" className="relative z-10 py-20 sm:py-28">
        <div className="container-wide relative">
          <div className="text-center">
            <EditableText
              id={`${editIdPrefix}.eyebrow`}
              defaultValue="REAL TALK"
              as="div"
              className="text-xs font-bold uppercase tracking-[0.32em] text-cyan-300"
            />
            <EditableText
              id={`${editIdPrefix}.title`}
              defaultValue="Customer reviews."
              as="h2"
              className="editorial-display mx-auto mt-4 max-w-3xl text-balance uppercase text-white text-[clamp(1.8rem,4.5vw,3.4rem)]"
              style={{ letterSpacing: "-0.025em", lineHeight: 1.15 }}
            />
            <EditableText
              id={`${editIdPrefix}.subtitle`}
              defaultValue="Unfiltered feedback from operators running our methods, mentorships and books in the wild."
              as="p"
              multiline
              className="mx-auto mt-5 max-w-2xl text-base leading-[1.7] text-white/70"
            />
          </div>

          <motion.div
            initial={reduced ? {} : { opacity: 0, y: 60, scale: 0.96 }}
            whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative mx-auto mt-14 max-w-2xl overflow-hidden rounded-[2rem] border border-cyan-300/25"
            style={{
              background: "linear-gradient(165deg, rgba(34,211,238,0.10), rgba(10,8,22,0.94) 60%)",
              boxShadow: "0 60px 140px -30px rgba(0,0,0,0.85), 0 0 90px -25px rgba(34,211,238,0.30), inset 0 1px 0 rgba(255,255,255,0.08)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
            }}
          >
            <div className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-r from-[#1e3a5f] to-[#0c1c30] px-5 py-3.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-500 text-sm font-bold text-white shadow-[0_0_18px_-2px_rgba(34,211,238,0.7)]">
                RG
              </div>
              <div className="flex-1 min-w-0">
                <div className="truncate text-sm font-semibold text-white">RefundGod · Reviews</div>
                <div className="truncate text-[11px] text-cyan-200/80">{all.length} members · {all.length} messages</div>
              </div>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/5 text-white/60">⋯</div>
            </div>

            <div className="space-y-3 px-4 py-5 sm:px-5 sm:py-6">
              {visible.map((r, i) => {
                const [g0, g1] = gradientFor(r.id);
                return (
                  <motion.div
                    key={r.id}
                    initial={reduced ? {} : { opacity: 0, y: 20, scale: 0.95 }}
                    whileInView={reduced ? undefined : { opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.4 }}
                    transition={{ duration: 0.45, delay: 0.05 + i * 0.07, ease: [0.22, 1, 0.36, 1] }}
                    className="flex gap-2.5"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white shadow-[0_4px_14px_-2px_rgba(0,0,0,0.6)]"
                      style={{ background: `linear-gradient(135deg, ${g0}, ${g1})` }}
                    >
                      {r.author.replace(/^@/, "").slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0 rounded-2xl rounded-tl-md bg-white/[0.06] px-4 py-2.5 border border-white/5">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-semibold text-cyan-200">{r.author}</span>
                        <span className="truncate text-[11px] text-white/40">{r.handle} · {r.time} ago</span>
                      </div>
                      <p className="mt-1 text-sm leading-[1.55] text-white/85">{r.body}</p>
                      <div className="mt-2 flex items-center gap-3 text-[11px] text-white/45">
                        <span className="inline-flex items-center gap-1"><span className="text-cyan-300">♥</span> {r.likes}</span>
                        <span className="inline-flex items-center gap-1"><span>💬</span> {r.replies}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="border-t border-white/10 px-5 py-4 text-center">
              {all.length > 6 && (
                <button
                  onClick={() => setShowAll((v) => !v)}
                  className="rounded-full border border-cyan-300/30 bg-cyan-400/10 px-5 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100 transition hover:bg-cyan-400/20"
                >
                  {showAll ? "Show fewer" : `Load ${all.length - 6} more`}
                </button>
              )}
            </div>
          </motion.div>
        </div>
      </section>
    );
  }
  