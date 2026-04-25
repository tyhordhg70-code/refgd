import { db, withDb } from "./db";
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

export function getContentBlock(id: string): string {
  const row = db().contentBlocks[id];
  if (row) return row.value;
  return DEFAULT_CONTENT[id] ?? "";
}

export function setContentBlock(id: string, value: string): void {
  const now = new Date().toISOString();
  withDb((d) => {
    d.contentBlocks[id] = { value, updatedAt: now };
  });
}

export function listContentBlocks(): ContentBlock[] {
  const stored = db().contentBlocks;
  const ids = new Set([...Object.keys(stored), ...Object.keys(DEFAULT_CONTENT)]);
  const out: ContentBlock[] = [];
  for (const id of Array.from(ids).sort()) {
    const row = stored[id];
    out.push({
      id,
      value: row?.value ?? DEFAULT_CONTENT[id] ?? "",
      updatedAt: row?.updatedAt ?? "",
    });
  }
  return out;
}
