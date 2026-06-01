/**
 * Telegram Stars pricing + multi-part split helpers.
 *
 * Telegram caps how many Stars a buyer can spend in a SINGLE transaction, and
 * that cap depends on how they pay:
 *   • Mobile (Apple / Google Pay in-app purchase): 35 000 Stars (≈ $700)
 *   • Desktop / Telegram Web / PremiumBot:        150 000 Stars (≈ $3 000)
 * So an order whose total exceeds the relevant cap must be collected across
 * several invoices that SUM to the full price. (The original code wrongly
 * hard-capped every order at two 5 000-Star invoices ≈ $200, undercharging
 * anything pricier — e.g. a $1 000 mentorship.) These helpers split the full
 * amount into as many parts as needed and give every part a deterministic id so
 * the webhook / status route can find its siblings without a DB schema change.
 *
 * Pure module (no pg / no env) — safe to import from any server route.
 */

/** Stars base rate: 50 Stars ≈ $1 USD. */
export const STARS_PER_USD = 50;

/** Apple / Google in-app-purchase cap per transaction (mobile pay). ≈ $700. */
export const MAX_STARS_MOBILE = 35000;

/** Telegram Desktop / Web / PremiumBot cap per transaction. ≈ $3 000. */
export const MAX_STARS_DESKTOP = 150000;

/** Back-compat alias (some callers may still reference it). */
export const MAX_SINGLE_STARS = MAX_STARS_DESKTOP;

/**
 * The per-invoice Stars cap for a checkout method.
 *   "app"  → Apple / Google Pay → mobile IAP cap (35 000)
 *   "card" → Telegram Web / Desktop (the no-fee path we steer to) → 150 000
 */
export function maxStarsForMethod(method: "app" | "card"): number {
  return method === "app" ? MAX_STARS_MOBILE : MAX_STARS_DESKTOP;
}

/**
 * Split a total Stars amount into N parts, each ≤ `max`, distributed as evenly
 * as possible and summing EXACTLY to the total (no truncation, no package
 * snapping — the buyer always covers the real price). Most orders fit in one
 * part; only very large totals need splitting.
 */
export function splitStars(total: number, max: number = MAX_STARS_DESKTOP): number[] {
  const t = Math.max(1, Math.ceil(total));
  const cap = Math.max(1, Math.floor(max));
  const n = Math.ceil(t / cap);
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
