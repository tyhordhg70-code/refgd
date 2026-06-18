import type { Region, Store, StoreTag } from "@/lib/types";
import { getPool, initDb } from "@/lib/db";
import {
  getCategoryLabels,
  getExtraCategories,
  getCategoryOrder,
  CANNED_CATEGORIES,
} from "@/lib/categories-store";
import { getAllContentMap } from "@/lib/content";
import {
  getTelegraphContent,
  getStoreInfoByDomain,
  type TelegraphContent,
} from "@/data/telegraph-content";

/**
 * HIDDEN, PLAIN-TEXT MIRROR of the live store list — one URL per region:
 *   /raw/usa   /raw/cad   /raw/eu   /raw/uk
 *
 * Purpose: a fully scrapeable (e.g. Jina AI) clone of every field a store
 * carries on /store-list — name, domain, regions, categories (+the cosmetic
 * label overrides), price/item limits, fee, timeframe, tags, notes, and the
 * full "info"/telegraph popup content — as a bare HTML document with no app
 * chrome, fonts, CSS, or hydration scripts.
 *
 * ALWAYS IN SYNC: this route reads the live database on EVERY request,
 * bypassing the in-process store cache (the same "query every request"
 * approach lib/content.ts already uses), so an admin edit is reflected
 * immediately even on a multi-worker Render deployment where another
 * worker's cache could otherwise be stale. Stores come straight from the
 * `stores` table (same SQL + row mapping as lib/stores.ts); category
 * names/labels/order come from the cache-disabled content_blocks reads;
 * info-popup overrides come from getAllContentMap(). Any add/remove/edit
 * of a store, category, label, fee, limit, note, or tag shows up here
 * automatically.
 *
 * SAFETY: this file is purely additive and read-only. It edits NO existing
 * file, imports no client components, performs no DB writes, and shares
 * only read paths, so it cannot alter or break /store-list in any way.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const REGION_BY_SLUG: Record<string, Region> = {
  usa: "USA",
  us: "USA",
  "united-states": "USA",
  america: "USA",
  cad: "CAD",
  ca: "CAD",
  canada: "CAD",
  eu: "EU",
  europe: "EU",
  uk: "UK",
  gb: "UK",
  "united-kingdom": "UK",
  britain: "UK",
};

const REGION_FULL: Record<Region, string> = {
  USA: "United States (USA)",
  CAD: "Canada (CAD)",
  EU: "European Union (EU)",
  UK: "United Kingdom (UK)",
};

// Mirrors the human labels shown on the store cards' tag chips.
const TAG_TEXT: Record<StoreTag, string> = {
  fire: "🔥 hot",
  diamond: "💎 premium",
  crown: "👑 luxury",
  global: "🌎 worldwide",
  new: "✨ new",
};

/* ------------------------------------------------------------------ *
 * Fresh store read — mirrors lib/stores.ts row mapping EXACTLY, but
 * always hits the DB (never the in-process cache) so the mirror can't
 * serve stale rows on a worker that didn't handle the admin write.
 * ------------------------------------------------------------------ */

function toIso(v: unknown): string {
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "string" && v) {
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v : d.toISOString();
  }
  return new Date().toISOString();
}

function parseJsonArray<T>(raw: unknown, fallback: T): T[] {
  if (raw == null) return [fallback];
  const s = String(raw).trim();
  if (!s) return [fallback];
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed))
      return parsed.length > 0 ? (parsed as T[]) : [fallback];
    return [parsed as T];
  } catch {
    return [s as unknown as T];
  }
}

function parseTags(raw: unknown): StoreTag[] {
  if (raw == null) return [];
  try {
    const parsed = JSON.parse(String(raw) || "[]");
    return Array.isArray(parsed) ? (parsed as StoreTag[]) : [];
  } catch {
    return [];
  }
}

