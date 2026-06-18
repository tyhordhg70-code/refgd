import type { Region, Store, StoreTag } from "@/lib/types";
import { getPool, initDb } from "@/lib/db";
import { getAllContentMap } from "@/lib/content";
import { getStoreInfoByDomain } from "@/data/telegraph-content";

/**
 * HIDDEN, PLAIN-TEXT MIRROR of the live store list — one URL per region:
 *   /raw/usa   /raw/cad   /raw/eu   /raw/uk
 *
 * Purpose: a fully scrapeable (e.g. Jina AI) clone of the store list in the
 * SAME simple, plain-HTML layout the original site uses — each store is ONE
 * line built from its LIVE, admin-editable fields (tag emoji + name + the
 * structured limit/items/fee/time tiles + the notes detail), with any links
 * kept clickable.
 *
 * IMPORTANT — uses LIVE data, never the reference import: the line is
 * composed from the store's current `name`, `tags`, the structured metric
 * tiles (`priceLimit`, `itemLimit`, `fee`, `timeframe`) and `notes` — the
 * exact same fields the live store card renders — NEVER from the frozen
 * `rawText`. `rawText` is the ORIGINAL one-line entry scraped from
 * refundgod.io at import time and it does NOT change when a store is edited,
 * so rendering it made this mirror show the reference site's data instead of
 * the live store list. Every field used here is admin-editable, so any edit
 * on /store-list is reflected here automatically. A metric tile is appended
 * only when its value isn't already spelled out in the notes, so rows whose
 * notes already carry the detail aren't shown twice.
 *
 * Deliberately MINIMAL: no internal metadata (featured glow, sort order,
 * logo URL, store id, created/updated), no "original line" label, and no
 * dump of the info-popup ("boxcard") text — for stores that have a popup we
 * keep ONLY the link(s) so a reader can follow them for the full info.
 *
 * ALWAYS IN SYNC: this route reads the live database on EVERY request,
 * bypassing the in-process store cache (the same "query every request"
 * approach lib/content.ts already uses), so an admin edit is reflected
 * immediately even on a multi-worker Render deployment where another
 * worker's cache could otherwise be stale. Stores come straight from the
 * `stores` table (same SQL + row mapping as lib/stores.ts); info-popup
 * overrides come from getAllContentMap(). Any add/remove/edit of a store,
 * fee, limit, note, or tag shows up here automatically.
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

// Bare emoji for each featured tag — matches the chip emoji on the store
// cards, but WITHOUT the word ("🔥" not "🔥 hot").
const TAG_EMOJI: Record<StoreTag, string> = {
  fire: "🔥",
  diamond: "💎",
  crown: "👑",
  global: "🌎",
  new: "✨",
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

// Normalize for "is this value already in the notes" checks: lowercase and drop
// all whitespace so "1 item" matches "1item", "$2,000" matches "$2,000", etc.
function norm(value: string): string {
  return value.toLowerCase().replace(/\s+/g, "");
}

// Build a safe anchor. Coerce a bare domain to https://, then validate via the
// URL parser and only allow http/https/mailto/tel — anything else (javascript:,
// data:, relative, garbage) falls back to rendering the label as plain text, so
// no unsafe scheme can ever reach the href.
const SAFE_SCHEMES = new Set(["http:", "https:", "mailto:", "tel:"]);
function anchor(href: string, label: string): string {
  const clean = href.trim().replace(/&amp;/gi, "&");
  const candidate = /^(https?:|mailto:|tel:)/i.test(clean)
    ? clean
    : `https://${clean}`;
  let safe: string | null = null;
  try {
    const u = new URL(candidate);
    if (SAFE_SCHEMES.has(u.protocol.toLowerCase())) safe = u.toString();
  } catch {
    safe = null;
  }
  if (!safe) return esc(label);
  return `<a href="${esc(safe)}" target="_blank" rel="noopener noreferrer nofollow">${esc(label)}</a>`;
}

/** Render a store's original line: collapse whitespace, escape it, and turn
 *  any markdown links [label](url) or bare http(s) URLs into real anchors so
 *  the link is kept (and clickable) while everything else is plain text. */
function renderInline(text: string): string {
  const s = (text ?? "")
    .replace(/\r\n?/g, "\n")
    .replace(/\s*\n+\s*/g, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  const re = /\[([^\]]+)\]\(([^)]+)\)|(https?:\/\/[^\s)]+)/g;
  let out = "";
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s))) {
    if (m.index > last) out += esc(s.slice(last, m.index));
    if (m[2]) {
      out += anchor(m[2], m[1]);
    } else if (m[3]) {
      out += anchor(m[3], m[3]);
    }
    last = m.index + m[0].length;
  }
  if (last < s.length) out += esc(s.slice(last));
  return out;
}

/** Pull every [label](url) link out of a note string (used to resolve which
 *  telegra.ph info popup a store points at). */
function extractNoteLinks(notes: string): { label: string; url: string }[] {
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  const out: { label: string; url: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(notes))) out.push({ label: m[1] ?? "", url: m[2] ?? "" });
  return out;
}

