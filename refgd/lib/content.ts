import { getPool, initDb } from "./db";
import {
  getCachedContent,
  setCachedContent,
  invalidateContent,
} from "./cache";
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

/** Load all content blocks from DB into cache. */
async function loadAll(): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  try {
    await initDb();
    const { rows } = await getPool().query(
      "SELECT id, value FROM content_blocks"
    );
    for (const row of rows) {
      map.set(row.id as string, row.value as string);
    }
  } catch (err) {
    // DB unreachable — fall back to defaults so the page still
    // renders. Production environments configure RENDER_DATABASE_URL;
    // local previews / dev-without-DB use the in-code defaults below.
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "[content] DB unavailable, using DEFAULT_CONTENT fallback:",
        (err as Error).message,
      );
    }
  }
  setCachedContent(map);
  return map;
}

/**
 * v6.13.49 — CACHE DISABLED for content reads.
 *
 * Why: Render auto-scales the Next.js service across multiple Node
 * instances. The module-level cache in `./cache.ts` lives in ONE
 * process; when an admin Saves, the PUT lands on instance A, A's
 * cache is invalidated, but instances B/C/D still serve their stale
 * cached Map for the lifetime of those processes. From the user's
 * perspective: "edits don't actually publish to live — when I go
 * back to edit mode the changes are saved there, but visitors see
 * the old text". Confirmed root cause.
 *
 * Fix: skip the cache entirely. content_blocks is a tiny table
 * (dozens of rows, single SELECT, no joins). Every page render that
 * needs the content map does ONE small query — well below 5 ms even
 * on Render's free tier — and every visitor (and every admin going
 * back into edit mode on any worker) immediately sees the saved
 * value. We KEEP `setCachedContent` calls inside `loadAll()` so any
 * legacy code path still hitting `getCachedContent()` directly will
 * at least get the most-recently-loaded snapshot from this process.
 */
async function getAllContent(): Promise<Map<string, string>> {
  return loadAll();
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