function rowToStore(row: Record<string, unknown>): Store {
  return {
    id: row.id as string,
    name: row.name as string,
    domain: (row.domain as string | null) ?? null,
    regions: parseJsonArray<Region>(row.region, "USA"),
    categories: parseJsonArray<string>(row.category, "Other"),
    priceLimit: (row.price_limit as string | null) ?? null,
    itemLimit: (row.item_limit as string | null) ?? null,
    fee: (row.fee as string | null) ?? null,
    timeframe: (row.timeframe as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    tags: parseTags(row.tags),
    prismaticGlow: Boolean(row.prismatic_glow),
    logoUrl: (row.logo_url as string | null) ?? null,
    rawText: (row.raw_text as string | null) ?? null,
    sortOrder: Number(row.sort_order ?? 0),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

async function loadStoresFresh(region: Region): Promise<Store[]> {
  await initDb();
  const { rows } = await getPool().query(
    "SELECT * FROM stores ORDER BY sort_order ASC, name ASC",
  );
  return (rows as Record<string, unknown>[])
    .map(rowToStore)
    .filter((s) => s.regions.includes(region));
}

/** Build the merged category taxonomy exactly like getAllCategoriesMerged,
 *  but using the FRESH region stores for the "used" set so it can't lag. */
function mergeCategories(
  stores: Store[],
  extras: string[],
  order: string[],
): string[] {
  const used = new Set(stores.flatMap((s) => s.categories).filter(Boolean));
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (c: string) => {
    if (c && !seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  };
  order.forEach(push);
  CANNED_CATEGORIES.forEach(push);
  extras.forEach(push);
  Array.from(used)
    .sort((a, b) => a.localeCompare(b))
    .forEach(push);
  return out;
}

/* ------------------------------------------------------------------ *
 * Text helpers
 * ------------------------------------------------------------------ */

function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Decode the small set of HTML entities the mirrored info HTML uses. The
 *  result is later re-escaped by esc() before it lands in the page, so this
 *  must turn entities back into their real characters (no double-encoding). */
function decodeEntities(input: string): string {
  return input
    .replace(/&nbsp;/gi, " ")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&hellip;/gi, "…")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_m, d: string) => {
      try {
        return String.fromCodePoint(Number(d));
      } catch {
        return "";
      }
    })
    .replace(/&#x([0-9a-f]+);/gi, (_m, h: string) => {
      try {
        return String.fromCodePoint(parseInt(h, 16));
      } catch {
        return "";
      }
    })
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&");
}

/** Convert the stored info/telegraph HTML into readable plain text. The HTML
 *  is sanitised/controlled, but to be safe we OUTPUT text (esc()'d by the
 *  caller) — we never inject the raw HTML into this page. */
function htmlToText(html: string): string {
  let s = html || "";
  s = s.replace(/\r\n?/g, "\n");
  // <a href="url">text</a> -> "text (url)"
  s = s.replace(
    /<a\b[^>]*?href\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
    (_m, href: string, txt: string) => {
      const t = txt.replace(/<[^>]+>/g, "").trim();
      return t ? `${t} (${href})` : href;
    },
  );
  // <img src alt> -> "[image: alt | src]"
  s = s.replace(/<img\b[^>]*>/gi, (m: string) => {
    const src = (m.match(/src\s*=\s*"([^"]*)"/i) || [])[1] || "";
    const alt = (m.match(/alt\s*=\s*"([^"]*)"/i) || [])[1] || "";
    return src ? `\n[image: ${alt ? `${alt} | ` : ""}${src}]\n` : "";
  });
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<hr\s*\/?>/gi, "\n----------\n");
  s = s.replace(/<li\b[^>]*>/gi, "\n• ");
  s = s.replace(
    /<\/(p|div|li|ul|ol|h[1-6]|blockquote|figure|figcaption|tr|table|section|article)>/gi,
    "\n",
  );
  s = s.replace(
    /<(p|div|h[1-6]|blockquote|figure|figcaption|ul|ol|tr|table|section|article)\b[^>]*>/gi,
    "\n",
  );
  s = s.replace(/<[^>]+>/g, ""); // strip any remaining tags
  s = decodeEntities(s);
  s = s
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ");
  return s.trim();
}

