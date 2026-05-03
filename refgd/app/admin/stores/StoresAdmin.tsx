"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Store, Region, StoreCategory, StoreTag } from "@/lib/types";

const REGIONS: Region[] = ["USA", "CAD", "EU", "UK"];
const CATEGORIES: StoreCategory[] = ["Electronics", "Clothing", "Jewelry", "Food", "Meal Plans", "Home", "Other"];
const TAGS: StoreTag[] = ["fire", "diamond", "crown", "global", "new"];

/* v6.13.36 — Bulk-import keyword → category auto-detect.
   Each line of a paste is matched against these keyword sets in
   priority order; first hit wins. Falls back to "Other". */
const CATEGORY_KEYWORDS: Array<[StoreCategory, string[]]> = [
  ["Electronics", ["phone","iphone","laptop","mac","apple","samsung","sony","tv","monitor","camera","gpu","cpu","intel","amd","nvidia","pc","gaming","xbox","playstation","ps5","nintendo","switch","tablet","ipad","headphone","airpod","earbud","speaker","bose","jbl","drone","router","modem","ssd","hdd","ram","keyboard","mouse","gadget","electronic","tech","best buy","newegg","microcenter","bhphotovideo","anker","logitech","asus","dell","hp","lenovo","msi"]],
  ["Clothing", ["shirt","tee","jeans","pants","trouser","jacket","coat","hoodie","sweater","dress","skirt","short","sock","underwear","shoe","sneaker","boot","sandal","hat","cap","clothing","apparel","fashion","wear","outfit","nike","adidas","puma","reebok","under armour","gap","uniqlo","zara","hm ","h&m","levi","supreme","stussy","ssense","farfetch","mr porter","yoox","asos","shein","fashion nova","pacsun","hollister","abercrombie","aritzia","madewell","everlane"]],
  ["Jewelry", ["jewelry","jewellery","ring","necklace","bracelet","earring","pendant","watch","rolex","cartier","tiffany","pandora","swarovski","mejuri","gold","silver","diamond","gem"]],
  ["Food", ["food","grocery","groceries","snack","drink","beverage","coffee","tea","wine","beer","liquor","candy","chocolate","restaurant","ubereats","doordash","grubhub","instacart","wholefoods","trader joe","kroger","walmart grocery","amazon fresh"]],
  ["Meal Plans", ["meal plan","meal kit","mealplan","hellofresh","blue apron","factor","freshly","sunbasket","home chef","every plate","greenchef","gobble","daily harvest","nutrisystem","jenny craig"]],
  ["Home", ["home","furniture","kitchen","decor","bedding","mattress","pillow","sofa","couch","chair","table","desk","lamp","appliance","vacuum","dyson","kitchenaid","instant pot","pot","pan","cookware","cleaner","detergent","ikea","wayfair","west elm","cb2","crate","pottery barn","ashley","living spaces"]],
];

function detectCategory(text: string, allowed: string[]): StoreCategory {
  const haystack = text.toLowerCase();
  for (const [cat, words] of CATEGORY_KEYWORDS) {
    if (!allowed.includes(cat)) continue;
    if (words.some((w) => haystack.includes(w))) return cat;
  }
  return "Other";
}

type BulkRow = {
  name: string;
  domain: string;
  category: StoreCategory;
  region: Region;
  raw: string;
  ok: boolean;
  err?: string;
};

