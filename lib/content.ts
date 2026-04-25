import { getPool, initDb } from "./db";
import type { ContentBlock } from "./types";

export const DEFAULT_CONTENT: Record<string, string> = {
  "banner.text": "Need a refund right now? Talk to us on Telegram",
  "banner.cta": "Open Telegram",
  "banner.url": "https://t.me/refundlawfirm",
  "hero.kicker": "welcome!",
  "hero.title": "CHOOSE YOUR PATH TO MASTERY:",
  "hero.subtitle":
    "Five paths. One outcome — total command over your refund game. Pick yours and step into the next level.",
  "hero.cta.label": "Join Group Chat",
  "hero.cta.url": "https://t.me/+nwkW2Mw3959mZDc0",
  "telegram.headline":
    "Stay up to speed with the latest on our telegram Group",
  "service.title": "Get rewarded for shopping online",
  "service.subtitle": "Ahh.. feel the joy of cashback.",
  "buy.url": "https://refundgod.bgng.io/",
};

export async function getContentBlock(id: string): Promise<string> {
  await initDb();
  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT value FROM content_blocks WHERE id = $1",
    [id]
  );
  if (rows.length) return rows[0].value as string;
  return DEFAULT_CONTENT[id] ?? "";
}

export async function setContentBlock(id: string, value: string): Promise<void> {
  await initDb();
  const pool = getPool();
  await pool.query(
    `INSERT INTO content_blocks (id, value, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (id) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [id, value]
  );
}

export async function listContentBlocks(): Promise<ContentBlock[]> {
  await initDb();
  const pool = getPool();
  const { rows } = await pool.query(
    "SELECT id, value, updated_at FROM content_blocks"
  );
  const stored = new Map(rows.map((r) => [r.id as string, r]));
  const ids = new Set([...stored.keys(), ...Object.keys(DEFAULT_CONTENT)]);
  const out: ContentBlock[] = [];
  for (const id of Array.from(ids).sort()) {
    const row = stored.get(id);
    out.push({
      id,
      value: row ? (row.value as string) : (DEFAULT_CONTENT[id] ?? ""),
      updatedAt: row ? String(row.updated_at) : "",
    });
  }
  return out;
}