/** Render multi-line plain text as escaped <p>/<br> paragraphs (clean for
 *  markdown converters / scrapers). */
function textToParagraphs(text: string): string {
  const t = (text ?? "").toString();
  if (!t.trim()) return "";
  return t
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((block) => `<p>${esc(block).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

/** Pull every [label](url) link out of a note string. */
function extractNoteLinks(notes: string): { label: string; url: string }[] {
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  const out: { label: string; url: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(notes))) out.push({ label: m[1] ?? "", url: m[2] ?? "" });
  return out;
}

/** Resolve the full "info" popup content a store would show: from any
 *  mirrored telegra.ph note links AND from a domain match (e.g. StubHub),
 *  preferring the admin override saved under content_blocks `info.<id>.html`
 *  EXACTLY like InfoModal (an explicitly-saved value wins even when empty —
 *  key presence, not truthiness), de-duplicated by content id. Blocks that
 *  resolve to empty text (e.g. an admin who cleared the popup) are dropped,
 *  matching the blank popup a visitor would see. */
function resolveStoreInfo(
  store: Store,
  contentMap: Record<string, string>,
): { title: string; text: string }[] {
  const entries: TelegraphContent[] = [];
  const seen = new Set<string>();
  const push = (c: TelegraphContent | null) => {
    if (c && !seen.has(c.id)) {
      seen.add(c.id);
      entries.push(c);
    }
  };
  if (store.notes) {
    for (const { url } of extractNoteLinks(store.notes)) {
      push(getTelegraphContent(url));
    }
  }
  push(getStoreInfoByDomain(store.domain));
  return entries
    .map((e) => {
      const key = `info.${e.id}.html`;
      const html = Object.prototype.hasOwnProperty.call(contentMap, key)
        ? contentMap[key]
        : e.html;
      return { title: e.title, text: htmlToText(html || "") };
    })
    .filter((b) => b.text.trim().length > 0);
}

function categoryDisplay(key: string, labels: Record<string, string>): string {
  const label = labels[key];
  return label && label !== key ? `${label} (${key})` : key;
}

function renderStore(
  store: Store,
  idx: number,
  labels: Record<string, string>,
  contentMap: Record<string, string>,
): string {
  const cats = (store.categories ?? []).map((k) => categoryDisplay(k, labels));
  const tags = (store.tags ?? []).map((t) => `${TAG_TEXT[t] ?? t} (${t})`);
  const info = resolveStoreInfo(store, contentMap);

  const rows: string[] = [
    `<li><strong>Name:</strong> ${esc(store.name)}</li>`,
    `<li><strong>Domain:</strong> ${store.domain ? esc(store.domain) : "—"}</li>`,
    `<li><strong>Regions:</strong> ${esc((store.regions ?? []).join(", ") || "—")}</li>`,
    `<li><strong>Categories:</strong> ${cats.length ? esc(cats.join(", ")) : "—"}</li>`,
    `<li><strong>Price limit:</strong> ${esc(store.priceLimit ?? "—")}</li>`,
    `<li><strong>Item limit:</strong> ${esc(store.itemLimit ?? "—")}</li>`,
    `<li><strong>Fee:</strong> ${esc(store.fee ?? "—")}</li>`,
    `<li><strong>Timeframe:</strong> ${esc(store.timeframe ?? "—")}</li>`,
    `<li><strong>Tags:</strong> ${tags.length ? esc(tags.join(", ")) : "—"}</li>`,
    `<li><strong>Featured glow:</strong> ${store.prismaticGlow ? "yes" : "no"}</li>`,
    `<li><strong>Sort order:</strong> ${esc(store.sortOrder)}</li>`,
    `<li><strong>Logo URL:</strong> ${store.logoUrl ? esc(store.logoUrl) : "—"}</li>`,
    `<li><strong>Store ID:</strong> ${esc(store.id)}</li>`,
    `<li><strong>Created:</strong> ${esc(store.createdAt)}</li>`,
    `<li><strong>Updated:</strong> ${esc(store.updatedAt)}</li>`,
  ];

  const parts: string[] = [
    `<article>`,
    `<h3>${idx}. ${esc(store.name)}</h3>`,
    `<ul>`,
    rows.join("\n"),
    `</ul>`,
  ];

  if (store.notes && store.notes.trim()) {
    parts.push(`<p><strong>Notes:</strong></p>`);
    parts.push(textToParagraphs(store.notes));
  }
  if (store.rawText && store.rawText.trim()) {
    parts.push(`<p><strong>Original line:</strong> ${esc(store.rawText)}</p>`);
  }
  for (const block of info) {
    parts.push(`<p><strong>Full info — ${esc(block.title)}:</strong></p>`);
    parts.push(textToParagraphs(block.text));
  }
  parts.push(`</article>`);
  parts.push(`<hr>`);
  return parts.join("\n");
}

function buildDocument(
  region: Region,
  stores: Store[],
  mergedCategories: string[],
  labels: Record<string, string>,
  contentMap: Record<string, string>,
): string {
  const catList = mergedCategories
    .map((k) => `<li>${esc(categoryDisplay(k, labels))}</li>`)
    .join("\n");

  const storeList = stores
    .map((s, i) => renderStore(s, i + 1, labels, contentMap))
    .join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>RefundGod — Store List (RAW plain text) — ${esc(REGION_FULL[region])}</title>
</head>
<body>
<h1>RefundGod — Store List (RAW plain-text mirror)</h1>
<p><strong>Region:</strong> ${esc(REGION_FULL[region])}</p>
<p>This is an auto-generated, plain-text mirror of the live store list, intended for scraping. It is rebuilt from the live database on every request, so it always stays in sync with the /store-list page — any add, remove, or edit of a store, category, label, fee, limit, note, or tag is reflected here automatically.</p>
<p><strong>Total stores in this region:</strong> ${stores.length}</p>
<p><strong>Generated at:</strong> ${esc(new Date().toISOString())}</p>
<h2>Categories (${mergedCategories.length})</h2>
<ul>
${catList}
</ul>
<h2>Stores (${stores.length})</h2>
${storeList || "<p>No stores in this region.</p>"}
</body>
</html>`;
}

function baseHeaders(): HeadersInit {
  return {
    "content-type": "text/html; charset=utf-8",
    "cache-control": "no-store, no-cache, must-revalidate, max-age=0",
    "x-robots-tag": "noindex, nofollow",
  };
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ region: string }> },
): Promise<Response> {
  const { region: slug } = await ctx.params;
  const region = REGION_BY_SLUG[(slug || "").toLowerCase()];

  if (!region) {
    const valid = "usa, cad, eu, uk";
    const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>RefundGod RAW — not found</title></head>
<body>
<h1>Unknown region</h1>
<p>"${esc(slug)}" is not a valid region. Valid regions: ${esc(valid)}.</p>
<p>Try: /raw/usa, /raw/cad, /raw/eu, /raw/uk</p>
</body>
</html>`;
    return new Response(html, { status: 404, headers: baseHeaders() });
  }

  try {
    const [stores, contentMap, labels, extras, order] = await Promise.all([
      loadStoresFresh(region),
      getAllContentMap(),
      getCategoryLabels(),
      getExtraCategories(),
      getCategoryOrder(),
    ]);
    const mergedCategories = mergeCategories(stores, extras, order);
    const html = buildDocument(
      region,
      stores,
      mergedCategories,
      labels,
      contentMap,
    );
    return new Response(html, { status: 200, headers: baseHeaders() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>RefundGod RAW — error</title></head>
<body>
<h1>Temporary error generating the raw store list</h1>
<p>${esc(msg.slice(0, 300))}</p>
</body>
</html>`;
    return new Response(html, { status: 500, headers: baseHeaders() });
  }
}
