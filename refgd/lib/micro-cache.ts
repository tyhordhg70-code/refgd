/**
 * Tiny in-process TTL memo — collapses hot, repeated DB reads into one
 * query per TTL window per Node worker.
 *
 * Added July 2026 after heavy public traffic (scrapers + the community
 * chat's short-poll) exhausted the Neon free-plan data-transfer quota and
 * the DB started rejecting EVERY query project-wide. Egress rule of thumb:
 * an unauthenticated route must never do an uncached read per request —
 * see .agents notes / app/raw for the original incident.
 *
 * Semantics:
 *  - Fresh hit  → cached value, no DB touch.
 *  - Expired    → one caller refreshes; while the refresh is in flight,
 *                 other callers get the previous value (if any) instead of
 *                 piling onto the DB.
 *  - Refresh fails → serve the previous value (stale-on-error) and back
 *                 off for FAILURE_TTL_MS before retrying; if there is no
 *                 previous value the error propagates (same as uncached).
 *
 * Values are cached per worker. Cross-worker staleness is bounded by the
 * TTL you pass — keep TTLs short (seconds) for anything an admin edits.
 */

interface Slot {
  value: unknown;
  at: number;
  has: boolean;
  coolUntil: number;
  inflight: Promise<unknown> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var _microCache: Map<string, Slot> | undefined;
}

const FAILURE_TTL_MS = 5_000;

function slots(): Map<string, Slot> {
  if (!global._microCache) global._microCache = new Map();
  return global._microCache;
}

export async function memoTtl<T>(
  key: string,
  ttlMs: number,
  fn: () => Promise<T>,
): Promise<T> {
  const map = slots();
  let s = map.get(key);
  if (!s) {
    s = { value: undefined, at: 0, has: false, coolUntil: 0, inflight: null };
    map.set(key, s);
  }
  const now = Date.now();
  if (s.has && now - s.at < ttlMs) return s.value as T;
  if (s.has && now < s.coolUntil) return s.value as T;
  if (s.inflight) {
    // A refresh is already running — don't stack a second query on the DB.
    if (s.has) return s.value as T;
    return s.inflight as Promise<T>;
  }
  const slot = s;
  const p = (async () => {
    try {
      const v = await fn();
      slot.value = v;
      slot.at = Date.now();
      slot.has = true;
      slot.coolUntil = 0;
      return v;
    } catch (err) {
      slot.coolUntil = Date.now() + FAILURE_TTL_MS;
      if (slot.has) return slot.value as T;
      throw err;
    } finally {
      slot.inflight = null;
    }
  })();
  slot.inflight = p;
  return p;
}

/** Drop a memoized value so the next read is fresh (same worker only). */
export function invalidateMemo(key: string): void {
  global._microCache?.delete(key);
}