/** Every href found in a chunk of (controlled) info HTML, de-duplicated.
 *  Accepts both double- and single-quoted href attributes. */
function extractHrefs(html: string): string[] {
  const re = /href\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
  const out: string[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const href = (m[1] ?? m[2] ?? "").replace(/&amp;/gi, "&").trim();
    const k = href.toLowerCase();
    if (href && !seen.has(k)) {
      seen.add(k);
      out.push(href);
    }
  }
  return out;
}

/** The link(s) a store offers for "full info": any links inside its notes
 *  (these are the pages a card would open for the full write-up) plus, for a
 *  store whose popup is matched purely by domain (no inline note link), the
 *  link(s) embedded in that popup. We keep ONLY links here — never the popup
 *  body text — honoring an admin override saved under `info.<id>.html`
 *  (key presence wins, even when cleared to empty), de-duplicated by URL. */
function resolveStoreInfoLinks(
  store: Store,
  contentMap: Record<string, string>,
): { label: string; url: string }[] {
  const out: { label: string; url: string }[] = [];
  const seen = new Set<string>();
  const add = (label: string, url: string) => {
    const u = url.trim();
    const k = u.toLowerCase();
    if (u && !seen.has(k)) {
      seen.add(k);
      out.push({ label: label.trim() || u, url: u });
    }
  };

  if (store.notes) {
    for (const { label, url } of extractNoteLinks(store.notes)) add(label, url);
  }

  const domainInfo = getStoreInfoByDomain(store.domain);
  if (domainInfo) {
    const key = `info.${domainInfo.id}.html`;
    const html = Object.prototype.hasOwnProperty.call(contentMap, key)
      ? contentMap[key]
      : domainInfo.html;
    for (const href of extractHrefs(html || "")) add(href, href);
  }

  return out;
}

function renderStore(
  store: Store,
  contentMap: Record<string, string>,
): string {
  const emojis = (store.tags ?? [])
    .map((t) => TAG_EMOJI[t])
    .filter(Boolean)
    .join(" ");
  const prefix = emojis ? `${emojis} ` : "";

  // LIVE detail, built from the same fields the store card renders (NEVER the
  // frozen rawText import). `notes` is the descriptive line; strip a leading
  // separator so "Name – – detail" can't happen.
  const notesSrc = (store.notes ?? "").replace(/^\s*[–—\-/|•]+\s*/, "").trim();
  const notesNorm = norm(notesSrc);

  // The structured tiles (limit / items / fee / time). Append a tile ONLY when
  // its value isn't already spelled out in the notes, so a tile-only edit (or
  // a new store with empty notes) still shows up, while current rows whose
  // notes already carry the detail aren't shown twice.
  const segments = [esc(store.name ?? "")];
  for (const v of [store.priceLimit, store.itemLimit, store.fee, store.timeframe]) {
    const val = (v ?? "").trim();
    if (val && !notesNorm.includes(norm(val))) segments.push(esc(val));
  }
  // Render the notes last, keeping any markdown / URL link clickable so a
  // "click to view" link survives.
  if (notesSrc) segments.push(renderInline(notesSrc));
  let line = `${prefix}${segments.join(" – ")}`;

  // Keep the store's own website link (the live card shows it). Append only
  // when the notes don't already mention the domain, to avoid a redundant
  // repeat.
  const dom = (store.domain || "").trim();
  if (dom) {
    const bare = dom.replace(/^https?:\/\//i, "").replace(/^www\./i, "").toLowerCase();
    if (bare && !notesNorm.includes(norm(bare))) {
      line += ` – ${anchor(dom, dom)}`;
    }
  }

  // For stores with an info popup, keep ONLY the link(s) — never the body
  // text — and drop any link already rendered inline from the notes above.
  const inlineUrls = new Set(
    extractNoteLinks(store.notes || "").map((l) => l.url.trim().toLowerCase()),
  );
  const infoLinks = resolveStoreInfoLinks(store, contentMap).filter(
    (l) => !inlineUrls.has(l.url.trim().toLowerCase()),
  );
  const more = infoLinks.length
    ? `<br>More info: ${infoLinks.map((l) => anchor(l.url, l.label)).join(" · ")}`
    : "";

  return `<li>${line}${more}</li>`;
}

function buildDocument(
  region: Region,
  stores: Store[],
  contentMap: Record<string, string>,
): string {
  const list = stores.map((s) => renderStore(s, contentMap)).join("\n");

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>RefundGod — Store List (RAW plain-text mirror) — ${esc(REGION_FULL[region])}</title>
</head>
<body>
<h1>RefundGod — Store List (RAW plain-text mirror)</h1>
<p><strong>Region:</strong> ${esc(REGION_FULL[region])}</p>
<p><strong>Total stores:</strong> ${stores.length}</p>
<p>Auto-generated, plain-text mirror of the live store list, rebuilt from the database on every request so it always matches /store-list.</p>
<ol>
${list || "<li>No stores in this region.</li>"}
</ol>
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
    const [stores, contentMap] = await Promise.all([
      loadStoresFresh(region),
      getAllContentMap(),
    ]);
    const html = buildDocument(region, stores, contentMap);
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
