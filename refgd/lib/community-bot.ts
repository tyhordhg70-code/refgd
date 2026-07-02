/**
 * Community Telegram bot — a THIN, swappable launcher on top of the DB.
 *
 * Deliberately separate from lib/notify.ts (the payments bot): this uses its
 * own COMMUNITY_BOT_TOKEN so the community feature can be pointed at a
 * different bot without touching payment delivery. The bot only ingests
 * forwarded vouches and (later) sends community notifications / invite deep
 * links — all durable state lives in Postgres, never in the bot.
 *
 * Every function fails soft (returns a result / null) so a missing env var or
 * Telegram hiccup never throws inside the webhook.
 */
import { createHash } from "node:crypto";

type SendResult = { ok: boolean; error?: string };

export function communityBotToken(): string {
  return process.env.COMMUNITY_BOT_TOKEN ?? "";
}

/** Parse COMMUNITY_ADMIN_TG_IDS (comma/space separated numeric ids). */
export function communityAdminIds(): Set<string> {
  return new Set(
    (process.env.COMMUNITY_ADMIN_TG_IDS ?? "")
      .split(/[,\s]+/)
      .map((s) => s.trim())
      .filter(Boolean),
  );
}

export function isCommunityAdmin(
  id: string | number | undefined | null,
): boolean {
  if (id === undefined || id === null) return false;
  return communityAdminIds().has(String(id));
}

export async function sendCommunityTelegram(
  chatId: string | number,
  text: string,
  button?: { text: string; url?: string; webAppUrl?: string },
): Promise<SendResult> {
  const token = communityBotToken();
  if (!token) return { ok: false, error: "COMMUNITY_BOT_TOKEN not set" };
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true,
  };
  if (button) {
    // web_app buttons open the Mini App in-place (private chats only —
    // fine here, this bot only ever DMs).
    const btn = button.webAppUrl
      ? { text: button.text, web_app: { url: button.webAppUrl } }
      : { text: button.text, url: button.url ?? "" };
    body.reply_markup = { inline_keyboard: [[btn]] };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      return { ok: false, error: `Telegram ${res.status}: ${(await res.text()).slice(0, 200)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Telegram request failed: ${String(e)}` };
  }
}

declare global {
  // eslint-disable-next-line no-var
  var _communityBotUsername: string | undefined;
}

/** Resolve the community bot's @username (for t.me deep links). Cached. */
export async function getCommunityBotUsername(): Promise<string | null> {
  if (process.env.COMMUNITY_BOT_USERNAME) {
    return process.env.COMMUNITY_BOT_USERNAME.replace(/^@/, "");
  }
  if (global._communityBotUsername) return global._communityBotUsername;
  const token = communityBotToken();
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      cache: "no-store",
    });
    const j = (await res.json()) as { ok?: boolean; result?: { username?: string } };
    if (j.ok && j.result?.username) {
      global._communityBotUsername = j.result.username;
      return j.result.username;
    }
  } catch {
    /* ignore */
  }
  return null;
}

/** Download a Telegram file (photo) by file_id → raw bytes + mime. */
export async function downloadTelegramFile(
  fileId: string,
): Promise<{ bytes: Buffer; mime: string } | null> {
  const token = communityBotToken();
  if (!token) return null;
  try {
    const meta = await fetch(`https://api.telegram.org/bot${token}/getFile`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ file_id: fileId }),
      cache: "no-store",
    });
    const mj = (await meta.json()) as {
      ok?: boolean;
      result?: { file_path?: string };
    };
    const filePath = mj.result?.file_path;
    if (!mj.ok || !filePath) return null;
    const dl = await fetch(
      `https://api.telegram.org/file/bot${token}/${filePath}`,
      { cache: "no-store" },
    );
    if (!dl.ok) return null;
    const bytes = Buffer.from(await dl.arrayBuffer());
    const mime = filePath.endsWith(".png")
      ? "image/png"
      : filePath.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";
    return { bytes, mime };
  } catch {
    return null;
  }
}

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}