function parseBulkPaste(text: string, defaultRegion: Region, allowedCats: string[]): BulkRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const rows: BulkRow[] = [];
  for (const line of lines) {
    // Skip section dividers like "USA:" or "--- USA ---" (just track region).
    const regionHeader = line.match(/^[\s\-=#*]*\b(USA|US|CAD|CA|CANADA|EU|UK|GB|BRITAIN|EUROPE)\b[\s:\-]*$/i);
    if (regionHeader) continue;

    // Pipe-delimited "Name | category | domain"
    const parts = line.split("|").map((p) => p.trim()).filter(Boolean);
    let name = "";
    let category: StoreCategory | "" = "";
    let domain = "";
    if (parts.length >= 1) name = parts[0];
    if (parts.length >= 2) category = parts[1];
    if (parts.length >= 3) domain = parts[2];

    // Strip a trailing "(.com)" / domain in parens from the name.
    const parenDomain = name.match(/\(([^)]+\.[a-z]{2,})\)/i);
    if (parenDomain) {
      if (!domain) domain = parenDomain[1];
      name = name.replace(parenDomain[0], "").trim();
    }

    // Detect a bare domain inside the name, e.g. "Anker anker.com".
    if (!domain) {
      const m = name.match(/\b([a-z0-9-]+\.[a-z]{2,})(?:\/\S*)?\b/i);
      if (m) {
        domain = m[1];
        name = name.replace(m[0], "").trim();
      }
    }

    // Strip leading bullets / numbering.
    name = name.replace(/^[\-\*\u2022\d\.\)\s]+/, "").trim();
    if (!name) continue;

    // Auto-detect category if blank or not in allowed list.
    if (!category || !allowedCats.includes(category)) {
      category = detectCategory(`${name} ${domain}`, allowedCats);
    }

    rows.push({
      name,
      domain,
      category,
      region: defaultRegion,
      raw: line,
      ok: true,
    });
  }
  return rows;
}

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

  /* v6.13.36 — Live list of every category the system knows about.
     Sourced from BOTH the canned CATEGORIES const AND the in-memory
     stores' own category strings AND the /api/admin/categories
     extras. Used to populate the EditDialog datalist and the
     bulk-import auto-detect's allowed-set. */
  const allCategories = useMemo(() => {
    const set = new Set<string>(CATEGORIES);
    for (const s of stores) if (s.category) set.add(s.category);
    return Array.from(set);
  }, [stores]);

  // Bulk import panel state.
  const [bulkOpen, setBulkOpen] = useState(false);

    /* v6.13.67 — Auto-open the bulk panel when the page is loaded with
       ?bulk=1 (linked from the dashboard's "Bulk import stores" card).
       Saves the admin one click. */
    useEffect(() => {
      if (typeof window === "undefined") return;
      const sp = new URLSearchParams(window.location.search);
      if (sp.get("bulk") === "1") setBulkOpen(true);
    }, []);
  
  const [bulkText, setBulkText] = useState("");
  const [bulkRegion, setBulkRegion] = useState<Region>("USA");
  const [bulkRows, setBulkRows] = useState<BulkRow[]>([]);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ done: number; total: number } | null>(null);
  // Re-parse whenever the textarea / region / known-categories change.
  useEffect(() => {
    if (!bulkOpen) return;
    setBulkRows(parseBulkPaste(bulkText, bulkRegion, allCategories));
  }, [bulkText, bulkRegion, bulkOpen, allCategories]);

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
          {/* v6.13.67 — Bulk import button promoted from low-contrast
              btn-ghost (border-white/10 bg-white/5 text-white/85) to a
              vivid amber pill that is impossible to miss. The user
              repeatedly reported "i dont see bulk import button" even
              though the code was unconditionally rendered — root cause
              was simply that the ghost variant on dark background had
              ~10% contrast and blended in next to the bright + New
              store CTA. Now uses an amber outline + amber text so it
              visually pairs with the dashboard amber theme. */}
          <button
            type="button"
            onClick={() => setBulkOpen((v) => !v)}
            className="inline-flex items-center justify-center gap-2 rounded-full border-2 border-amber-300/70 bg-amber-400/10 px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-amber-100 shadow-[0_0_24px_-4px_rgba(245,185,69,0.45)] transition hover:border-amber-300 hover:bg-amber-400/20"
          >
            {bulkOpen ? "✕ Close bulk import" : "📋 Bulk import stores"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(blankStore())}
            className="btn-primary text-sm"
          >
            + New store
          </button>
        </div>
      </div>

      {bulkOpen && (
        <div className="mb-6 rounded-2xl border border-amber-300/30 bg-amber-400/[0.04] p-5">
          <h2 className="heading-display text-lg font-bold uppercase tracking-tight text-amber-100">
            Bulk import stores
          </h2>
          <p className="mt-1 text-xs text-white/60">
            Paste one store per line. Each line can be just a name
            (<code className="text-amber-200">Anker</code>), a name + domain
            (<code className="text-amber-200">Anker anker.com</code> or
            <code className="text-amber-200"> Anker (anker.com)</code>),
            or pipe-separated name | category | domain
            (<code className="text-amber-200">Anker | Electronics | anker.com</code>).
            We auto-detect the domain and category from the name when
            either is omitted. Lines like <code className="text-amber-200">USA:</code>
            are skipped.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
            <textarea
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              rows={10}
              placeholder={"Anker anker.com\nNike | Clothing\nApple\nWayfair (wayfair.com)"}
              className="w-full rounded-xl border border-white/10 bg-ink-900/60 px-3 py-2 font-mono text-xs text-white placeholder:text-white/30"
            />
            <div className="flex flex-col gap-2 text-xs">
              <label className="text-white/55">Default region</label>
              <select
                value={bulkRegion}
                onChange={(e) => setBulkRegion(e.target.value as Region)}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white"
              >
                {REGIONS.map((r) => <option key={r} value={r} className="bg-ink-900 text-white">{r}</option>)}
              </select>
              <p className="text-white/45">
                Detected: <span className="font-bold text-white">{bulkRows.length}</span> stores
              </p>
              <button
                type="button"
                disabled={bulkBusy || bulkRows.length === 0}
                onClick={async () => {
                  setBulkBusy(true);
                  setBulkProgress({ done: 0, total: bulkRows.length });
                  let ok = 0;
                  let fail = 0;
                  for (let i = 0; i < bulkRows.length; i++) {
                    const row = bulkRows[i];
                    try {
                      // Pre-register custom category so it appears in
                      // the public filter dropdown right away.
                      if (!CATEGORIES.includes(row.category)) {
                        try {
                          await fetch("/api/admin/categories", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ name: row.category }),
                          });
                        } catch { /* non-fatal */ }
                      }
                      const r = await fetch("/api/admin/stores", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: row.name,
                          domain: row.domain || null,
                          region: row.region,
                          category: row.category,
                          tags: [],
                          prismaticGlow: false,
                          sortOrder: 1000 + i,
                        }),
                      });
                      if (r.ok) ok++; else fail++;
                    } catch {
                      fail++;
                    }
                    setBulkProgress({ done: i + 1, total: bulkRows.length });
                  }
                  await refresh();
                  setBulkBusy(false);
                  setMsg(`Bulk import: ${ok} created, ${fail} failed.`);
                  if (fail === 0) {
                    setBulkText("");
                    setBulkOpen(false);
                  }
                }}
                className="btn-primary text-xs disabled:opacity-50"
              >
                {bulkBusy
                  ? `Importing ${bulkProgress?.done}/${bulkProgress?.total}…`
                  : `Import ${bulkRows.length} stores`}
              </button>
            </div>
          </div>
          {bulkRows.length > 0 && (
            <div className="mt-3 max-h-64 overflow-auto rounded-xl border border-white/10 bg-ink-900/40">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/5 text-white/55">
                  <tr>
                    <th className="px-2 py-1.5">Name</th>
                    <th className="px-2 py-1.5">Domain</th>
                    <th className="px-2 py-1.5">Category</th>
                    <th className="px-2 py-1.5">Region</th>
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.map((r, i) => (
                    <tr key={i} className="border-t border-white/5">
                      <td className="px-2 py-1.5 text-white">{r.name}</td>
                      <td className="px-2 py-1.5 text-white/55">{r.domain || "—"}</td>
                      <td className="px-2 py-1.5 text-amber-200">{r.category}</td>
                      <td className="px-2 py-1.5 text-white/55">{r.region}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

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
          <option value="ALL" className="bg-ink-900 text-white">All regions</option>
          {REGIONS.map((r) => (
            <option key={r} value={r} className="bg-ink-900 text-white">{r}</option>
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
              {/* v6.13.36 — Free-text category with a datalist of every
                  known + admin-added category. Admins can type "Beauty"
                  and the server will persist it as the actual category
                  (CATS validation was loosened). */}
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-white/55">Category</label>
                <input
                  list="admin-category-list"
                  value={editing.category ?? "Other"}
                  onChange={(e) => setEditing({ ...editing, category: e.target.value })}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
                  placeholder="Type or pick — e.g. Beauty, Toys, Auto"
                />
                <datalist id="admin-category-list">
                  {Array.from(new Set([...CATEGORIES, ...allCategories])).map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>
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
