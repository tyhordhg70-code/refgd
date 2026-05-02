"use client";
import { useState } from "react";
import { motion } from "framer-motion";
import type { Store } from "@/lib/types";
import { logoChainForStore } from "@/lib/logo";
import { useEditContext } from "@/lib/edit-context";

const TAG_LABEL: Record<string, { label: string; cls: string }> = {
  fire:    { label: "🔥 hot",       cls: "bg-orange-500/15 text-orange-300 ring-orange-400/30" },
  diamond: { label: "💎 premium",   cls: "bg-sky-400/15 text-sky-200 ring-sky-300/30" },
  crown:   { label: "👑 luxury",    cls: "bg-amber-400/15 text-amber-200 ring-amber-300/30" },
  global:  { label: "🌎 worldwide", cls: "bg-emerald-400/15 text-emerald-200 ring-emerald-300/30" },
  new:     { label: "✨ new",       cls: "bg-fuchsia-400/15 text-fuchsia-200 ring-fuchsia-300/30" },
};

type StoreCardProps = {
  store: Store;
  idx: number;
  /** Inline-editor callbacks. When omitted the card behaves normally. */
  onEdit?: (store: Store) => void;
  onDelete?: (store: Store) => void;
  /** Drag handlers wired by StoreFilters when in edit mode. */
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent<HTMLElement>) => void;
  onDragOver?: (e: React.DragEvent<HTMLElement>) => void;
  onDrop?: (e: React.DragEvent<HTMLElement>) => void;
  onDragEnd?: (e: React.DragEvent<HTMLElement>) => void;
};

export default function StoreCard({
  store,
  idx,
  onEdit,
  onDelete,
  draggable,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: StoreCardProps) {
  // logoChainForStore consults the name-based override map first, so stores
  // with a wrong or missing domain still resolve to the right logo.
  // Chain order: Google S2 → DDG → Clearbit (fewest browser 404s first).
  const overrideChain = logoChainForStore(store.name, store.domain);
  const fallbacks = store.logoUrl
    ? [store.logoUrl, ...overrideChain.filter((u) => u !== store.logoUrl)]
    : overrideChain;
  const [logoIdx, setLogoIdx] = useState(0);
  const logoSrc = fallbacks[logoIdx];

  const initial = store.name.replace(/[^a-zA-Z]/g, "")[0]?.toUpperCase() || "?";

  // Editor overlay only shows when admin is in edit mode AND a parent
  // (StoreFilters) supplied callbacks — keeps this component usable on
  // public pages with zero visual change for non-admin visitors.
  const { isAdmin, editMode } = useEditContext();
  const showOverlay = isAdmin && editMode && (onEdit || onDelete);

  // NOTE: HTML5 drag-and-drop handlers are intentionally placed on the
  // inner plain <div> rather than the outer <motion.article>. framer-motion
  // overloads the `onDragStart` / `onDragEnd` props on its `motion.*`
  // components with its own pan-gesture signature `(e, info: PanInfo)`,
  // which is type-incompatible with React's `DragEvent<HTMLElement>`.
  // Putting the HTML drag handlers on the inner div sidesteps the conflict
  // entirely and keeps both layout animation AND native drag working.
  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: Math.min(idx * 0.015, 0.25) }}
      suppressHydrationWarning
      data-cursor="hover"
      data-cursor-label={store.name}
      data-testid={`store-card-${store.id}`}
      whileHover={{ y: -4 }}
      className={`group relative ${store.prismaticGlow ? "p-[1.5px]" : "p-px"} rounded-2xl ${
        store.prismaticGlow ? "prismatic-border" : "bg-white/10"
      } transition-shadow duration-300 hover:shadow-[0_30px_70px_-25px_rgba(245,185,69,0.18)] ${
        showOverlay ? "ring-2 ring-amber-300/0 hover:ring-amber-300/40" : ""
      }`}
    >
      <div
        className="relative h-full rounded-2xl bg-ink-900/70 p-5 backdrop-blur-xl transition group-hover:bg-ink-800/85"
        draggable={draggable}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onDragEnd={onDragEnd}
      >
        {showOverlay && (
          <div className="absolute right-2 top-2 z-10 flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <span
              className="grid h-7 w-7 cursor-grab place-items-center rounded-md border border-white/20 bg-ink-900/90 text-white/70"
              title="Drag to reorder"
              aria-hidden
              data-testid={`store-card-drag-${store.id}`}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="currentColor">
                <circle cx="9" cy="6" r="1.5" /><circle cx="15" cy="6" r="1.5" />
                <circle cx="9" cy="12" r="1.5" /><circle cx="15" cy="12" r="1.5" />
                <circle cx="9" cy="18" r="1.5" /><circle cx="15" cy="18" r="1.5" />
              </svg>
            </span>
            {onEdit && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); onEdit(store); }}
                className="grid h-7 w-7 place-items-center rounded-md border border-amber-300/40 bg-amber-400/15 text-amber-200 transition hover:bg-amber-400/30"
                title="Edit store"
                aria-label="Edit store"
                data-testid={`store-card-edit-${store.id}`}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                </svg>
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (confirm(`Delete "${store.name}"? This can't be undone from the inline editor.`)) {
                    onDelete(store);
                  }
                }}
                className="grid h-7 w-7 place-items-center rounded-md border border-rose-300/40 bg-rose-500/15 text-rose-200 transition hover:bg-rose-500/30"
                title="Delete store"
                aria-label="Delete store"
                data-testid={`store-card-delete-${store.id}`}
              >
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" /><path d="M19 6l-1.6 13.2A2 2 0 0 1 15.4 21H8.6a2 2 0 0 1-2-1.8L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                </svg>
              </button>
            )}
          </div>
        )}
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
