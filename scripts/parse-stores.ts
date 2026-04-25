/**
 * Parses the wayback-archive markdown files at .local/wayback/{3..6}_*.md
 * (USA, Canada, EU, UK) and emits a structured data/stores.json.
 *
 * Run once to (re)generate the seed data:
 *   npm run parse-stores
 *
 * Then `npm run seed` loads the JSON into SQLite.
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import type { Region, Store, StoreCategory, StoreTag } from "../lib/types";

interface ParseSource {
  region: Region;
  file: string;
}

const ROOT = path.resolve(__dirname, "../..");

const SOURCES: ParseSource[] = [
  { region: "USA", file: path.join(ROOT, ".local/wayback/3_refundgod_io_usa.md") },
  { region: "CAD", file: path.join(ROOT, ".local/wayback/4_refundgod_io_canada.md") },
  { region: "EU",  file: path.join(ROOT, ".local/wayback/5_refundgod_io_eu.md") },
  { region: "UK",  file: path.join(ROOT, ".local/wayback/6_refundgod_io_uk.md") },
];

const CATEGORY_HEADINGS: { match: RegExp; category: StoreCategory }[] = [
  { match: /electronics|high resell|electronics?\s*\/\s*high/i, category: "Electronics" },
  { match: /clothing|home\s*\/\s*furniture|clothing\s*\/\s*home/i, category: "Clothing" },
  { match: /jewel/i, category: "Jewelry" },
  { match: /meal\s*plan/i, category: "Meal Plans" },
  { match: /food/i, category: "Food" },
  { match: /home|furniture/i, category: "Home" },
];

const EMOJI_TAG_MAP: { svg: string; tag: StoreTag }[] = [
  { svg: "1f525", tag: "fire" },
  { svg: "1f48e", tag: "diamond" },
  { svg: "1f451", tag: "crown" },
  { svg: "1f30e", tag: "global" },
];

// Regexes used during normalisation
const IMG_RE = /!\[[^\]]*\]\([^)]+\)/g;
const URL_RE = /\[([^\]]+)\]\([^)]+\)/g; // strip wayback links, keep label
const HTML_TAG_RE = /<[^>]+>/g;
const ESCAPED_PIPE_RE = /\\\|/g;
const MULTI_DASH_RE = /[—–]+/g; // various long dashes
const WS_RE = /\s+/g;

function detectTagsFromRaw(raw: string): StoreTag[] {
  const tags = new Set<StoreTag>();
  for (const { svg, tag } of EMOJI_TAG_MAP) {
    if (raw.includes(svg)) tags.add(tag);
  }
  if (/\bWORLDWIDE\b/i.test(raw) || /\bworldwide\b/.test(raw)) tags.add("global");
  return Array.from(tags);
}

function stripMarkdown(s: string): string {
  return s
    .replace(IMG_RE, "")
    .replace(URL_RE, "$1")
    .replace(HTML_TAG_RE, " ")
    .replace(ESCAPED_PIPE_RE, "|")
    .replace(/\*\*?/g, "")
    .replace(/_+/g, "")
    .replace(/`/g, "")
    .replace(/^#+\s*/g, "")
    .replace(WS_RE, " ")
    .trim();
}

function splitIntoCategorySections(text: string): { category: StoreCategory; body: string }[] {
  // Split on markdown headings that look like category dividers
  // Example: "### **🎮 ELECTRONICS & HIGH RESELL STORES 💸:**"
  const lines = text.split("\n");
  const sections: { category: StoreCategory; body: string[] }[] = [];
  let currentCat: StoreCategory = "Other";
  let currentBody: string[] = [];

  for (const line of lines) {
    const isHeading = /^#{2,}\s/.test(line) || /^\*\*[^*]+\*\*$/.test(line.trim());
    if (isHeading) {
      const text = stripMarkdown(line);
      const matched = CATEGORY_HEADINGS.find((c) => c.match.test(text));
      if (matched) {
        if (currentBody.length) {
          sections.push({ category: currentCat, body: currentBody });
        }
        currentCat = matched.category;
        currentBody = [];
        continue;
      }
      // Skip noisy headings like "<======>" / "Back to home"
      if (/^\s*<=+>?\s*$/.test(text)) continue;
    }
    currentBody.push(line);
  }
  if (currentBody.length) sections.push({ category: currentCat, body: currentBody });
  return sections.map((s) => ({ category: s.category, body: s.body.join("\n") }));
}

