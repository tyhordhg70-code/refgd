/**
 * Admin-curated category list.
 *
 * Categories are stored on each Store row as a free-form string (see
 * `lib/types.ts` and `app/api/admin/stores/route.ts`). This module
 * tracks ADDITIONAL category names the admin wants to make available
 * for selection / filtering even when no store currently uses them.
 *
 * Persistence piggybacks on the existing `content_blocks` table — the
 * extra list is stored as a JSON array under id `_extra_categories`.
 * That avoids a schema migration and reuses the same cache invalidation
 * machinery as everything else.
 */
import { getContentBlock, setContentBlock } from "./content";
import { listStores } from "./stores";
import { getPool, initDb } from "./db";

const STORAGE_KEY = "_extra_categories";
/** v6.13.37 — admin-curated display order for the merged category list.
 *  Stored as a JSON array of category names. Any category present in
 *  the merged list but missing from the order is appended in the
 *  default order. Any name in the stored order that no longer exists
 *  is dropped. */
const ORDER_KEY = "_category_order";

/**
 * The original canned categories, kept as defaults so the dropdown is
 * never empty on a brand-new install. Order here matters — it's the
 * order the chips appear in the UI.
 */
export const CANNED_CATEGORIES: readonly string[] = [
  "Electronics",
  "Clothing",
  "Home",
  "Jewelry",
  "Food",
  "Meal Plans",
  "Other",
];

const MAX_CATEGORY_LEN = 60;

function clean(name: unknown): string {
  if (typeof name !== "string") return "";
  const t = name.trim();
  if (!t) return "";
  return t.length > MAX_CATEGORY_LEN ? t.slice(0, MAX_CATEGORY_LEN) : t;
}

/** Read just the admin-added extras (no canned, no in-use categories). */
export async function getExtraCategories(): Promise<string[]> {
  const raw = await getContentBlock(STORAGE_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .map(clean)
      .filter((s, i, a) => s && a.indexOf(s) === i);
  } catch {
    return [];
  }
}

async function writeExtras(list: string[]): Promise<string[]> {
  const cleaned = Array.from(
    new Set(list.map(clean).filter(Boolean)),
  );
  await setContentBlock(STORAGE_KEY, JSON.stringify(cleaned));
  return cleaned;
}

/** Add a new admin-curated category. Returns the updated full extras list. */
export async function addExtraCategory(name: string): Promise<string[]> {
  const c = clean(name);
  if (!c) throw new Error("Category name is required.");
  const current = await getExtraCategories();
  if (
    current.includes(c) ||
    (CANNED_CATEGORIES as readonly string[]).includes(c)
  ) {
    return current; // already present, no-op
  }
  return writeExtras([...current, c]);
}

/**
 * Remove an admin-curated category. Refuses if any store still uses it
 * (caller should reassign / delete those stores first). Canned
 * categories cannot be removed.
 *
 * NOTE: the "still in use" check intentionally hits the DB directly
 * rather than going through `listStores()`, which is process-cached.
 * Without this we could accept a delete for a category that another
 * request just attached to a new store — the cache would still report
 * it as unused.
 */
export async function removeExtraCategory(name: string): Promise<string[]> {
  const c = clean(name);
  if (!c) throw new Error("Category name is required.");
  if ((CANNED_CATEGORIES as readonly string[]).includes(c)) {
    throw new Error("Built-in categories cannot be removed.");
  }
  await initDb();
  const { rowCount } = await getPool().query(
    "SELECT 1 FROM stores WHERE category = $1 LIMIT 1",
    [c],
  );
  if ((rowCount ?? 0) > 0) {
    throw new Error(
      `Cannot remove "${c}" — it is still used by one or more stores. Move or delete those stores first.`,
    );
  }
  const current = await getExtraCategories();
  return writeExtras(current.filter((x) => x !== c));
}

/** v6.13.37 — Read the admin-saved category display order. Returns
 *  an empty array when no order has been saved yet. */
export async function getCategoryOrder(): Promise<string[]> {
  const raw = await getContentBlock(ORDER_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr.map(clean).filter(Boolean);
  } catch {
    return [];
  }
}

/** v6.13.37 — Persist a new admin-curated display order. Names are
 *  cleaned + de-duped; the stored list is exactly what's passed in
 *  (any merged-in canon happens at read time in
 *  `getAllCategoriesMerged`). */
export async function setCategoryOrder(list: unknown): Promise<string[]> {
  if (!Array.isArray(list)) {
    throw new Error("order must be an array of category names");
  }
  const cleaned = Array.from(
    new Set(list.map(clean).filter(Boolean)),
  );
  await setContentBlock(ORDER_KEY, JSON.stringify(cleaned));
  return cleaned;
}

/**
 * Full merged category list for the public filter UI:
 * 1. Honour the admin-saved display order first (so a drag-rearrange
 *    survives a page reload and is shown to every visitor).
 * 2. Then append any canned default the order didn't mention.
 * 3. Then admin extras not yet in the order.
 * 4. Finally any leftover category actually present on stores
 *    (legacy / typo'd values).
 * De-duped while preserving insertion order.
 */
export async function getAllCategoriesMerged(): Promise<string[]> {
  const [extras, stores, order] = await Promise.all([
    getExtraCategories(),
    listStores(),
    getCategoryOrder(),
  ]);
  const used = new Set(stores.map((s) => s.category).filter(Boolean));
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (c: string) => {
    if (!seen.has(c)) {
      seen.add(c);
      out.push(c);
    }
  };
  // 1. Admin-saved display order wins.
  order.forEach(push);
  // 2-4. Defaults / extras / used categories fill in the rest.
  CANNED_CATEGORIES.forEach(push);
  extras.forEach(push);
  Array.from(used)
    .sort((a, b) => a.localeCompare(b))
    .forEach(push);
  return out;
}
