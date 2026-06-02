"use client";

  import { useCallback, useMemo, useRef, useState } from "react";
  import type { ShopCategory, ShopProduct, ShopCustomField } from "@/lib/shop-catalog";
  import ShopMarkdown from "@/components/shop/ShopMarkdown";

  type Tab = "products" | "categories";

  const ACCENT_OPTIONS: { value: string; rgb: string }[] = [
    { value: "violet", rgb: "167,139,250" },
    { value: "amber",  rgb: "251,191,36"  },
    { value: "cyan",   rgb: "34,211,238"  },
    { value: "rose",   rgb: "244,114,182" },
    { value: "emerald",rgb: "52,211,153"  },
  ];

  const emptyProduct = (): ShopProduct => ({
    id: "",
    title: "",
    price: 0,
    currency: "USD",
    image: null,
    summary: "",
    description: "",
    chargeType: "ONE_TIME",
    customFields: [],
    categorySlugs: [],
    sortOrder: 0,
  });

  const emptyCategory = (): Omit<ShopCategory, "products"> => ({
    slug: "",
    title: "",
    tagline: "",
    longDescription: "",
    image: "",
    accent: "violet",
    rgb: "167,139,250",
    sortOrder: 0,
  });

  export default function ShopAdmin({ initialCategories }: { initialCategories: ShopCategory[] }) {
    const [categories, setCategories] = useState<ShopCategory[]>(initialCategories);
    const [tab, setTab] = useState<Tab>("products");
    const [editingProduct, setEditingProduct] = useState<ShopProduct | null>(null);
    const [editingCategory, setEditingCategory] = useState<Omit<ShopCategory, "products"> | null>(null);
    const [busy, setBusy] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const allProducts = useMemo(() => {
      const map = new Map<string, ShopProduct>();
      for (const c of categories) for (const p of c.products) map.set(p.id, p);
      return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
    }, [categories]);

    const refresh = useCallback(async () => {
      const r = await fetch("/api/shop-catalog", { cache: "no-store" });
      const j = await r.json();
      setCategories(j.categories ?? []);
    }, []);

    // ── Categories ──────────────────────────────────────────────────────────
    const saveCategory = async (c: Omit<ShopCategory, "products">, isNew: boolean) => {
      setBusy(true); setErr(null);
      try {
        const url = isNew ? "/api/admin/shop/categories" : `/api/admin/shop/categories/${c.slug}`;
        const r = await fetch(url, {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(c),
        });
        if (!r.ok) throw new Error((await r.json()).error || "Save failed");
        setEditingCategory(null);
        await refresh();
      } catch (e) { setErr((e as Error).message); }
      finally { setBusy(false); }
    };
    const removeCategory = async (slug: string) => {
      if (!confirm(`Delete category "${slug}"? Products inside will lose this category but won't be deleted.`)) return;
      setBusy(true); setErr(null);
      try {
        const r = await fetch(`/api/admin/shop/categories/${slug}`, { method: "DELETE" });
        if (!r.ok) throw new Error((await r.json()).error || "Delete failed");
        await refresh();
      } catch (e) { setErr((e as Error).message); }
      finally { setBusy(false); }
    };

    // ── Products ────────────────────────────────────────────────────────────
    const saveProduct = async (p: ShopProduct, isNew: boolean) => {
      setBusy(true); setErr(null);
      try {
        const url = isNew ? "/api/admin/shop/products" : `/api/admin/shop/products/${p.id}`;
        const r = await fetch(url, {
          method: isNew ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(p),
        });
        if (!r.ok) throw new Error((await r.json()).error || "Save failed");
        setEditingProduct(null);
        await refresh();
      } catch (e) { setErr((e as Error).message); }
      finally { setBusy(false); }
    };
    const removeProduct = async (id: string) => {
      if (!confirm(`Delete product "${id}"? This cannot be undone.`)) return;
      setBusy(true); setErr(null);
      try {
        const r = await fetch(`/api/admin/shop/products/${id}`, { method: "DELETE" });
        if (!r.ok) throw new Error((await r.json()).error || "Delete failed");
        await refresh();
      } catch (e) { setErr((e as Error).message); }
      finally { setBusy(false); }
    };

    return (
      <div className="space-y-6">
        <div className="flex gap-2 border-b border-white/10">
          <TabBtn active={tab==="products"} onClick={() => setTab("products")}>
            Products ({allProducts.length})
          </TabBtn>
          <TabBtn active={tab==="categories"} onClick={() => setTab("categories")}>
            Categories ({categories.length})
          </TabBtn>
        </div>

        {err && <div className="rounded-lg border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-200">{err}</div>}

        {tab === "products" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setEditingProduct(emptyProduct())}
                className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300"
              >
                + New product
              </button>
            </div>

            {/* ── Pinned unlisted product ── */}
            <div className="rounded-xl border border-amber-400/30 bg-amber-400/5 p-3">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-full border border-amber-400/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-amber-300">
                  Unlisted
                </span>
                <span className="text-xs font-semibold text-white/80">Custom Order — Name Your Price</span>
              </div>
              <p className="mb-3 text-xs leading-relaxed text-white/50">
                A standalone checkout page not shown in any public category. Buyers enter their own price and pay via Telegram Stars. Share the link directly with customers.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href="/shop-methods/custom-order"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/20"
                >
                  Open page →
                </a>
                <span className="font-mono text-[11px] text-white/35 select-all">
                  /shop-methods/custom-order
                </span>
                <span className="ml-auto text-[10px] text-white/30">
                  Content editable on the page itself (admin edit mode)
                </span>
              </div>
            </div>

            <div className="grid gap-2">
              {allProducts.map((p) => (
                <ProductRow
                  key={p.id}
                  product={p}
                  categories={categories}
                  onEdit={() => setEditingProduct(p)}
                  onDelete={() => removeProduct(p.id)}
                />
              ))}
            </div>
          </div>
        )}

        {tab === "categories" && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button
                onClick={() => setEditingCategory(emptyCategory())}
                className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300"
              >
                + New category
              </button>
            </div>
            <div className="grid gap-2">
              {categories.map((c) => (
                <div key={c.slug} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  {c.image && <img src={c.image} alt="" className="h-14 w-20 rounded-lg object-cover" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="font-semibold text-white">{c.title}</div>
                      <span className="text-xs text-white/40">/{c.slug}</span>
                      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase text-white/60">
                        {c.products.length} products
                      </span>
                    </div>
                    <div className="truncate text-xs text-white/55">{c.tagline}</div>
                  </div>
                  <button onClick={() => setEditingCategory({
                    slug: c.slug, title: c.title, tagline: c.tagline, longDescription: c.longDescription,
                    image: c.image, accent: c.accent, rgb: c.rgb, sortOrder: c.sortOrder,
                  })} className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">Edit</button>
                  <button onClick={() => removeCategory(c.slug)} className="rounded-md border border-rose-400/30 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10">Delete</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {editingProduct && (
          <ProductEditor
            initial={editingProduct}
            isNew={!allProducts.some((p) => p.id === editingProduct.id)}
            categories={categories}
            busy={busy}
            onCancel={() => setEditingProduct(null)}
            onSave={saveProduct}
          />
        )}
        {editingCategory && (
          <CategoryEditor
            initial={editingCategory}
            isNew={!categories.some((c) => c.slug === editingCategory.slug)}
            busy={busy}
            onCancel={() => setEditingCategory(null)}
            onSave={saveCategory}
          />
        )}
      </div>
    );
  }

  function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button onClick={onClick} className={`px-4 py-2 text-sm font-semibold border-b-2 transition ${active ? "border-amber-400 text-white" : "border-transparent text-white/55 hover:text-white"}`}>
        {children}
      </button>
    );
  }

  function ProductRow({ product, categories, onEdit, onDelete }: {
    product: ShopProduct; categories: ShopCategory[]; onEdit: () => void; onDelete: () => void;
  }) {
    const cats = categories.filter((c) => product.categorySlugs.includes(c.slug));
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
        {product.image
          ? <img src={product.image} alt="" className="h-14 w-14 rounded-lg object-cover" />
          : <div className="h-14 w-14 rounded-lg bg-white/5" />}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="font-semibold text-white truncate">{product.title}</div>
            <span className="rounded-md bg-amber-400/15 px-1.5 py-0.5 text-xs font-semibold text-amber-200">
              ${product.price}
            </span>
          </div>
          <div className="mt-1 flex flex-wrap gap-1">
            {cats.length === 0 && <span className="text-xs text-rose-300">⚠ no category</span>}
            {cats.map((c) => (
              <span key={c.slug} className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70">{c.title}</span>
            ))}
          </div>
        </div>
        <button onClick={onEdit} className="rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">Edit</button>
        <button onClick={onDelete} className="rounded-md border border-rose-400/30 px-3 py-1.5 text-xs text-rose-200 hover:bg-rose-500/10">Delete</button>
      </div>
    );
  }

  function CategoryEditor({ initial, isNew, busy, onCancel, onSave }: {
    initial: Omit<ShopCategory, "products">; isNew: boolean; busy: boolean;
    onCancel: () => void; onSave: (c: Omit<ShopCategory, "products">, isNew: boolean) => void;
  }) {
    const [c, setC] = useState(initial);
    return (
      <Overlay onClose={onCancel}>
        <h2 className="heading-display text-2xl font-bold text-white mb-4">
          {isNew ? "New category" : `Edit "${initial.title}"`}
        </h2>
        <div className="space-y-3">
          <Field label="Title">
            <input className={inputCls} value={c.title} onChange={(e) => setC({ ...c, title: e.target.value })} />
          </Field>
          <Field label="Slug (URL path)">
            <input className={inputCls} value={c.slug} disabled={!isNew} placeholder="auto from title if blank"
                   onChange={(e) => setC({ ...c, slug: e.target.value })} />
          </Field>
          <Field label="Tagline">
            <input className={inputCls} value={c.tagline} onChange={(e) => setC({ ...c, tagline: e.target.value })} />
          </Field>
          <Field label="Long description (markdown)">
            <MarkdownEditor value={c.longDescription} onChange={(v) => setC({ ...c, longDescription: v })} rows={5} />
          </Field>
          <Field label="Cover image">
            <ImageUploader value={c.image} onChange={(url) => setC({ ...c, image: url })} />
          </Field>
          <Field label="Accent colour">
            <select className={inputCls} value={c.accent} onChange={(e) => {
              const opt = ACCENT_OPTIONS.find(o => o.value === e.target.value);
              setC({ ...c, accent: e.target.value, rgb: opt?.rgb ?? c.rgb });
            }}>
              {ACCENT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.value}</option>)}
            </select>
          </Field>
          <Field label="Sort order (lower = first)">
            <input type="number" className={inputCls} value={c.sortOrder} onChange={(e) => setC({ ...c, sortOrder: Number(e.target.value) })} />
          </Field>
        </div>
        <Footer busy={busy} onCancel={onCancel} onSave={() => onSave(c, isNew)} />
      </Overlay>
    );
  }

  function ProductEditor({ initial, isNew, categories, busy, onCancel, onSave }: {
    initial: ShopProduct; isNew: boolean; categories: ShopCategory[]; busy: boolean;
    onCancel: () => void; onSave: (p: ShopProduct, isNew: boolean) => void;
  }) {
    const [p, setP] = useState(initial);
    const toggleCat = (slug: string) => setP({
      ...p,
      categorySlugs: p.categorySlugs.includes(slug)
        ? p.categorySlugs.filter(s => s !== slug)
        : [...p.categorySlugs, slug],
    });
    const updateCf = (i: number, patch: Partial<ShopCustomField>) => setP({
      ...p,
      customFields: p.customFields.map((cf, idx) => idx === i ? { ...cf, ...patch } : cf),
    });
    const addCf = () => setP({ ...p, customFields: [...p.customFields, { name: "", required: false, placeholder: "", defaultValue: "", type: "TEXT" }] });
    const removeCf = (i: number) => setP({ ...p, customFields: p.customFields.filter((_, idx) => idx !== i) });

    return (
      <Overlay onClose={onCancel}>
        <h2 className="heading-display text-2xl font-bold text-white mb-4">
          {isNew ? "New product" : `Edit "${initial.title}"`}
        </h2>
        <div className="space-y-3">
          <Field label="Title">
            <input className={inputCls} value={p.title} onChange={(e) => setP({ ...p, title: e.target.value })} />
          </Field>
          <Field label="ID (URL slug)">
            <input className={inputCls} value={p.id} disabled={!isNew} placeholder="auto from title if blank"
                   onChange={(e) => setP({ ...p, id: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price">
              <input type="number" step="0.01" className={inputCls} value={p.price} onChange={(e) => setP({ ...p, price: Number(e.target.value) })} />
            </Field>
            <Field label="Currency">
              <input className={inputCls} value={p.currency} onChange={(e) => setP({ ...p, currency: e.target.value })} />
            </Field>
          </div>
          <Field label="Charge type">
            <select className={inputCls} value={p.chargeType} onChange={(e) => setP({ ...p, chargeType: e.target.value })}>
              <option value="ONE_TIME">One-time payment</option>
              <option value="RECURRING">Recurring / subscription</option>
            </select>
          </Field>
          <Field label="Image">
            <ImageUploader value={p.image ?? ""} onChange={(url) => setP({ ...p, image: url || null })} />
          </Field>
          <Field label="Summary (short)">
            <input className={inputCls} value={p.summary} onChange={(e) => setP({ ...p, summary: e.target.value })} />
          </Field>
          <Field label="Description (markdown)">
            <MarkdownEditor value={p.description} onChange={(v) => setP({ ...p, description: v })} rows={12} />
          </Field>
          <Field label="Categories (a product may belong to several)">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c.slug} type="button" onClick={() => toggleCat(c.slug)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    p.categorySlugs.includes(c.slug)
                      ? "border-amber-400 bg-amber-400/20 text-amber-100"
                      : "border-white/15 text-white/65 hover:bg-white/5"
                  }`}>
                  {c.title}
                </button>
              ))}
              {categories.length === 0 && <span className="text-xs text-white/40">No categories yet — create one first.</span>}
            </div>
          </Field>
          <Field label="Checkout custom fields">
            <div className="space-y-2">
              {p.customFields.map((cf, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.02] p-2">
                  <input className={inputCls + " flex-1"} placeholder="Field name (e.g. Username)" value={cf.name} onChange={(e) => updateCf(i, { name: e.target.value })} />
                  <input className={inputCls + " flex-1"} placeholder="Placeholder" value={cf.placeholder ?? ""} onChange={(e) => updateCf(i, { placeholder: e.target.value })} />
                  <label className="flex items-center gap-1 text-xs text-white/70">
                    <input type="checkbox" checked={cf.required} onChange={(e) => updateCf(i, { required: e.target.checked })} />
                    required
                  </label>
                  <button type="button" onClick={() => removeCf(i)} className="text-rose-300 text-sm">×</button>
                </div>
              ))}
              <button type="button" onClick={addCf} className="text-xs text-amber-200 hover:text-amber-100">+ Add field</button>
            </div>
          </Field>
          <Field label="Sort order within category (lower = first)">
            <input type="number" className={inputCls} value={p.sortOrder} onChange={(e) => setP({ ...p, sortOrder: Number(e.target.value) })} />
          </Field>
        </div>
        <Footer busy={busy} onCancel={onCancel} onSave={() => onSave(p, isNew)} />
      </Overlay>
    );
  }

  const inputCls = "w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-300 focus:outline-none";

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (
      <label className="block">
        <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-white/60">{label}</span>
        {children}
      </label>
    );
  }

  function Footer({ busy, onCancel, onSave }: { busy: boolean; onCancel: () => void; onSave: () => void }) {
    return (
      <div className="mt-6 flex justify-end gap-2 border-t border-white/10 pt-4">
        <button onClick={onCancel} disabled={busy} className="rounded-lg border border-white/15 px-4 py-2 text-sm text-white/80 hover:bg-white/5 disabled:opacity-50">
          Cancel
        </button>
        <button onClick={onSave} disabled={busy} className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black hover:bg-amber-300 disabled:opacity-50">
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    );
  }

  function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
    return (
      <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm" onClick={onClose}>
        <div onClick={(e) => e.stopPropagation()}
             className="my-16 max-h-[calc(100vh-8rem)] w-full max-w-2xl overflow-y-auto overscroll-contain rounded-2xl border border-white/15 bg-[#0c0c14] p-6 shadow-2xl">
          {children}
        </div>
      </div>
    );
  }

  function ImageUploader({ value, onChange }: { value: string; onChange: (url: string) => void }) {
    const [uploading, setUploading] = useState(false);
    const [err, setErr] = useState<string | null>(null);

    const upload = async (file: File) => {
      setUploading(true); setErr(null);
      try {
        const fd = new FormData(); fd.append("file", file);
        const r = await fetch("/api/admin/upload", { method: "POST", body: fd });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Upload failed");
        onChange(j.url);
      } catch (e) { setErr((e as Error).message); }
      finally { setUploading(false); }
    };

    return (
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {value
            ? <img src={value} alt="" className="h-16 w-24 rounded-lg object-cover border border-white/10" />
            : <div className="h-16 w-24 rounded-lg border border-dashed border-white/20" />}
          <div className="flex-1 space-y-2">
            <input type="text" className={inputCls} value={value} placeholder="/shop-images/… or paste URL"
                   onChange={(e) => onChange(e.target.value)} />
            <div className="flex items-center gap-2">
              <label className="cursor-pointer rounded-md border border-white/15 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">
                {uploading ? "Uploading…" : "Upload image"}
                <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,image/avif" hidden
                       onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
              </label>
              {value && (
                <button type="button" onClick={() => onChange("")} className="text-xs text-rose-300 hover:text-rose-200">
                  Clear
                </button>
              )}
            </div>
            {err && <div className="text-xs text-rose-300">{err}</div>}
          </div>
        </div>
      </div>
    );
  }

  function MarkdownEditor({
    value,
    onChange,
    rows = 12,
  }: {
    value: string;
    onChange: (val: string) => void;
    rows?: number;
  }) {
    const ref = useRef<HTMLTextAreaElement>(null);
    const [preview, setPreview] = useState(false);

    /** Run a transformation against the current textarea selection, then restore focus + cursor. */
    const apply = (
      fn: (start: number, end: number, sel: string) => { text: string; selStart: number; selEnd: number },
    ) => {
      const ta = ref.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const sel = value.slice(start, end);
      const result = fn(start, end, sel);
      onChange(result.text);
      requestAnimationFrame(() => {
        ta.focus();
        ta.setSelectionRange(result.selStart, result.selEnd);
      });
    };

    /** Wrap selected text (or a placeholder) in prefix + suffix. */
    const wrap = (prefix: string, suffix: string, placeholder = "text") =>
      apply((start, end, sel) => {
        const content = sel || placeholder;
        const text = value.slice(0, start) + prefix + content + suffix + value.slice(end);
        return { text, selStart: start + prefix.length, selEnd: start + prefix.length + content.length };
      });

    /** Prefix each selected line (or a placeholder "item") with a string. */
    const prefixLines = (makePrefix: (lineIndex: number) => string) =>
      apply((start, end, sel) => {
        const lines = (sel || "item").split("\n");
        const prefixed = lines.map((l, i) => makePrefix(i) + l).join("\n");
        const text = value.slice(0, start) + prefixed + value.slice(end);
        return { text, selStart: start, selEnd: start + prefixed.length };
      });

    /** Insert a snippet at the cursor (replaces any selection). */
    const insert = (snippet: string) =>
      apply((start, end) => {
        const text = value.slice(0, start) + snippet + value.slice(end);
        return { text, selStart: start + snippet.length, selEnd: start + snippet.length };
      });

    type ToolBtn = { label: string; title: string; bold?: boolean; action: () => void };
    const TOOLS: Array<ToolBtn | "sep"> = [
      { label: "B",   title: "Bold",            bold: true, action: () => wrap("**", "**") },
      { label: "I",   title: "Italic",                      action: () => wrap("_", "_") },
      { label: "S",   title: "Strikethrough",               action: () => wrap("~~", "~~") },
      "sep",
      { label: "H",   title: "Heading (## …)",              action: () => prefixLines(() => "## ") },
      { label: "—",   title: "Horizontal rule",             action: () => insert("\n\n---\n\n") },
      "sep",
      { label: "❝",   title: "Blockquote",                  action: () => prefixLines(() => "> ") },
      { label: "</>", title: "Inline code",                  action: () => wrap("`", "`", "code") },
      { label: "```", title: "Code block",                   action: () => wrap("```\n", "\n```", "code here") },
      "sep",
      { label: "🔗",  title: "Link",                         action: () => wrap("[", "](url)", "link text") },
      { label: "🖼",  title: "Image",                        action: () => insert("![alt text](url)") },
      "sep",
      { label: "•≡",  title: "Bullet list",                  action: () => prefixLines(() => "- ") },
      { label: "1≡",  title: "Ordered list",                 action: () => prefixLines((i) => `${i + 1}. `) },
    ];

    return (
      <div className="overflow-hidden rounded-lg border border-white/15 transition-colors focus-within:border-amber-300">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-0.5 border-b border-white/10 bg-white/[0.04] px-2 py-1.5">
          {TOOLS.map((t, i) =>
            t === "sep" ? (
              <span key={`sep${i}`} className="mx-1 h-4 w-px shrink-0 bg-white/15" />
            ) : (
              <button
                key={t.title}
                type="button"
                title={t.title}
                onMouseDown={(e) => { e.preventDefault(); t.action(); }}
                className={`min-w-[26px] rounded px-1.5 py-0.5 text-xs text-white/60 transition hover:bg-white/10 hover:text-white ${t.bold ? "font-bold" : "font-mono"}`}
              >
                {t.label}
              </button>
            ),
          )}
          <span className="flex-1" />
          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); setPreview((v) => !v); }}
            className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider transition ${preview ? "bg-amber-400/20 text-amber-300" : "text-white/35 hover:text-white/60"}`}
          >
            {preview ? "← Edit" : "Preview"}
          </button>
        </div>

        {/* Editor / Preview pane */}
        {preview ? (
          <div className="min-h-[180px] overflow-y-auto bg-white px-4 py-4">
            <ShopMarkdown source={value} className="text-sm" />
            {!value.trim() && <p className="text-xs italic text-gray-400">Nothing to preview yet.</p>}
          </div>
        ) : (
          <textarea
            ref={ref}
            rows={rows}
            className="block w-full resize-y bg-black/30 px-3 py-3 font-mono text-sm text-white placeholder:text-white/30 focus:outline-none"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Write your description here — markdown is supported"
            spellCheck={false}
          />
        )}
      </div>
    );
  }
  