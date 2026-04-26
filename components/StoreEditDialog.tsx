"use client";

/**
 * Modal dialog for creating or editing a store inline on /store-list.
 *
 * - When `store` is null/omitted, the dialog is in "create" mode and
 *   the admin-supplied `defaultRegion` / `defaultCategory` pre-fill the
 *   selectors (so the "+ Add" button under the Electronics section
 *   defaults to Electronics).
 * - When `store` is provided, the dialog edits that store.
 *
 * Saves go directly to the stores API (not via EditContext) because
 * stores are their own resource — undo for store ops is not supported
 * in this iteration (would require a soft-delete and per-field history,
 * out of scope for option A).
 */

import { useEffect, useRef, useState } from "react";
import type { Region, Store, StoreCategory, StoreTag } from "@/lib/types";

const REGIONS: Region[] = ["USA", "CAD", "EU", "UK"];
const CATEGORIES: StoreCategory[] = [
  "Electronics", "Clothing", "Jewelry", "Food", "Meal Plans", "Home", "Other",
];
const TAGS: { id: StoreTag; label: string }[] = [
  { id: "fire", label: "🔥 hot" },
  { id: "diamond", label: "💎 premium" },
  { id: "crown", label: "👑 luxury" },
  { id: "global", label: "🌎 worldwide" },
  { id: "new", label: "✨ new" },
];

type Props = {
  open: boolean;
  store: Store | null;
  defaultRegion?: Region;
  defaultCategory?: StoreCategory;
  onClose: () => void;
  onSaved: (store: Store) => void;
};

type Draft = {
  name: string;
  domain: string;
  region: Region;
  category: StoreCategory;
  priceLimit: string;
  itemLimit: string;
  fee: string;
  timeframe: string;
  notes: string;
  tags: StoreTag[];
  prismaticGlow: boolean;
  logoUrl: string;
};

function emptyDraft(region: Region, category: StoreCategory): Draft {
  return {
    name: "",
    domain: "",
    region,
    category,
    priceLimit: "",
    itemLimit: "",
    fee: "",
    timeframe: "",
    notes: "",
    tags: [],
    prismaticGlow: false,
    logoUrl: "",
  };
}

function fromStore(s: Store): Draft {
  return {
    name: s.name,
    domain: s.domain ?? "",
    region: s.region,
    category: s.category,
    priceLimit: s.priceLimit ?? "",
    itemLimit: s.itemLimit ?? "",
    fee: s.fee ?? "",
    timeframe: s.timeframe ?? "",
    notes: s.notes ?? "",
    tags: s.tags ?? [],
    prismaticGlow: Boolean(s.prismaticGlow),
    logoUrl: s.logoUrl ?? "",
  };
}

