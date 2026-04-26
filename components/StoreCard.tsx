"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { Store } from "@/lib/types";
import { logoFallbackChain } from "@/lib/logo";

const TAG_LABEL: Record<string, { label: string; cls: string }> = {
  fire:    { label: "🔥 hot",       cls: "bg-orange-500/15 text-orange-300 ring-orange-400/30" },
  diamond: { label: "💎 premium",   cls: "bg-sky-400/15 text-sky-200 ring-sky-300/30" },
  crown:   { label: "👑 luxury",    cls: "bg-amber-400/15 text-amber-200 ring-amber-300/30" },
  global:  { label: "🌎 worldwide", cls: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30" },
  new:     { label: "✨ new",       cls: "bg-fuchsia-400/15 text-fuchsia-200 ring-fuchsia-300/30" },
};

export default function StoreCard({ store, idx }: { store: Store; idx: number }) {
  const fallbacks = store.logoUrl
    ? [store.logoUrl, ...(store.domain ? logoFallbackChain(store.domain) : [])]
    : store.domain
    ? logoFallbackChain(store.domain)
    : [];
  const [logoIdx, setLogoIdx] = useState(0);
  const logoSrc = fallbacks[logoIdx];

  const initial = store.name.replace(/[^a-zA-Z]/g, "")[0]?.toUpperCase() || "?";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(idx * 0.015, 0.25) }}
      data-cursor="hover"
      data-cursor-label={store.name}
      whileHover={{ y: -4 }}
      className={`relative ${store.prismaticGlow ? "p-[1.5px]" : "p-px"} rounded-2xl ${
        store.prismaticGlow ? "prismatic-border" : "bg-white/10"
      } transition-shadow duration-300 hover:shadow-[0_30px_70px_-25px_rgba(245,185,69,0.5)]`}
    >
      <div className="relative h-full rounded-2xl bg-ink-900/70 p-5 backdrop-blur-xl transition group-hover:bg-ink-800/85">
        <div className="flex items-start gap-4">
          <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-white">
            {logoSrc ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoSrc}
                alt={`${store.name} logo`}
                width={56}
                height={56}
                loading="lazy"
                className="h-full w-full object-contain p-1"
                onError={() => setLogoIdx((i) => i + 1)}
              />
            ) : (
              <span className="text-xl font-bold text-ink-900">{initial}</span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="heading-display truncate text-lg font-semibold tracking-tight text-white">
                {store.name}
              </h3>
              <span className="rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-white/60 ring-1 ring-white/10">
                {store.region}
              </span>
            </div>
            <p className="text-xs text-white/40">{store.category}</p>
            {store.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {store.tags.map((t) => {
                  const meta = TAG_LABEL[t];
                  if (!meta) return null;
                  return (
                    <span
                      key={t}
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ring-1 ${meta.cls}`}
                    >
                      {meta.label}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Metric tiles */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Metric label="Limit" value={store.priceLimit ?? "—"} accent="amber" />
          <Metric label="Items" value={store.itemLimit ?? "—"} accent="sky" />
          <Metric label="Fee" value={store.fee ?? "—"} accent="emerald" />
          <Metric label="Time" value={store.timeframe ?? "—"} accent="violet" />
        </div>

        {store.notes && (
          <p className="mt-3 whitespace-pre-wrap break-words text-sm font-bold leading-relaxed text-white/85">
            {store.notes}
          </p>
        )}

        {store.domain && (
          <a
            href={`https://${store.domain}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-amber-300/85 hover:text-amber-200"
          >
            {store.domain}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M7 17 17 7M7 7h10v10" />
            </svg>
          </a>
        )}
      </div>
    </motion.article>
  );
}

function Metric({ label, value, accent }: { label: string; value: string; accent: "amber" | "sky" | "emerald" | "violet" }) {
  const cls = {
    amber:   "from-amber-400/15 to-amber-600/5 text-amber-100",
    sky:     "from-sky-400/15 to-sky-600/5 text-sky-100",
    emerald: "from-emerald-400/15 to-emerald-600/5 text-emerald-100",
    violet:  "from-violet-400/15 to-violet-600/5 text-violet-100",
  }[accent];
  return (
    <div className={`rounded-lg bg-gradient-to-br ${cls} border border-white/5 px-2.5 py-1.5`}>
      <div className="text-[9px] font-semibold uppercase tracking-wider text-white/45">
        {label}
      </div>
      <div className="truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