// Lines that are pure noise we should never treat as store entries
const NOISE_PATTERNS: RegExp[] = [
  /^stores?\s+price\s+limits/i,
  /^store\s+list\s+last\s+updated/i,
  /^\*?store list last updated/i,
  /^for information on how things work/i,
  /^view rules/i,
  /^back to (regions|home)/i,
  /^—+$/,
  /^stores - price limits/i,
  /^working\s+globally/i,
  /^redacted store/i,
  /^contact us to learn name of store/i,
  /^—\s*\d+-\d+\s*days?\s*timeframe/i,
  /^refund\/replacement$/i,
  /^\(no reship\)$/i,
  /^\d+\s*item limit$/i,
  /^(electronics|clothing|jewel(?:ery|ry)|food|meal\s*plans?|home|furniture|home\s*\/\s*furniture)\s*[!:]*\s*$/i,
  /^(usa|cad|canada|eu|uk)\s+stores?\s*$/i,
  /^canada\s+stores$/i,
  /^uk\s+store\s+list/i,
  /^eu\s+store\s+list/i,
  /^usa\s+store\s+list/i,
  /^\(?\d+\s*items?\s*-/i,
  /high(?:ly)?\s*resell.*items?\s*:?$/i,
];

function isNoise(line: string): boolean {
  const t = line.trim();
  if (!t) return true;
  return NOISE_PATTERNS.some((re) => re.test(t));
}

function extractStoreEntries(body: string): string[] {
  // The original page separates stores with a *standalone line* containing
  // only an em-dash "—". Inside a single markdown heading line, multiple
  // stores can also be chained with " — " (em-dash with spaces around it,
  // mostly seen in the CAD page). The en-dash "–" is a *field separator
  // within* a store entry and must NOT split entries.
  //
  // CAD pages format every entry as "## StoreName / ..." — so we *strip*
  // leading "#" markdown-header prefixes as preprocessing, never treat them
  // as section dividers. Real category dividers were already removed by
  // splitIntoCategorySections() before this function runs. Inline "###"
  // header tokens that leaked mid-content (rare USA case) are handled by
  // the inline splitter below.
  const blocks: string[] = [];
  let buf: string[] = [];
  const flush = () => { if (buf.length) { blocks.push(buf.join(" ")); buf = []; } };
  for (const raw of body.split("\n")) {
    // Strip leading markdown-heading prefix BEFORE separator detection
    const line = raw.replace(/^\s*#{1,6}\s*/, "").trim();
    if (/^—+$/.test(line) || /^[-]{2,}$/.test(line)) {
      flush();
    } else if (line.length === 0) {
      // ignore
    } else {
      buf.push(line);
    }
  }
  flush();

  // Further split blocks on:
  //  - inline " — " chains (em-dash with spaces)
  //  - inline "###"/"####" header tokens that leaked into a single line
  const out: string[] = [];
  for (const block of blocks) {
    const cleaned = block.replace(/\s+/g, " ").trim();
    if (!cleaned) continue;
    // First split on inline header tokens (markdown headers leaked into a line)
    const headerSplit = cleaned.split(/\s*#{2,}\s*/);
    for (const seg of headerSplit) {
      const segTrim = seg.trim();
      if (!segTrim) continue;
      // Then split on " — " store chains
      const parts = segTrim.split(/\s—\s+/);
      for (const p of parts) {
        // Strip any trailing "###" residue at end of part
        const t = p.replace(/\s*#{2,}\s*$/, "").trim();
        if (t.length < 4) continue;
        if (isNoise(t)) continue;
        out.push(t);
      }
    }
  }
  return out;
}

const STOPWORDS_NAME = new Set([
  "the", "a", "no", "limit", "item", "items", "instant", "weeks",
  "week", "days", "day", "hours", "instant.", "limit.",
]);

function extractName(entry: string): string {
  // The store name is the text before the first field delimiter.
  // Field delimiters in priority order: "/", "|", "–" (en-dash), "-", ":", "("
  const cleaned = entry.replace(/^[\W_]+/, "").trim();
  const m = cleaned.match(/^([^/|–\-:()]+)/);
  let name = (m ? m[1] : cleaned).trim();
  name = name.replace(/\s+\d+%\s*$/, "").trim();
  if (name.length > 60) name = name.slice(0, 60).trim();
  if (!name) name = cleaned.slice(0, 40);
  name = name.replace(/[.,;:\-]+$/, "").trim();
  // Reject if name is just metadata residue like "1 item" or "$5,000"
  if (/^\$?\d+([,.]\d+)?\s*(items?|tickets?|limit)?$/i.test(name)) return "";
  if (/^(NO LIMIT|no item limit|instant|worldwide|electronics|clothing|home|food|jewel(?:ery|ry)|stores price limits|store list)$/i.test(name)) return "";
  // Reject URL/markup leftovers like "https", "http", "www", or 2-letter language codes
  if (/^(https?|www|ftp|en|uk|us|ca|eu|de|fr|it|es)$/i.test(name)) return "";
  // Reject pure punctuation/symbols
  if (!/[A-Za-z0-9]{2,}/.test(name)) return "";
  return name;
}

function extractDomain(entry: string, name: string): string | null {
  const candidates = [name, entry];
  for (const c of candidates) {
    const m = c.toLowerCase().match(/([a-z0-9-]+\.(?:com|io|gg|ai|co|ca|net|org|store|sports|shop|tv)(?:\.[a-z]{2})?)/);
    if (m) return m[1];
  }
  // fall back: lowercase name + .com if name is a single word
  const single = name.replace(/\s+/g, "").toLowerCase();
  if (/^[a-z0-9]{3,30}$/.test(single)) return `${single}.com`;
  return null;
}

function extractPriceLimit(entry: string): string | null {
  if (/no\s*limit|no\s*item\s*limit|unlimited/i.test(entry) && !/\$/.test(entry)) {
    return "NO LIMIT";
  }
  const m = entry.match(/[€£$]\s*[\d,]+(?:[.\d]+)?(?:k)?/i);
  return m ? m[0].replace(/\s+/g, "") : null;
}

function extractItemLimit(entry: string): string | null {
  if (/no\s*item\s*limit|no\s*limit|multiple/i.test(entry)) return "No item limit";
  const m = entry.match(/(\d+)\s*(?:-\s*\d+\s*)?items?/i);
  if (m) return m[0].toLowerCase();
  const m2 = entry.match(/(\d+)\s*(?:tickets?|watch|mattress|bundle)/i);
  if (m2) return m2[0].toLowerCase();
  return null;
}

function extractFee(entry: string): string | null {
  const m = entry.match(/(\d{1,2})\s*%/);
  return m ? `${m[1]}%` : null;
}

function extractTimeframe(entry: string): string | null {
  if (/instant|immediate/i.test(entry)) return "Instant";
  const m = entry.match(/(\d+\s*-\s*\d+|\d+)\s*(?:hours?|days?|weeks?)/i);
  return m ? m[0].toLowerCase().replace(/\s*-\s*/, "-") : null;
}

function extractNotes(entry: string, fields: { name: string; priceLimit?: string|null; itemLimit?: string|null; fee?: string|null; timeframe?: string|null }): string | null {
  let s = entry;
  // Remove the parts we already captured
  for (const v of [fields.name, fields.priceLimit, fields.itemLimit, fields.fee, fields.timeframe]) {
    if (v) s = s.replace(v, "");
  }
  s = s
    .replace(/[€£$]\s*[\d,]+(?:k)?/gi, "")
    .replace(/no\s*item\s*limit|no\s*limit/gi, "")
    .replace(/^[\s/|\\\-—–:.,]+/, "")
    .replace(/[\s/|\\\-—–:.,]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!s || s.length < 4) return null;
  if (s.length > 220) s = s.slice(0, 217) + "…";
  return s;
}

function makeId(region: Region, name: string, _idx: number, taken: Set<string>): string {
  // Stable ID: region + canonicalized name only. Index is intentionally ignored
  // so re-parses produce identical IDs and admin edits survive reseeds.
  // If the same (region,name) appears twice, append -2, -3, ... deterministically.
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 40);
  const base = `${region.toLowerCase()}-${slug || "store"}`;
  if (!taken.has(base)) {
    taken.add(base);
    return base;
  }
  for (let n = 2; n < 100; n++) {
    const cand = `${base}-${n}`;
    if (!taken.has(cand)) {
      taken.add(cand);
      return cand;
    }
  }
  // pathological: fall back to short content hash
  const h = crypto.createHash("md5").update(`${region}:${name}`).digest("hex").slice(0, 6);
  const cand = `${base}-${h}`;
  taken.add(cand);
  return cand;
}

function parseFile(src: ParseSource): Store[] {
  const text = fs.readFileSync(src.file, "utf8");
  // Trim wayback header & footer cruft — start at the first H2 after nav
  const startIdx = text.indexOf("STORE LIST LAST UPDATED") !== -1
    ? text.indexOf("STORE LIST LAST UPDATED")
    : text.indexOf("Store List last updated");
  const trimmed = startIdx > 0 ? text.slice(startIdx) : text;

  const sections = splitIntoCategorySections(trimmed);
  const out: Store[] = [];
  let order = 0;
  const idsTaken = new Set<string>();

  for (const { category, body } of sections) {
    const entries = extractStoreEntries(body);
    for (const rawEntry of entries) {
      const tags = detectTagsFromRaw(rawEntry);
      const cleaned = stripMarkdown(rawEntry);
      if (!cleaned || cleaned.length < 4) continue;
      // Skip footer cruft
      if (/back to (regions|home)/i.test(cleaned)) continue;
      if (/last updated/i.test(cleaned) && cleaned.length < 60) continue;

      const name = extractName(cleaned);
      if (!name || name.length < 2) continue;
      // Reject names that are clearly headers / boilerplate
      if (/last updated|view rules|back to|store list|how things work/i.test(name)) continue;

      const priceLimit = extractPriceLimit(cleaned);
      const itemLimit = extractItemLimit(cleaned);
      const fee = extractFee(cleaned);
      const timeframe = extractTimeframe(cleaned);
      const notes = extractNotes(cleaned, { name, priceLimit, itemLimit, fee, timeframe });
      const domain = extractDomain(cleaned, name);

      const now = new Date().toISOString();
      const store: Store = {
        id: makeId(src.region, name, order, idsTaken),
        name,
        domain,
        region: src.region,
        category,
        priceLimit,
        itemLimit,
        fee,
        timeframe,
        notes,
        tags,
        prismaticGlow: tags.includes("fire") || tags.includes("diamond"),
        logoUrl: null,
        rawText: cleaned.slice(0, 400),
        sortOrder: order++,
        createdAt: now,
        updatedAt: now,
      };
      out.push(store);
    }
  }
  return out;
}

function main() {
  const all: Store[] = [];
  for (const src of SOURCES) {
    if (!fs.existsSync(src.file)) {
      console.warn(`[parse] skipping missing: ${src.file}`);
      continue;
    }
    const stores = parseFile(src);
    console.log(`[parse] ${src.region}: ${stores.length} stores`);
    all.push(...stores);
  }

  // Dedupe by id
  const byId = new Map<string, Store>();
  for (const s of all) byId.set(s.id, s);
  const final = Array.from(byId.values());

  const outFile = path.join(__dirname, "..", "data", "stores.json");
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, JSON.stringify(final, null, 2));
  console.log(`[parse] wrote ${final.length} stores → ${outFile}`);
}

main();
