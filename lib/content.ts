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
  "home.paths.kicker": "— chapter 01 / paths",
  "home.paths.title": "Choose your path to mastery.",
  "home.paths.lead":
    "Four doors. Behind each, a craft refined by years of work under glass — chosen, not assigned.",
  "service.title": "Get rewarded for shopping online",
  "service.subtitle": "Ahh.. feel the joy of cashback.",
  "buy.url": "https://refundgod.bgng.io/",
};

/** Load all content blocks from DB into cache. */
async function loadAll(): Promise<Map<string, string>> {
  await initDb();
  const { rows } = await getPool().query(
    "SELECT id, value FROM content_blocks"
  );
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.id as string, row.value as string);
  }
  setCachedContent(map);
  return map;
}

async function getAllContent(): Promise<Map<string, string>> {
  return getCachedContent() ?? (await loadAll());
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
