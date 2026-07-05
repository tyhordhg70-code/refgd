import { getPool, initDb } from "./db";
import { setCachedContent, invalidateContent } from "./cache";
import { memoTtl, invalidateMemo } from "./micro-cache";
import type { ContentBlock } from "./types";

export const DEFAULT_CONTENT: Record<string, string> = {
  "banner.text": "Stay up to speed — join our Telegram channel for the latest store drops",
  "banner.cta": "Join Telegram",
  "banner.url": "https://t.me/refundlawfirm",
  "hero.kicker": "welcome!",
  "hero.title": "CHOOSE YOUR PATH TO MASTERY:",
  "hero.subtitle": "",
  "hero.cta.label": "Join Group Chat",
  "hero.cta.url": "https://t.me/refundlawfirm",
  "telegram.headline":
    "Stay up to speed with the latest on our telegram Group",
  "telegram.kicker": "— join the channel",
  "home.paths.kicker": "— you have arrived",
  "home.paths.title": "Choose your path to mastery.",
  "home.paths.lead":
    "Four doors. Behind each, a craft refined by years of work under glass — chosen, not assigned.",
  "service.title": "Get rewarded for shopping online",
  "service.subtitle": "Ahh.. feel the joy of cashback.",
  "buy.url": "https://refundgod.bgng.io/",
};

/** Load all content blocks straight from the DB. Throws when unreachable. */
async function loadAllFromDb(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  await initDb();
  const { rows } = await getPool().query(
    "SELECT id, value FROM content_blocks"
  );
  for (const row of rows) {
    map.set(row.id as string, row.value as string);
  }
  // Keep the legacy snapshot fresh for any code still reading
  // getCachedContent() directly from this process.
  setCachedContent(map);
  return map;
}

const CONTENT_TTL_MS = 10_000;
const CONTENT_MEMO_KEY = "content:all";

/**
 * Content reads: 10-SECOND micro-cache (July 2026).
 *
 * History matters here. v6.13.49 disabled caching entirely because the
 * process-LIFETIME cache in ./cache.ts made admin edits invisible on the
 * other Render workers forever ("edits don't actually publish to live").
 * That fix was correct about the disease but the cure — a full
 * `SELECT * FROM content_blocks` on EVERY page render, layout included —
 * became the site's single biggest database-egress source and helped
 * exhaust the Neon free-plan data-transfer quota, which took the DB down
 * project-wide (every query rejected).
 *
 * This is the middle ground: reads are memoized for 10 seconds per
 * worker (with in-flight dedupe and stale-on-error), so
 *  - visitors cost ONE small query per worker per 10s instead of one per
 *    page view;
 *  - an admin Save is visible on the SAME worker instantly (the write
 *    invalidates the memo below) and on every other worker within 10s —
 *    bounded staleness, not the unbounded staleness v6.13.49 fixed.
 * Do NOT extend this TTL casually and do NOT remove the invalidation in
 * setContentBlock().
 */
async function getAllContent(): Promise<Map<string, string>> {
  try {
    return await memoTtl(CONTENT_MEMO_KEY, CONTENT_TTL_MS, loadAllFromDb);
  } catch (err) {
    // DB unreachable and nothing cached yet — fall back to defaults so
    // the page still renders (same behavior as before this cache).
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[content] DB unavailable, using DEFAULT_CONTENT fallback:",
        (err as Error).message,
      );
    }
    return new Map();
  }
}

export async function getContentBlock(id: string): Promise<string> {
  const content = await getAllContent();
  if (content.has(id)) return content.get(id)!;
  return DEFAULT_CONTENT[id] ?? "";
}

export async function setContentBlock(id: string, value: string): Promise<void> {
  await initDb();
  await getPool().query(
    `INSERT INTO content_blocks (id, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [id, value]
  );
  invalidateContent();
  // Same-worker reads must see the write IMMEDIATELY (the admin's own
  // next render); other workers converge within CONTENT_TTL_MS.
  invalidateMemo(CONTENT_MEMO_KEY);
}

/**
 * Return every content block id we know about — every saved DB row
 * unioned with every fallback default. Used by the layout to seed the
 * EditProvider so admin-saved values for ad-hoc ids (e.g. inline
 * YouTube video IDs, elastic detail copy) survive a page reload.
 */
export async function getAllContentMap(): Promise<Record<string, string>> {
  const content = await getAllContent();
  const out: Record<string, string> = {};
  for (const id of Object.keys(DEFAULT_CONTENT)) {
    out[id] = content.has(id) ? content.get(id)! : DEFAULT_CONTENT[id];
  }
  for (const [id, value] of Array.from(content.entries())) {
    out[id] = value;
  }
  return out;
}

export async function listContentBlocks(): Promise<ContentBlock[]> {
  const content = await getAllContent();
  const ids = new Set([...content.keys(), ...Object.keys(DEFAULT_CONTENT)]);
  const out: ContentBlock[] = [];
  for (const id of Array.from(ids).sort()) {
    out.push({
      id,
      value: content.has(id) ? content.get(id)! : (DEFAULT_CONTENT[id] ?? ""),
      updatedAt: content.has(id) ? "" : "",
    });
  }
  return out;
}
