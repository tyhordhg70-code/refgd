/**
 * Stable in-page anchor ids for shareable deep links on /store-list.
 *
 * Deterministic on both server and client (a pure string transform, no
 * `window`) so the id rendered during SSR matches the one hydration computes.
 * Always derive from the STABLE category key or store name — never an admin
 * display label, which can carry emoji and be renamed (that would silently
 * break every link already shared).
 */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Category section anchor id, e.g. "Travel" -> "cat-travel". */
export function catAnchorId(categoryKey: string): string {
  return `cat-${slugify(categoryKey)}`;
}

/** Store card anchor id, e.g. "CRYPTO REFUNDS" -> "store-crypto-refunds". */
export function storeAnchorId(storeName: string): string {
  return `store-${slugify(storeName)}`;
}
