"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Store, Region, StoreCategory, StoreTag } from "@/lib/types";

const REGIONS: Region[] = ["USA", "CAD", "EU", "UK"];
const CATEGORIES: StoreCategory[] = ["Electronics", "Clothing", "Jewelry", "Food", "Meal Plans", "Home", "Other"];
const TAGS: StoreTag[] = ["fire", "diamond", "crown", "global", "new"];

function blankStore(): Partial<Store> {
  return {
    id: undefined,
    name: "",
    domain: "",
    region: "USA",
    category: "Other",
    priceLimit: "",
    itemLimit: "",
    fee: "",
    timeframe: "",
    notes: "",
    tags: [],
    prismaticGlow: false,
    logoUrl: "",
    sortOrder: 1000,
  };
}

export default function StoresAdmin({ initialStores }: { initialStores: Store[] }) {
  const [stores, setStores] = useState<Store[]>(initialStores);
  const [filter, setFilter] = useState("");
  const [region, setRegion] = useState<Region | "ALL">("ALL");
  const [editing, setEditing] = useState<Partial<Store> | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // drag-and-drop reordering
  const [dragId, setDragId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return stores
      .filter((s) => (region === "ALL" ? true : s.region === region))
      .filter((s) =>
        !q
          ? true
          : s.name.toLowerCase().includes(q) ||
            (s.domain ?? "").toLowerCase().includes(q) ||
            s.category.toLowerCase().includes(q),
      )
      .sort((a, b) => (a.sortOrder - b.sortOrder) || a.name.localeCompare(b.name));
  }, [stores, filter, region]);

  async function refresh() {
    const r = await fetch("/api/admin/stores", { cache: "no-store" });
    const j = await r.json();
    setStores(j.stores || []);
  }

  async function save(e?: React.FormEvent) {
    e?.preventDefault();
    if (!editing) return;
    setBusy(true);
    setMsg(null);
    try {
      const isUpdate = Boolean(editing.id);
      const r = await fetch(
        isUpdate ? `/api/admin/stores/${editing.id}` : "/api/admin/stores",
        {
          method: isUpdate ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(editing),
        },
      );
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || `Save failed (${r.status})`);
      }
      setMsg(isUpdate ? "Updated." : "Created.");
      setEditing(null);
      await refresh();
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this store?")) return;
    const r = await fetch(`/api/admin/stores/${id}`, { method: "DELETE" });
    if (r.ok) await refresh();
  }

  async function toggleGlow(s: Store) {
    const r = await fetch(`/api/admin/stores/${s.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prismaticGlow: !s.prismaticGlow }),
    });
    if (r.ok) await refresh();
  }

  async function fetchLogo() {
    if (!editing?.domain) return;
    setBusy(true);
    try {
      const r = await fetch(`/api/logo?domain=${encodeURIComponent(editing.domain)}`);
      const j = await r.json();
      if (j.url) setEditing({ ...editing, logoUrl: j.url });
    } finally {
      setBusy(false);
    }
  }

  function onDrop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const list = [...filtered];
    const fromIdx = list.findIndex((s) => s.id === dragId);
    const toIdx = list.findIndex((s) => s.id === targetId);
    if (fromIdx < 0 || toIdx < 0) return;
    const [moved] = list.splice(fromIdx, 1);
    list.splice(toIdx, 0, moved);
    // assign new sortOrder values within visible range
    const updated = list.map((s, i) => ({ id: s.id, sortOrder: i * 10 }));
    Promise.all(
      updated.map((u) =>
        fetch(`/api/admin/stores/${u.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: u.sortOrder }),
        }),
      ),
    ).then(refresh);
    setDragId(null);
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link href="/admin/dashboard" className="text-sm text-white/55 hover:text-white">
            ← Back to dashboard
          </Link>
          <h1 className="heading-display mt-1 text-3xl font-bold text-white">Manage Stores</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setEditing(blankStore())}
            className="btn-primary text-sm"
          >
            + New store
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search…"
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white placeholder:text-white/35"
        />
        <select
          value={region}
          onChange={(e) => setRegion(e.target.value as Region | "ALL")}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
        >
          <option value="ALL">All regions</option>
          {REGIONS.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <span className="text-sm text-white/55">{filtered.length} shown</span>
      </div>

      {msg && <p className="mb-3 text-sm text-amber-300">{msg}</p>}

      <div className="overflow-hidden rounded-2xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/5 text-xs uppercase tracking-wider text-white/55">
            <tr>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Region</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2">Limit</th>
              <th className="px-3 py-2">Items</th>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Glow</th>
              <th className="px-3 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((s) => (
              <tr
                key={s.id}
                draggable
                onDragStart={() => setDragId(s.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => onDrop(s.id)}
                className="border-t border-white/5 transition hover:bg-white/5"
              >
                <td className="px-3 py-2 font-medium text-white">{s.name}</td>
                <td className="px-3 py-2 text-white/65">{s.region}</td>
                <td className="px-3 py-2 text-white/65">{s.category}</td>
                <td className="px-3 py-2 text-white/65">{s.priceLimit ?? "—"}</td>
                <td className="px-3 py-2 text-white/65">{s.itemLimit ?? "—"}</td>
                <td className="px-3 py-2 text-white/65">{s.timeframe ?? "—"}</td>
                <td className="px-3 py-2">
                  <button
                    type="button"
                    onClick={() => toggleGlow(s)}
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      s.prismaticGlow
                        ? "bg-fuchsia-400/20 text-fuchsia-200"
                        : "bg-white/5 text-white/45"
                    }`}
                  >
                    {s.prismaticGlow ? "ON" : "off"}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <div className="flex justify-end gap-1">
                    <button
                      type="button"
                      onClick={() => setEditing(s)}
                      className="rounded-md bg-white/5 px-2 py-1 text-xs text-white/75 hover:bg-white/10"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(s.id)}
                      className="rounded-md bg-rose-500/15 px-2 py-1 text-xs text-rose-200 hover:bg-rose-500/25"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur" onClick={() => setEditing(null)}>
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={save}
            className="w-full max-w-2xl rounded-2xl border border-white/10 bg-ink-900 p-6"
          >
            <h2 className="heading-display text-xl font-bold text-white">
              {editing.id ? "Edit store" : "New store"}
            </h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Field label="Name *" value={editing.name ?? ""} onChange={(v) => setEditing({ ...editing, name: v })} />
              <Field label="Domain (logo source)" value={editing.domain ?? ""} onChange={(v) => setEditing({ ...editing, domain: v })} />
              <Select label="Region" value={editing.region ?? "USA"} options={REGIONS} onChange={(v) => setEditing({ ...editing, region: v as Region })} />
              <Select label="Category" value={editing.category ?? "Other"} options={CATEGORIES} onChange={(v) => setEditing({ ...editing, category: v as StoreCategory })} />
              <Field label="Price limit" value={editing.priceLimit ?? ""} onChange={(v) => setEditing({ ...editing, priceLimit: v })} placeholder="$2,000" />
              <Field label="Item limit" value={editing.itemLimit ?? ""} onChange={(v) => setEditing({ ...editing, itemLimit: v })} placeholder="2 items" />
              <Field label="Fee" value={editing.fee ?? ""} onChange={(v) => setEditing({ ...editing, fee: v })} placeholder="20%" />
              <Field label="Timeframe" value={editing.timeframe ?? ""} onChange={(v) => setEditing({ ...editing, timeframe: v })} placeholder="1-2 weeks" />
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/55">Notes</label>
                <textarea
                  value={editing.notes ?? ""}
                  onChange={(e) => setEditing({ ...editing, notes: e.target.value })}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/55">Logo URL (override)</label>
                <div className="mt-1 flex gap-2">
                  <input
                    value={editing.logoUrl ?? ""}
                    onChange={(e) => setEditing({ ...editing, logoUrl: e.target.value })}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                    placeholder="https://logo.clearbit.com/anker.com"
                  />
                  <button type="button" onClick={fetchLogo} disabled={busy || !editing.domain} className="btn-ghost text-xs whitespace-nowrap">
                    Auto-fetch
                  </button>
                </div>
                {editing.logoUrl && (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={editing.logoUrl} alt="logo preview" className="mt-2 h-12 w-12 rounded bg-white object-contain p-1" />
                )}
              </div>
              <div className="sm:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-white/55">Tags</label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {TAGS.map((t) => {
                    const active = (editing.tags ?? []).includes(t);
                    return (
                      <button
                        key={t}
                        type="button"
                        onClick={() => {
                          const set = new Set(editing.tags ?? []);
                          if (set.has(t)) set.delete(t); else set.add(t);
                          setEditing({ ...editing, tags: Array.from(set) });
                        }}
                        className={`rounded-full px-3 py-1 text-xs ${active ? "bg-amber-400/20 text-amber-100" : "bg-white/5 text-white/55"}`}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label className="flex items-center gap-2 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={Boolean(editing.prismaticGlow)}
                  onChange={(e) => setEditing({ ...editing, prismaticGlow: e.target.checked })}
                />
                <span className="text-sm text-white/75">Prismatic glow border</span>
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="btn-ghost text-sm">Cancel</button>
              <button type="submit" disabled={busy} className="btn-primary text-sm">{busy ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-white/55">{label}</label>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
      />
    </div>
  );
}

function Select({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-xs font-semibold uppercase tracking-wider text-white/55">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
      >
        {options.map((o) => (
          <option key={o} value={o} className="bg-ink-900">{o}</option>
        ))}
      </select>
    </div>
  );
}
