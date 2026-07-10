/**
 * In-process LRU byte-cache for IMMUTABLE media blobs served out of
 * Postgres BYTEA (vouch photos, chat photos/voice notes, custom emoji,
 * animated emoji).
 *
 * Why (July 2026): these routes streamed the full blob from the database
 * on EVERY request that missed the browser cache — Render has no CDN in
 * front of the service, so `s-maxage` never absorbed anything and every
 * new visitor pulled every visible image straight out of Neon. Combined
 * with other uncached reads this exhausted the Neon free-plan
 * data-transfer quota and took the DB down project-wide.
 *
 * Only cache bytes that are served under an `immutable` Cache-Control —
 * i.e. content-addressed rows that can never change for a given key
 * (media ids are insert-only; emoji keys are versioned with `:vN` / `?v`).
 * NEVER cache degraded / fallback / poison responses: those go out
 * `no-store` precisely so the next view retries.
 *
 * The byte budget is deliberately small (the Render instance already
 * flirts with its memory limit): 16 MB total, 3 MB per entry (the upload
 * cap). Hot images stay pinned by LRU touch; cold ones fall out.
 */

export interface CachedBlob {
  bytes: Buffer;
  mime: string;
}

const MAX_TOTAL_BYTES = 16 * 1024 * 1024;
const MAX_ENTRY_BYTES = 3 * 1024 * 1024;

/**
 * Anything larger than this can never live in the LRU (`putCachedBlob`
 * silently rejects it), so serving routes must NOT pull the full blob out of
 * Postgres for such entries — SQL-slice the requested byte range instead.
 */
export const BLOB_CACHE_ENTRY_CAP = MAX_ENTRY_BYTES;

declare global {
  // eslint-disable-next-line no-var
  var _blobLru: { map: Map<string, CachedBlob>; total: number } | undefined;
}

function store(): { map: Map<string, CachedBlob>; total: number } {
  if (!global._blobLru) global._blobLru = { map: new Map(), total: 0 };
  return global._blobLru;
}

export function getCachedBlob(key: string): CachedBlob | null {
  const s = store();
  const hit = s.map.get(key);
  if (!hit) return null;
  // Map preserves insertion order — re-insert to mark as most recently used.
  s.map.delete(key);
  s.map.set(key, hit);
  return hit;
}

export function putCachedBlob(key: string, bytes: Buffer, mime: string): void {
  if (bytes.length === 0 || bytes.length > MAX_ENTRY_BYTES) return;
  const s = store();
  const prev = s.map.get(key);
  if (prev) {
    s.total -= prev.bytes.length;
    s.map.delete(key);
  }
  while (s.total + bytes.length > MAX_TOTAL_BYTES && s.map.size > 0) {
    const oldestKey = s.map.keys().next().value as string;
    const evicted = s.map.get(oldestKey);
    s.map.delete(oldestKey);
    if (evicted) s.total -= evicted.bytes.length;
  }
  s.map.set(key, { bytes, mime });
  s.total += bytes.length;
}
