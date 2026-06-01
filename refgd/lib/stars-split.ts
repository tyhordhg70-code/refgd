/**
 * Telegram Stars pricing + multi-part split helpers.
 *
 * Telegram caps a single Stars (XTR) invoice, so an order whose total exceeds
 * MAX_SINGLE_STARS must be collected across several invoices that SUM to the
 * full price. The previous implementation capped every order at two invoices
 * (max 2 × 5 000 = 10 000 Stars ≈ $200), so anything above ~$200 — e.g. a
 * $1 000 mentorship — was silently undercharged. These helpers split the full
 * amount into as many parts as needed and give every part a deterministic id so
 * the webhook / status route can find its siblings without a DB schema change.
 *
 * Pure module (no pg / no env) — safe to import from any server route.
 */

/** Stars base rate: 50 Stars ≈ $1 USD. */
export const STARS_PER_USD = 50;

/**
 * Max Stars chargeable in one invoice. Kept at the known-good 5 000 the shop
 * has always used; Telegram rejects invoices above its server-side cap, and a
 * rejected invoice means a lost sale, so we stay conservative on purpose.
 */
export const MAX_SINGLE_STARS = 5000;

/**
 * Split a total Stars amount into N parts, each ≤ MAX_SINGLE_STARS, distributed
 * as evenly as possible and summing EXACTLY to the total (no truncation, no
 * package snapping — the buyer always covers the real price).
 */
export function splitStars(total: number): number[] {
  const t = Math.max(1, Math.ceil(total));
  const n = Math.ceil(t / MAX_SINGLE_STARS);
  if (n <= 1) return [t];
  const base = Math.floor(t / n);
  const rem = t - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < rem ? 1 : 0));
}

const PART_RE = /_p(\d+)of(\d+)$/;

/** Build a part id. Single-part orders carry NO suffix (unchanged behaviour). */
export function partId(base: string, index: number, total: number): string {
  return total <= 1 ? base : `${base}_p${index}of${total}`;
}

/** Parse a part id back into its base, 1-based index and total part count. */
export function partInfo(orderId: string): { base: string; index: number; total: number } {
  const m = orderId.match(PART_RE);
  if (!m) return { base: orderId, index: 1, total: 1 };
  return { base: orderId.slice(0, m.index), index: Number(m[1]), total: Number(m[2]) };
}

/** All sibling ids for the order's payment group (including the order itself). */
export function siblingIds(orderId: string): string[] {
  const { base, total } = partInfo(orderId);
  if (total <= 1) return [orderId];
  return Array.from({ length: total }, (_, i) => partId(base, i + 1, total));
}

/** The id of part 1 — the order that carries the real delivery token. */
export function firstPartId(orderId: string): string {
  const { base, total } = partInfo(orderId);
  return partId(base, 1, total);
}
