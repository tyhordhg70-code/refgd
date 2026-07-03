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
  // Trim: a trailing newline/space in the hosting env var silently changes the
  // HMAC secret and makes Mini App initData fail its "signature check" even when
  // the token value is otherwise correct — and it would equally corrupt the
  // token inside Bot API request URLs (getMe / getFile / sendMessage).
  return (process.env.COMMUNITY_BOT_TOKEN ?? "").trim();
}

/**
 * Non-sensitive diagnostics for the configured token. Leaks NO token material —
 * only its length and whether the env var had surrounding whitespace — so a
 * "same token but signature fails" report can be pinpointed from the client.
 */
export function communityBotTokenInfo(): {
  configured: boolean;
  len: number;
  hadWhitespace: boolean;
} {
  const raw = process.env.COMMUNITY_BOT_TOKEN ?? "";
  const t = raw.trim();
  return { configured: t.length > 0, len: t.length, hadWhitespace: t !== raw };
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

/**
 * A Telegram bot @username is letters/digits/underscore and MUST end in "bot"
 * (case-insensitive). We only need this as a sanity gate: a mistyped or
 * placeholder COMMUNITY_BOT_USERNAME mints a `t.me/<bad>?startapp=…` link that
 * Telegram rejects as BOT_INVALID, so on a bad value we ignore it and let getMe
 * resolve the token's real bot instead. A slightly-too-strict regex is safe —
 * the worst case is falling through to the authoritative getMe.
 */
const BOT_USERNAME_RE = /^[A-Za-z0-9_]{4,31}bot$/i;

/** Resolve the community bot's @username (for t.me deep links). Cached. */
export async function getCommunityBotUsername(): Promise<string | null> {
  // A configured username still wins (precedence unchanged) — but ONLY when it
  // is actually a valid bot handle. An invalid value falls through to getMe so
  // a broken deep link never ships.
  const configured = process.env.COMMUNITY_BOT_USERNAME?.replace(/^@/, "").trim();
  if (configured && BOT_USERNAME_RE.test(configured)) {
    return configured;
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

export type BotIdentity =
  | { ok: true; id: number; username: string | null }
  | { ok: false; error: string };

declare global {
  // eslint-disable-next-line no-var
  var _communityBotIdentity: { value: BotIdentity; until: number } | undefined;
}

/**
 * Resolve the bot the CONFIGURED token actually belongs to by calling getMe —
 * deliberately IGNORING COMMUNITY_BOT_USERNAME (which is set independently and
 * can name a different bot than the token). Used only for diagnostics on an auth
 * failure so a token↔bot mismatch — the real cause of "signature check failed"
 * with a clean, correctly-lengthed token — is provable from the client.
 *
 * Cached at process scope: /api/community/auth is unauthenticated, so anyone can
 * reach the bad_signature branch — without a cache each junk request would fire a
 * server-side getMe and could be used to hammer Telegram's per-token rate limit
 * (starving real bot traffic). The token's identity is static per process, so a
 * success is cached indefinitely; a failure (invalid/revoked token) is cached for
 * only 60s so a fixed token is re-checked soon.
 */
export async function getBotIdentityFromToken(): Promise<BotIdentity> {
  const cached = global._communityBotIdentity;
  if (cached && Date.now() < cached.until) return cached.value;
  const token = communityBotToken();
  if (!token) return { ok: false, error: "COMMUNITY_BOT_TOKEN not set" };
  const store = (value: BotIdentity): BotIdentity => {
    global._communityBotIdentity = {
      value,
      // success: effectively permanent; failure: 60s so a re-paste is picked up.
      until: value.ok ? Number.MAX_SAFE_INTEGER : Date.now() + 60_000,
    };
    return value;
  };
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      cache: "no-store",
    });
    const j = (await res.json()) as {
      ok?: boolean;
      result?: { id?: number; username?: string };
      description?: string;
    };
    if (!res.ok || !j.ok || !j.result) {
      return store({
        ok: false,
        error: `getMe ${res.status}: ${j.description ?? "rejected the token"}`,
      });
    }
    return store({
      ok: true,
      id: j.result.id ?? 0,
      username: j.result.username ?? null,
    });
  } catch (e) {
    return store({ ok: false, error: `getMe request failed: ${String(e)}` });
  }
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

export interface TgSticker {
  custom_emoji_id?: string;
  emoji?: string;
  set_name?: string;
  is_animated?: boolean;
  is_video?: boolean;
}

/**
 * Resolve custom-emoji document ids → their sticker objects (which carry the
 * owning `set_name` and the plain-emoji `emoji` alt). Used by discovery to
 * learn which packs the seed ids belong to. Returns [] on any failure.
 */
export async function getCustomEmojiStickers(
  ids: string[],
): Promise<TgSticker[]> {
  const token = communityBotToken();
  if (!token || ids.length === 0) return [];
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getCustomEmojiStickers`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ custom_emoji_ids: ids.slice(0, 200) }),
        cache: "no-store",
      },
    );
    const json = (await res.json()) as {
      ok?: boolean;
      result?: TgSticker[];
    };
    return json.ok && Array.isArray(json.result) ? json.result : [];
  } catch {
    return [];
  }
}

/**
 * Fetch a whole sticker set by name — for custom-emoji packs this yields every
 * emoji in the pack (each with its own `custom_emoji_id`). Returns null on any
 * failure so callers can fail soft.
 */
export async function getStickerSet(
  name: string,
): Promise<{ name: string; title: string; stickers: TgSticker[] } | null> {
  const token = communityBotToken();
  if (!token || !name) return null;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${token}/getStickerSet`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
        cache: "no-store",
      },
    );
    const json = (await res.json()) as {
      ok?: boolean;
      result?: { name?: string; title?: string; stickers?: TgSticker[] };
    };
    if (!json.ok || !json.result) return null;
    return {
      name: json.result.name ?? name,
      title: json.result.title ?? "",
      stickers: Array.isArray(json.result.stickers) ? json.result.stickers : [],
    };
  } catch {
    return null;
  }
}

export function sha256Hex(input: string | Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}