export default function StoreEditDialog({
  open,
  store,
  defaultRegion = "USA",
  defaultCategory = "Other",
  onClose,
  onSaved,
}: Props) {
  const [draft, setDraft] = useState<Draft>(() =>
    store ? fromStore(store) : emptyDraft(defaultRegion, defaultCategory),
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Reset the draft whenever the dialog is reopened with a different
  // store (or for a different "+ Add" slot).
  useEffect(() => {
    if (!open) return;
    setDraft(store ? fromStore(store) : emptyDraft(defaultRegion, defaultCategory));
    setErr(null);
  }, [open, store, defaultRegion, defaultCategory]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const setField = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft((d) => ({ ...d, [k]: v }));

  async function save() {
    if (!draft.name.trim()) {
      setErr("Name is required.");
      return;
    }
    setSaving(true);
    setErr(null);
    try {
      const isUpdate = Boolean(store?.id);
      const url = isUpdate ? `/api/admin/stores/${store!.id}` : "/api/admin/stores";
      const method = isUpdate ? "PATCH" : "POST";
      const body = {
        name: draft.name.trim(),
        domain: draft.domain.trim() || undefined,
        region: draft.region,
        category: draft.category,
        priceLimit: draft.priceLimit.trim() || undefined,
        itemLimit: draft.itemLimit.trim() || undefined,
        fee: draft.fee.trim() || undefined,
        timeframe: draft.timeframe.trim() || undefined,
        notes: draft.notes.trim() || undefined,
        tags: draft.tags,
        prismaticGlow: draft.prismaticGlow,
        logoUrl: draft.logoUrl.trim() || undefined,
      };
      const res = await fetch(url, {
        method,
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => null);
        throw new Error(j?.error || `Save failed: ${res.status}`);
      }
      const j = await res.json();
      onSaved(j.store as Store);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/70 backdrop-blur-sm p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-label={store ? `Edit ${store.name}` : "Add new store"}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <h3 className="heading-display text-sm font-semibold uppercase tracking-widest text-amber-300/85">
            {store ? "Edit store" : "Add new store"}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md px-2 text-white/60 hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="grid max-h-[70vh] grid-cols-1 gap-3 overflow-y-auto p-5 sm:grid-cols-2">
          <Field label="Name *" full>
            <input
              value={draft.name}
              onChange={(e) => setField("name", e.target.value)}
              autoFocus
              className={inputCls}
            />
          </Field>
          <Field label="Domain">
            <input
              value={draft.domain}
              onChange={(e) => setField("domain", e.target.value)}
              placeholder="store.com"
              className={inputCls}
            />
          </Field>
          <Field label="Region">
            <select
              value={draft.region}
              onChange={(e) => setField("region", e.target.value as Region)}
              className={inputCls}
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </Field>
          <Field label="Category">
            <select
              value={draft.category}
              onChange={(e) => setField("category", e.target.value as StoreCategory)}
              className={inputCls}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Logo URL">
            <input
              value={draft.logoUrl}
              onChange={(e) => setField("logoUrl", e.target.value)}
              placeholder="auto-fetched if blank"
              className={inputCls}
            />
          </Field>
          <Field label="Price limit">
            <input value={draft.priceLimit} onChange={(e) => setField("priceLimit", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Item limit">
            <input value={draft.itemLimit} onChange={(e) => setField("itemLimit", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Fee">
            <input value={draft.fee} onChange={(e) => setField("fee", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Timeframe">
            <input value={draft.timeframe} onChange={(e) => setField("timeframe", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Notes" full>
            <textarea
              value={draft.notes}
              onChange={(e) => setField("notes", e.target.value)}
              rows={3}
              className={`${inputCls} resize-none`}
            />
          </Field>
          <Field label="Tags" full>
            <div className="flex flex-wrap gap-2">
              {TAGS.map((t) => {
                const on = draft.tags.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() =>
                      setField(
                        "tags",
                        on ? draft.tags.filter((x) => x !== t.id) : [...draft.tags, t.id],
                      )
                    }
                    className={`rounded-full px-3 py-1 text-xs ring-1 ${
                      on
                        ? "bg-amber-400/20 text-amber-100 ring-amber-300/50"
                        : "bg-white/5 text-white/70 ring-white/10 hover:bg-white/10"
                    }`}
                  >
                    {t.label}
                  </button>
                );
              })}
            </div>
          </Field>
          <Field label="Prismatic glow">
            <label className="inline-flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                checked={draft.prismaticGlow}
                onChange={(e) => setField("prismaticGlow", e.target.checked)}
                className="h-4 w-4 accent-amber-400"
              />
              Featured / animated border
            </label>
          </Field>
        </div>

        {err && (
          <div className="border-t border-rose-400/30 bg-rose-500/10 px-5 py-2 text-xs text-rose-200">
            {err}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-white/10 bg-ink-950/60 px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm text-white/70 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-2 text-sm font-bold text-ink-950 transition hover:brightness-110 disabled:opacity-50"
          >
            {saving ? "Saving…" : store ? "Save changes" : "Add store"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30 focus:border-amber-300/60";

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`block ${full ? "sm:col-span-2" : ""}`}>
      <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-white/45">{label}</div>
      {children}
    </label>
  );
}
