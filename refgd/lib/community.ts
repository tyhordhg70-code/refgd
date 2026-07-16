/**
 * Community / vouch / group-chat data layer.
 *
 * pg-direct (no ORM), mirrors lib/content.ts. Reads are intentionally
 * NOT cached in-process: Render runs multiple Node instances and an
 * in-memory cache would serve stale community data across workers
 * (same root cause lib/content.ts disabled its cache for in v6.13.49).
 * The DB is the single source of truth; the Telegram bot is a thin,
 * swappable ingestion/launcher/notifier on top of these tables.
 */
import { createHash } from "node:crypto";
import { getPool, initDb } from "./db";
import { probeImageDims } from "./image-dims";
import {
  isCommunityAdmin,
  communityBotToken,
  getStickerSet,
} from "./community-bot";
import {
  getStickersBatch,
  fetchStickerArt,
  type TgSticker,
} from "./emoji-fetch";
import { CUSTOM_EMOJI_IDS, EMOJI_CACHE_VERSION } from "./custom-emoji";

export type VouchSection = "testimonials" | "buy4u" | "announcements";

export const VOUCH_SECTIONS: VouchSection[] = [
  "testimonials",
  "buy4u",
  "announcements",
];

export function isVouchSection(x: unknown): x is VouchSection {
  return (
    typeof x === "string" &&
    (VOUCH_SECTIONS as string[]).includes(x)
  );
}

export interface VouchMediaMeta {
  kind: "photo" | "video";
  /** Video duration in seconds; null for photos/unknown. */
  duration: number | null;
  /** vouch_media id of the video's poster frame; null for photos. */
  posterId: string | null;
}

export interface Vouch {
  id: string;
  section: VouchSection;
  authorName: string;
  body: string;
  mediaIds: string[];
  /** Intrinsic pixel size per media id (same order); null when unknown. */
  mediaDims: ({ w: number; h: number } | null)[];
  /** Per-media kind/duration/poster (same order as mediaIds). */
  mediaMeta: (VouchMediaMeta | null)[];
  pinned: boolean;
  createdAt: string;
  originDate: string | null;
}

interface VouchRow {
  id: string;
  section: string;
  author_name: string;
  body: string;
  pinned: boolean;
  created_at: string;
  origin_date: string | null;
  media_ids: string[];
  media_ws: (number | null)[] | null;
  media_hs: (number | null)[] | null;
  media_kinds: (string | null)[] | null;
  media_durations: (number | null)[] | null;
  media_posters: (string | number | null)[] | null;
}

/**
 * node-postgres returns TIMESTAMPTZ columns as JS Date objects, but every
 * consumer (client components, deterministic date grouping, RSC props)
 * expects ISO strings — normalize at the mapper boundary.
 */
function isoTs(v: string | Date): string {
  return v instanceof Date ? v.toISOString() : new Date(v).toISOString();
}

function mapVouch(r: VouchRow): Vouch {
  return {
    id: String(r.id),
    section: isVouchSection(r.section) ? r.section : "testimonials",
    authorName: r.author_name,
    body: r.body,
    mediaIds: (r.media_ids ?? []).map((x) => String(x)),
    mediaDims: (r.media_ids ?? []).map((_, i) => {
      const w = r.media_ws?.[i];
      const h = r.media_hs?.[i];
      return typeof w === "number" && typeof h === "number" && w > 0 && h > 0
        ? { w, h }
        : null;
    }),
    mediaMeta: (r.media_ids ?? []).map((_, i) => {
      const kind = r.media_kinds?.[i];
      if (kind !== "video") return null; // photos need no extra meta
      const dur = r.media_durations?.[i];
      const poster = r.media_posters?.[i];
      return {
        kind: "video" as const,
        duration: typeof dur === "number" && dur > 0 ? dur : null,
        posterId: poster === null || poster === undefined ? null : String(poster),
      };
    }),
    pinned: r.pinned,
    createdAt: isoTs(r.created_at),
    originDate: r.origin_date === null ? null : isoTs(r.origin_date),
  };
}

/** List vouches, newest first (pinned float to top). No in-process cache. */
export async function listVouches(
  section?: VouchSection,
  limit = 300,
  offset = 0,
): Promise<Vouch[]> {
  await initDb();
  const params: unknown[] = [];
  let where = "";
  if (section) {
    params.push(section);
    where = `WHERE v.section = $${params.length}`;
  }
  params.push(limit);
  const limIdx = params.length;
  params.push(offset);
  const offIdx = params.length;
  const { rows } = await getPool().query<VouchRow>(
    `SELECT v.id, v.section, v.author_name, v.body, v.pinned,
            v.created_at, v.origin_date,
            COALESCE(
              array_agg(m.id ORDER BY m.id) FILTER (WHERE m.id IS NOT NULL),
              ARRAY[]::bigint[]
            ) AS media_ids,
            COALESCE(
              array_agg(m.w ORDER BY m.id) FILTER (WHERE m.id IS NOT NULL),
              ARRAY[]::integer[]
            ) AS media_ws,
            COALESCE(
              array_agg(m.h ORDER BY m.id) FILTER (WHERE m.id IS NOT NULL),
              ARRAY[]::integer[]
            ) AS media_hs,
            COALESCE(
              array_agg(m.kind ORDER BY m.id) FILTER (WHERE m.id IS NOT NULL),
              ARRAY[]::text[]
            ) AS media_kinds,
            COALESCE(
              array_agg(m.duration ORDER BY m.id) FILTER (WHERE m.id IS NOT NULL),
              ARRAY[]::real[]
            ) AS media_durations,
            COALESCE(
              array_agg(m.poster_id ORDER BY m.id) FILTER (WHERE m.id IS NOT NULL),
              ARRAY[]::bigint[]
            ) AS media_posters
       FROM vouches v
       LEFT JOIN vouch_media m ON m.vouch_id = v.id AND m.kind <> 'poster'
       ${where}
      GROUP BY v.id
      ORDER BY v.pinned DESC, v.created_at DESC, v.id DESC
      LIMIT $${limIdx} OFFSET $${offIdx}`,
    params,
  );
  return rows.map(mapVouch);
}

export async function countVouches(section?: VouchSection): Promise<number> {
  await initDb();
  const params: unknown[] = [];
  let where = "";
  if (section) {
    params.push(section);
    where = `WHERE section = $1`;
  }
  const { rows } = await getPool().query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM vouches ${where}`,
    params,
  );
  return Number(rows[0]?.n ?? "0");
}

export interface CreateVouchInput {
  section: VouchSection;
  authorName: string;
  body: string;
  originChatId?: string | number | null;
  originMsgId?: string | number | null;
  mediaGroupId?: string | null;
  dedupeHash?: string | null;
  originDate?: Date | string | null;
}

/** Insert a vouch. Returns the new id, or null if a de-dupe conflict skipped it. */
export async function createVouch(
  input: CreateVouchInput,
): Promise<string | null> {
  await initDb();
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO vouches
       (section, author_name, body, origin_chat_id, origin_msg_id,
        media_group_id, dedupe_hash, origin_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     ON CONFLICT DO NOTHING
     RETURNING id`,
    [
      input.section,
      input.authorName,
      input.body,
      input.originChatId ?? null,
      input.originMsgId ?? null,
      input.mediaGroupId ?? null,
      input.dedupeHash ?? null,
      input.originDate ?? null,
    ],
  );
  return rows[0] ? String(rows[0].id) : null;
}

/** Find an existing vouch from the same forwarded album (media group). */
export async function findVouchByMediaGroup(
  originChatId: string | number,
  mediaGroupId: string,
): Promise<string | null> {
  await initDb();
  const { rows } = await getPool().query<{ id: string }>(
    `SELECT id FROM vouches
      WHERE origin_chat_id = $1 AND media_group_id = $2
      ORDER BY id DESC LIMIT 1`,
    [originChatId, mediaGroupId],
  );
  return rows[0] ? String(rows[0].id) : null;
}

export async function addVouchMedia(
  vouchId: string,
  bytes: Buffer,
  mime: string,
  sha256?: string | null,
): Promise<string | null> {
  await initDb();
  // Guard against re-ingesting the same photo (Telegram retries the webhook,
  // and album parts can race) by content hash within a vouch. Returns null
  // when the identical image is already attached. Intrinsic dimensions are
  // probed from the bytes so bubbles can reserve the aspect-ratio box before
  // the photo loads (fixes image pop-in on READ ME/Announcements).
  const dims = probeImageDims(bytes);
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO vouch_media (vouch_id, bytes, mime, sha256, w, h)
     SELECT $1, $2, $3, $4, $5, $6
      WHERE $4::text IS NULL
         OR NOT EXISTS (
           SELECT 1 FROM vouch_media WHERE vouch_id = $1 AND sha256 = $4
         )
     RETURNING id`,
    [vouchId, bytes, mime, sha256 ?? null, dims?.w ?? null, dims?.h ?? null],
  );
  return rows[0] ? String(rows[0].id) : null;
}

export async function getVouchMedia(
  id: string,
): Promise<{ bytes: Buffer; mime: string } | null> {
  await initDb();
  const { rows } = await getPool().query<{ bytes: Buffer; mime: string }>(
    `SELECT bytes, mime FROM vouch_media WHERE id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  return { bytes: rows[0].bytes, mime: rows[0].mime };
}

/**
 * Size + mime of a vouch media row WITHOUT pulling the blob out of the
 * database. Lets the media route decide whether the row is small enough to
 * fully load + LRU-cache, or must be served by SQL-sliced byte ranges
 * (videos are 10MB+; a full `SELECT bytes` per range request is exactly the
 * DB-egress pattern that exhausted the data-transfer quota before).
 */
export async function getVouchMediaMeta(
  id: string,
): Promise<{ total: number; mime: string } | null> {
  await initDb();
  const { rows } = await getPool().query<{ total: string; mime: string }>(
    `SELECT octet_length(bytes) AS total, mime FROM vouch_media WHERE id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  return { total: Number(rows[0].total), mime: rows[0].mime };
}

/**
 * A single byte range of a vouch media blob, sliced INSIDE Postgres so only
 * the requested window leaves the database (substring on BYTEA is 1-based).
 */
export async function getVouchMediaSlice(
  id: string,
  start: number,
  length: number,
): Promise<Buffer | null> {
  await initDb();
  const { rows } = await getPool().query<{ chunk: Buffer }>(
    `SELECT substring(bytes FROM $2::int + 1 FOR $3::int) AS chunk
       FROM vouch_media WHERE id = $1`,
    [id, start, length],
  );
  return rows[0] ? rows[0].chunk : null;
}

// ── mod_config: typed key/value JSON store for group settings ─────────
export async function getModConfig<T>(key: string, fallback: T): Promise<T> {
  await initDb();
  const { rows } = await getPool().query<{ value: T }>(
    `SELECT value FROM mod_config WHERE key = $1`,
    [key],
  );
  return rows[0] ? rows[0].value : fallback;
}

export async function setModConfig(key: string, value: unknown): Promise<void> {
  await initDb();
  await getPool().query(
    `INSERT INTO mod_config (key, value, updated_at)
     VALUES ($1, $2::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_at = NOW()`,
    [key, JSON.stringify(value)],
  );
}

/**
 * Atomically claim a rate-limited notification slot. Returns true for at most
 * one caller per `intervalS` window — safe across Render's multiple workers
 * because the guard is a single conditional upsert on mod_config.updated_at.
 * Used to throttle chat notifications so subscribers aren't pinged on every
 * message.
 */
export async function claimNotifySlot(
  key: string,
  intervalS: number,
): Promise<boolean> {
  await initDb();
  const { rowCount } = await getPool().query(
    `INSERT INTO mod_config (key, value, updated_at)
     VALUES ($1, 'true'::jsonb, NOW())
     ON CONFLICT (key) DO UPDATE SET updated_at = NOW()
       WHERE mod_config.updated_at <= NOW() - make_interval(secs => $2)
     RETURNING key`,
    [key, intervalS],
  );
  return (rowCount ?? 0) > 0;
}

/** Backfill an album's caption if the first-arriving part had no text. */
export async function updateVouchBodyIfEmpty(
  vouchId: string,
  body: string,
): Promise<void> {
  if (!body) return;
  await initDb();
  await getPool().query(
    `UPDATE vouches SET body = $2 WHERE id = $1 AND (body IS NULL OR body = '')`,
    [vouchId, body],
  );
}

/**
 * Admin edit of a read-only history post body (Client Testimonials, BUY4U
 * Vouches, Announcements). Unlike updateVouchBodyIfEmpty (an ingest-time
 * backfill) this overwrites any existing body unconditionally. Returns true
 * when a row was actually updated.
 */
export async function updateVouchBody(
  vouchId: string,
  body: string,
): Promise<boolean> {
  await initDb();
  const { rowCount } = await getPool().query(
    `UPDATE vouches SET body = $2 WHERE id = $1`,
    [vouchId, body],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Admin pin/unpin of a read-only history post (Client Testimonials, BUY4U
 * Vouches, Announcements). Mirrors setMessagePinned for live chat messages so
 * migrated bubbles can be pinned the same way; listVouches already floats
 * pinned rows to the top. Returns true when a row was actually updated.
 */
export async function setVouchPinned(
  vouchId: string,
  pinned: boolean,
): Promise<boolean> {
  await initDb();
  const { rowCount } = await getPool().query(
    `UPDATE vouches SET pinned = $2 WHERE id = $1`,
    [vouchId, pinned],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Admin hard-delete of a read-only history post (Client Testimonials, BUY4U
 * Vouches, Announcements). Removes the vouch row, its stored media and any
 * live reactions members added under the readonly "v<id>" key. There are no
 * FK constraints between these tables, so the cascade is manual (same pattern
 * as the chat sweep). Unrecoverable. Returns true when a row was deleted.
 */
export async function deleteVouch(vouchId: string): Promise<boolean> {
  await initDb();
  const { rowCount } = await getPool().query(
    `WITH del AS (
       DELETE FROM vouches WHERE id = $1 RETURNING id
     ),
     media AS (
       DELETE FROM vouch_media
        WHERE vouch_id IN (SELECT id FROM del)
     ),
     rx AS (
       DELETE FROM message_reactions
        WHERE message_id IN (SELECT 'v' || id::text FROM del)
     )
     SELECT id FROM del`,
    [vouchId],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Active ingestion section — a single global toggle the admin flips from the
 * bot (/testimonials, /buy4u, /announcements). Kept in mod_config so it
 * survives restarts and is shared across Render instances.
 */
export async function getActiveSection(): Promise<VouchSection> {
  const v = await getModConfig<{ section?: string }>("active_section", {});
  return isVouchSection(v.section) ? v.section : "testimonials";
}

export async function setActiveSection(section: VouchSection): Promise<void> {
  await setModConfig("active_section", { section });
}

// ── pending_forwards: destination-picker queue for the ingestion bot ──
// Forwards accumulate here until the admin taps a destination button; the
// prompt ledger guarantees exactly ONE keyboard per outstanding batch even
// across album parts and Render's multi-worker webhook delivery.

export interface PendingForwardInput {
  chatId: string | number;
  batchKey: string;
  author: string;
  body: string;
  fileId?: string | null;
  fileUniqueId?: string | null;
  mediaGroupId?: string | null;
  originMsgId?: number | null;
  originDate?: Date | null;
}

export interface PendingForwardRow {
  id: string;
  author: string;
  body: string;
  fileId: string | null;
  fileUniqueId: string | null;
  mediaGroupId: string | null;
  originMsgId: number | null;
  originDate: Date | null;
}

export async function enqueuePendingForward(
  input: PendingForwardInput,
): Promise<void> {
  await initDb();
  await getPool().query(
    `INSERT INTO pending_forwards
       (chat_id, batch_key, author, body, file_id, file_unique_id,
        media_group_id, origin_msg_id, origin_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      input.chatId,
      input.batchKey,
      input.author,
      input.body,
      input.fileId ?? null,
      input.fileUniqueId ?? null,
      input.mediaGroupId ?? null,
      input.originMsgId ?? null,
      input.originDate ?? null,
    ],
  );
}

/**
 * Atomically claim the right to send THE destination keyboard for a batch.
 * Returns true only for the single caller that wins the INSERT race.
 */
export async function claimForwardPrompt(
  batchKey: string,
  chatId: string | number,
): Promise<boolean> {
  await initDb();
  const { rows } = await getPool().query(
    `INSERT INTO pending_forward_prompts (batch_key, chat_id)
     VALUES ($1, $2)
     ON CONFLICT (batch_key) DO NOTHING
     RETURNING batch_key`,
    [batchKey, chatId],
  );
  return rows.length > 0;
}

/** Remember the prompt's Telegram message id (edited after the pick). */
export async function setForwardPromptMsg(
  batchKey: string,
  msgId: number,
): Promise<void> {
  await initDb();
  await getPool().query(
    `UPDATE pending_forward_prompts SET prompt_msg_id = $2 WHERE batch_key = $1`,
    [batchKey, msgId],
  );
}

/**
 * Atomically drain every queued forward for a chat (the admin picked a
 * destination or discarded). Also clears the prompt ledger so the NEXT
 * forward mints a fresh keyboard. DELETE … RETURNING keeps the claim safe
 * across concurrent callback deliveries — only one caller gets the rows.
 */
export async function claimPendingForwards(
  chatId: string | number,
): Promise<PendingForwardRow[]> {
  await initDb();
  const { rows } = await getPool().query<{
    id: string;
    author: string;
    body: string;
    file_id: string | null;
    file_unique_id: string | null;
    media_group_id: string | null;
    origin_msg_id: string | null;
    origin_date: Date | null;
  }>(
    `DELETE FROM pending_forwards WHERE chat_id = $1
     RETURNING id, author, body, file_id, file_unique_id, media_group_id,
               origin_msg_id, origin_date`,
    [chatId],
  );
  await getPool()
    .query(`DELETE FROM pending_forward_prompts WHERE chat_id = $1`, [chatId])
    .catch(() => undefined);
  return rows
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map((r) => ({
      id: String(r.id),
      author: r.author,
      body: r.body,
      fileId: r.file_id,
      fileUniqueId: r.file_unique_id,
      mediaGroupId: r.media_group_id,
      originMsgId: r.origin_msg_id === null ? null : Number(r.origin_msg_id),
      originDate: r.origin_date,
    }));
}

/** Opportunistic 24h sweep — an abandoned queue must not post days later. */
export async function purgeStalePendingForwards(): Promise<void> {
  await initDb();
  await getPool()
    .query(
      `DELETE FROM pending_forwards WHERE created_at < NOW() - INTERVAL '24 hours'`,
    )
    .catch(() => undefined);
  await getPool()
    .query(
      `DELETE FROM pending_forward_prompts
        WHERE created_at < NOW() - INTERVAL '24 hours'`,
    )
    .catch(() => undefined);
}

// ── recent_actions: admin audit log (3-day retention swept elsewhere) ─
export interface RecordActionInput {
  actorTgId?: string | number | null;
  actorName?: string | null;
  action: string;
  target?: string | null;
  meta?: Record<string, unknown>;
}

export async function recordAction(input: RecordActionInput): Promise<void> {
  await initDb();
  await getPool().query(
    `INSERT INTO recent_actions
       (actor_tg_id, actor_name, action, target, meta)
     VALUES ($1, $2, $3, $4, $5::jsonb)`,
    [
      input.actorTgId ?? null,
      input.actorName ?? null,
      input.action,
      input.target ?? null,
      JSON.stringify(input.meta ?? {}),
    ],
  );
  // Opportunistic 3-day retention sweep on the write path (no cron needed).
  await getPool()
    .query(`DELETE FROM recent_actions WHERE created_at < NOW() - INTERVAL '3 days'`)
    .catch(() => undefined);
}

export interface RecentAction {
  id: string;
  actorTgId: string | null;
  actorName: string | null;
  action: string;
  target: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

export async function listRecentActions(limit = 200): Promise<RecentAction[]> {
  await initDb();
  const { rows } = await getPool().query<{
    id: string;
    actor_tg_id: string | null;
    actor_name: string | null;
    action: string;
    target: string | null;
    meta: Record<string, unknown>;
    created_at: string;
  }>(
    `SELECT id, actor_tg_id, actor_name, action, target, meta, created_at
       FROM recent_actions
      WHERE created_at > NOW() - INTERVAL '3 days'
      ORDER BY id DESC
      LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({
    id: String(r.id),
    actorTgId: r.actor_tg_id ? String(r.actor_tg_id) : null,
    actorName: r.actor_name,
    action: r.action,
    target: r.target,
    meta: r.meta ?? {},
    createdAt: r.created_at,
  }));
}

// ── Group chat: members, messages, reactions ─────────────────────────
export interface ChatMemberInput {
  tgId: string;
  name: string;
  photo: string | null;
  isAdmin: boolean;
  inviteSlug?: string | null;
  /**
   * Telegram @username (no @). Only the auth route passes this (it exists
   * solely in verified initData); every other caller passes nothing and the
   * COALESCE keeps whatever handle was last captured. Never displayed.
   */
  username?: string | null;
}

/**
 * Join / refresh a chat member (called when a signed-in member loads or posts).
 *
 * Returns TRUE only when this call created a brand-new row — i.e. the member's
 * first-ever sign-in. `(xmax = 0)` is the standard Postgres idiom: a freshly
 * INSERTed row has no deleting/locking transaction recorded, while the
 * ON CONFLICT UPDATE path stamps xmax, so recurring members always report
 * false. The auth route uses this to fire the one-time Rose join greeting.
 */
export async function upsertChatMember(m: ChatMemberInput): Promise<boolean> {
  await initDb();
  const { rows } = await getPool().query<{ inserted: boolean }>(
    `INSERT INTO chat_members (tg_id, first_name, photo_url, is_admin, invite_slug, username, last_seen)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (tg_id) DO UPDATE
       SET first_name  = EXCLUDED.first_name,
           photo_url   = EXCLUDED.photo_url,
           is_admin    = EXCLUDED.is_admin,
           last_seen   = NOW(),
           invite_slug = COALESCE(chat_members.invite_slug, EXCLUDED.invite_slug),
           username    = COALESCE(EXCLUDED.username, chat_members.username)
     RETURNING (xmax = 0) AS inserted`,
    [m.tgId, m.name, m.photo, m.isAdmin, m.inviteSlug ?? null, m.username ?? null],
  );
  return rows[0]?.inserted === true;
}

/**
 * Rose-style join greeting (/setwelcome): when a member signs in for the
 * FIRST time and an admin has set a welcome message, Rose posts it into the
 * live Group Chat once — exactly like @MissRose_bot greeting a new joiner.
 * Recurring sign-ins never reach here (upsertChatMember reports inserted
 * only on the very first row). Placeholders match the /setwelcome contract:
 * {first} → the joiner's first name, {chatname} → the community name
 * (owner: "RefundGod Law Firm"). Greetings auto-delete after ONE HOUR
 * (owner ask) — much shorter than the 7-day chat default — so the sweep
 * clears them quickly and the chat never accumulates join noise. Callers
 * must treat this as fail-soft — a greeting error can never break sign-in.
 */
export async function greetNewMember(name: string): Promise<void> {
  const welcome = await getModConfig<string>("welcome", "");
  const body = (typeof welcome === "string" ? welcome : "").trim();
  if (!body) return;
  const first = name.trim().split(/\s+/)[0] || "friend";
  const text = body
    .replace(/\{first\}/gi, first)
    .replace(/\{chatname\}/gi, "RefundGod Law Firm");
  await ensureBotMember();
  await createChatMessage({
    tgId: BOT_MEMBER_TG_ID,
    authorName: BOT_MEMBER_NAME,
    body: text,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    topic: "chat",
  });
}

/**
 * The web-app "bot" identity that authors auto-reply filter messages. tg_id 0
 * can never collide with a real Telegram user (real ids start at 1) and is
 * refused as a moderation target. NOT in COMMUNITY_ADMIN_TG_IDS — the bot
 * needs no privileges; its replies are ordinary chat rows.
 */
export const BOT_MEMBER_TG_ID = "0";
export const BOT_MEMBER_NAME = "Rose";
/** Rose's real profile photo (owner ask: authentic avatar), self-hosted. */
export const BOT_MEMBER_PHOTO = "/rose-bot-photo.jpg";

/**
 * Lazily (re)create the bot's member row so its bubbles get a name+avatar.
 * DO UPDATE (not DO NOTHING) so an existing prod row is migrated to the Rose
 * identity on the first command after a deploy — no manual DB step needed.
 */
export async function ensureBotMember(): Promise<void> {
  await initDb();
  await getPool().query(
    `INSERT INTO chat_members (tg_id, first_name, photo_url, is_admin)
     VALUES ($1, $2, $3, FALSE)
     ON CONFLICT (tg_id) DO UPDATE
       SET first_name = EXCLUDED.first_name, photo_url = EXCLUDED.photo_url`,
    [BOT_MEMBER_TG_ID, BOT_MEMBER_NAME, BOT_MEMBER_PHOTO],
  );
}

/**
 * Resolve `/ban @handle` style targeting. Case-insensitive; only finds
 * members whose handle was captured at sign-in (initData) — admins fall back
 * to reply-targeting or numeric ids for anyone else.
 */
export async function findMemberByUsername(
  handle: string,
): Promise<{ tgId: string; name: string } | null> {
  await initDb();
  const { rows } = await getPool().query<{ tg_id: string; first_name: string }>(
    `SELECT tg_id::text AS tg_id, first_name
       FROM chat_members
      WHERE LOWER(username) = LOWER($1)
      LIMIT 1`,
    [handle.replace(/^@/, "")],
  );
  return rows[0]
    ? { tgId: rows[0].tg_id, name: rows[0].first_name || rows[0].tg_id }
    : null;
}

/* ── @Display-Name mentions ──────────────────────────────────────────
 * Server-composed mention token: `[m:<tgId>:<Display Name>]`. Only the
 * server ever composes these (same contract as [voice:]/[poll:]) — a posted
 * or edited body has its plain `@Name` text rewritten here when it matches a
 * member's display name. format.tsx renders the token as a Web-A blue
 * mention and tokenPreview collapses it back to `@Name` for reply embeds,
 * topic rows, copy text and notifications. Telegram usernames are NEVER
 * used for this feature (owner ask: display names only).
 */
export const MENTION_TOKEN_RE = /\[m:(\d+):([^\]\n]{1,64})\]/g;

export interface MentionTarget {
  tgId: string;
  name: string;
}

/** Every mentionable member: live display name + id. Excludes the reserved
 *  Rose bot row and banned members; usernames are deliberately not read. */
export async function listMentionTargets(): Promise<MentionTarget[]> {
  await initDb();
  const { rows } = await getPool().query<{
    tg_id: string;
    first_name: string | null;
  }>(
    `SELECT tg_id::text AS tg_id, first_name
       FROM chat_members
      WHERE tg_id IS NOT NULL AND tg_id::text <> $1
        AND is_banned = FALSE
        AND COALESCE(first_name, '') <> ''`,
    [BOT_MEMBER_TG_ID],
  );
  return rows
    .map((r) => ({ tgId: r.tg_id, name: (r.first_name ?? "").trim() }))
    .filter((m) => m.name.length > 0);
}

const RE_ESCAPE = /[.*+?^${}()|[\]\\]/g;

/** Mention display text: exactly one leading `@` even when the member's
 *  display name itself starts with one (the owner shows as "@RefundGod"). */
export function mentionDisplay(name: string): string {
  return name.startsWith("@") ? name : `@${name}`;
}

/**
 * Rewrite plain `@Display Name` text into server-composed mention tokens.
 * Client-supplied [m:] tokens are folded back to plain text FIRST so a member
 * can never spoof a mention that didn't actually match here. Longest display
 * name wins, so "@N. N. hello" never half-matches a shorter member name that
 * happens to be its prefix; a sentinel placeholder keeps a later (shorter)
 * name from matching inside an already-composed token. A display name's own
 * leading `@` folds into the typed one, so `@RefundGod` matches — users never
 * have to type `@@RefundGod`.
 */
export async function rewriteMentions(text: string): Promise<string> {
  if (!text) return text;
  let out = text.replace(MENTION_TOKEN_RE, (_a, _id, name: string) =>
    mentionDisplay(name),
  );
  if (!out.includes("@")) return out;
  const members = await listMentionTargets().catch(
    () => [] as MentionTarget[],
  );
  if (members.length === 0) return out;
  const sorted = [...members].sort((a, b) => b.name.length - a.name.length);
  const toks: string[] = [];
  for (const m of sorted) {
    const typed = m.name.startsWith("@") ? m.name.slice(1) : m.name;
    if (!typed) continue;
    const re = new RegExp(`@${typed.replace(RE_ESCAPE, "\\$&")}(?![\\w@])`, "gi");
    out = out.replace(re, () => {
      toks.push(`[m:${m.tgId}:${m.name}]`);
      return `\u0000${toks.length - 1}\u0000`;
    });
  }
  return out.replace(/\u0000(\d+)\u0000/g, (_a, i: string) => toks[Number(i)] ?? "");
}

/** Unique member ids mentioned by a (rewritten) body's [m:] tokens. */
export function mentionedTgIds(body: string): string[] {
  const ids = new Set<string>();
  MENTION_TOKEN_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MENTION_TOKEN_RE.exec(body)) !== null) ids.add(m[1]);
  return Array.from(ids);
}

/** Human snippet of a body for mention notifications: tokens collapse to
 *  their `@Name`, whitespace flattens, hard cap for a DM preview line. */
export function mentionPreview(body: string): string {
  const flat = body
    .replace(MENTION_TOKEN_RE, (_a, _id, name: string) => mentionDisplay(name))
    .replace(/\[([^\]\n]{1,64})\]\(buttonurl:\/\/[^\s)]+\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > 160 ? `${flat.slice(0, 157)}…` : flat;
}

export async function countChatMembers(): Promise<number> {
  await initDb();
  const { rows } = await getPool().query<{ n: number }>(
    `SELECT COUNT(*)::int AS n FROM chat_members WHERE is_banned = FALSE`,
  );
  return rows[0]?.n ?? 0;
}

export interface ChatMemberModState {
  exists: boolean;
  isBanned: boolean;
  /** Reason the admin typed after "/ban <user>", if any (Rose-style). */
  banReason: string | null;
  mutedUntil: string | null;
}

export async function getChatMemberModState(
  tgId: string,
): Promise<ChatMemberModState> {
  await initDb();
  const { rows } = await getPool().query<{
    is_banned: boolean;
    ban_reason: string | null;
    muted_until: string | null;
  }>(
    `SELECT is_banned, ban_reason, muted_until FROM chat_members WHERE tg_id = $1`,
    [tgId],
  );
  if (!rows[0])
    return { exists: false, isBanned: false, banReason: null, mutedUntil: null };
  return {
    exists: true,
    isBanned: rows[0].is_banned,
    banReason: rows[0].ban_reason,
    mutedUntil: rows[0].muted_until,
  };
}

export interface ChatReaction {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface ChatReplyRef {
  id: string;
  authorName: string;
  body: string;
}

export interface ChatMessage {
  id: string;
  tgId: string;
  authorName: string;
  authorPhoto: string | null;
  body: string;
  /** Attached media (chat_media id), served via /api/community/chat-media/[id]. */
  mediaId: string | null;
  /** Intrinsic pixel size of the photo/video, if measured at upload time. */
  mediaW: number | null;
  mediaH: number | null;
  /** How the attachment renders: photo (default), video clip or document. */
  mediaKind: "photo" | "video" | "file" | null;
  /** Video clip length in seconds; null for photos/files/unknown. */
  mediaDuration: number | null;
  /** chat_media id of the video's poster frame; null unless kind=video. */
  mediaPosterId: string | null;
  /** Document filename shown on file bubbles; null unless kind=file. */
  mediaName: string | null;
  /** Attachment size in bytes (for the file-bubble size label). */
  mediaBytes: number | null;
  isAdmin: boolean;
  pinned: boolean;
  createdAt: string;
  /** ISO timestamp of the last in-place edit, or null if never edited. */
  editedAt: string | null;
  /** ISO auto-delete deadline (group-chat TTL), or null if it never expires. */
  expiresAt: string | null;
  reactions: ChatReaction[];
  reply: ChatReplyRef | null;
}

interface ChatMsgRow {
  id: string;
  tg_id: string;
  author_name: string;
  body: string;
  media_id: string | null;
  media_w: number | null;
  media_h: number | null;
  media_kind: string | null;
  media_duration: number | null;
  media_poster: string | number | null;
  media_name: string | null;
  media_bytes: string | number | null;
  pinned: boolean;
  created_at: string;
  edited_at: string | null;
  expires_at?: string | null;
  photo_url: string | null;
  reply_to: string | null;
  reply_author: string | null;
  reply_body: string | null;
}

const REPLY_SNIPPET_MAX = 140;

/** Attach aggregated reactions (with a per-viewer `mine` flag) to messages. */
async function attachReactions(
  rows: ChatMsgRow[],
  viewerTid: string | null,
): Promise<ChatMessage[]> {
  const base: ChatMessage[] = rows.map((r) => ({
    id: String(r.id),
    tgId: String(r.tg_id),
    authorName: r.author_name,
    authorPhoto: r.photo_url,
    body: r.body,
    mediaId: r.media_id ? String(r.media_id) : null,
    mediaW: r.media_w ?? null,
    mediaH: r.media_h ?? null,
    mediaKind: r.media_id
      ? r.media_kind === "video" || r.media_kind === "file"
        ? r.media_kind
        : "photo"
      : null,
    mediaDuration:
      typeof r.media_duration === "number" && r.media_duration > 0
        ? r.media_duration
        : null,
    mediaPosterId: r.media_poster != null ? String(r.media_poster) : null,
    mediaName: r.media_name ?? null,
    mediaBytes: r.media_bytes != null ? Number(r.media_bytes) : null,
    isAdmin: isCommunityAdmin(r.tg_id),
    pinned: r.pinned,
    createdAt: isoTs(r.created_at),
    editedAt: r.edited_at ? isoTs(r.edited_at) : null,
    expiresAt: r.expires_at ? isoTs(r.expires_at) : null,
    reactions: [],
    reply: r.reply_to
      ? {
          id: String(r.reply_to),
          authorName: r.reply_author ?? "",
          body: (r.reply_body ?? "").slice(0, REPLY_SNIPPET_MAX),
        }
      : null,
  }));
  if (base.length === 0) return base;
  const ids = base.map((m) => m.id);
  const { rows: rx } = await getPool().query<{
    message_id: string;
    emoji: string;
    n: number;
    mine: boolean;
  }>(
    `SELECT message_id, emoji, COUNT(*)::int AS n,
            bool_or(tg_id::text = $2) AS mine
       FROM message_reactions
      WHERE message_id = ANY($1::text[])
      GROUP BY message_id, emoji
      ORDER BY emoji`,
    [ids, viewerTid ?? ""],
  );
  const byId = new Map<string, ChatReaction[]>();
  for (const r of rx) {
    const arr = byId.get(String(r.message_id)) ?? [];
    arr.push({ emoji: r.emoji, count: r.n, mine: Boolean(r.mine) });
    byId.set(String(r.message_id), arr);
  }
  for (const m of base) m.reactions = byId.get(m.id) ?? [];
  return base;
}

/**
 * Forum topics served by the chat GET/POST route. Members can post ONLY in
 * "chat" (the group chat); every other topic is admin-authored: everyone can
 * read them, but only admins may post (the per-topic write gate lives in the
 * chat POST route).
 */
export const CHAT_TOPICS = [
  "chat",
  "testimonials",
  "buy4u",
  "announcements",
  "readme",
] as const;
export type ChatTopic = (typeof CHAT_TOPICS)[number];

export function isChatTopic(v: unknown): v is ChatTopic {
  return typeof v === "string" && (CHAT_TOPICS as readonly string[]).includes(v);
}

export interface ListChatOptions {
  afterId?: string | null;
  limit?: number;
  viewerTid?: string | null;
  /** Topic feed to read; defaults to the live group chat. */
  topic?: ChatTopic;
}

/** Chat messages in chronological (ASC) order. With afterId → only newer. */
export async function listChatMessages(
  opts: ListChatOptions = {},
): Promise<ChatMessage[]> {
  await initDb();
  const limit = Math.min(Math.max(opts.limit ?? 60, 1), 200);
  const viewer = opts.viewerTid ?? null;
  const topic: ChatTopic = opts.topic ?? "chat";
  let rows: ChatMsgRow[];
  if (opts.afterId && /^\d+$/.test(opts.afterId)) {
    const res = await getPool().query<ChatMsgRow>(
      `SELECT m.id, m.tg_id, m.author_name, m.body, m.media_id,
              md.w AS media_w, md.h AS media_h,
              md.kind AS media_kind, md.duration AS media_duration,
              md.poster_id AS media_poster, md.name AS media_name,
              octet_length(md.bytes) AS media_bytes,
              m.pinned, m.created_at,
              m.edited_at, m.expires_at, cm.photo_url,
              m.reply_to, rm.author_name AS reply_author, rm.body AS reply_body
         FROM chat_messages m
         LEFT JOIN chat_members cm ON cm.tg_id = m.tg_id
         LEFT JOIN chat_messages rm ON rm.id = m.reply_to
         LEFT JOIN chat_media md ON md.id = m.media_id
        WHERE m.deleted = FALSE
          AND (m.expires_at IS NULL OR m.expires_at > NOW())
          AND m.topic = $3
          AND m.id > $1
        ORDER BY m.id ASC
        LIMIT $2`,
      [opts.afterId, limit, topic],
    );
    rows = res.rows;
  } else {
    const res = await getPool().query<ChatMsgRow>(
      `SELECT m.id, m.tg_id, m.author_name, m.body, m.media_id,
              md.w AS media_w, md.h AS media_h,
              md.kind AS media_kind, md.duration AS media_duration,
              md.poster_id AS media_poster, md.name AS media_name,
              octet_length(md.bytes) AS media_bytes,
              m.pinned, m.created_at,
              m.edited_at, m.expires_at, cm.photo_url,
              m.reply_to, rm.author_name AS reply_author, rm.body AS reply_body
         FROM chat_messages m
         LEFT JOIN chat_members cm ON cm.tg_id = m.tg_id
         LEFT JOIN chat_messages rm ON rm.id = m.reply_to
         LEFT JOIN chat_media md ON md.id = m.media_id
        WHERE m.deleted = FALSE
          AND (m.expires_at IS NULL OR m.expires_at > NOW())
          AND m.topic = $2
        ORDER BY m.id DESC
        LIMIT $1`,
      [limit, topic],
    );
    rows = res.rows.reverse();
  }
  return attachReactions(rows, viewer);
}

/**
 * Opportunistic hard-sweep on the chat full-load path (never the short-poll);
 * idempotent across instances so no cross-worker lock is needed. Physically
 * DELETEs — not soft-flags — expired GROUP-CHAT messages plus anything already
 * soft-deleted by moderation, and clears any stray TTL left on other sections
 * (which never auto-delete). Reactions and attached media are removed in the
 * same statement so no orphans remain (there are no FK cascades between these
 * tables). listChatMessages also hides not-yet-swept rows, so the feed is
 * always correct regardless of sweep timing.
 */
export async function sweepExpiredMessages(): Promise<number> {
  await initDb();
  const pool = getPool();

  // Group chat is the ONLY section that auto-deletes. Clear any stray TTL still
  // lingering on other sections (from before auto-delete became group-chat-only)
  // so those posts never expire or get hidden.
  await pool
    .query(
      `UPDATE chat_messages SET expires_at = NULL
        WHERE topic <> 'chat' AND expires_at IS NOT NULL`,
    )
    .catch(() => undefined);

  // Expired group-chat messages + anything already soft-deleted, removed from
  // the database for good. Their reactions and media go with them in one atomic
  // statement (data-modifying CTEs share the snapshot).
  const { rows } = await pool.query<{ n: number }>(
    `WITH del AS (
       DELETE FROM chat_messages
        WHERE deleted = TRUE
           OR (topic = 'chat' AND expires_at IS NOT NULL AND expires_at <= NOW())
       RETURNING id, media_id
     ),
     _r AS (
       DELETE FROM message_reactions
        WHERE message_id IN (SELECT id::text FROM del)
     ),
     _m AS (
       -- A deleted video's poster frame is a separate chat_media row linked
       -- via poster_id — remove it in the same statement (CTEs share the
       -- snapshot, so the parent rows are still visible to the subselect).
       DELETE FROM chat_media
        WHERE id IN (SELECT media_id FROM del WHERE media_id IS NOT NULL)
           OR id IN (SELECT poster_id FROM chat_media
                      WHERE id IN (SELECT media_id FROM del WHERE media_id IS NOT NULL)
                        AND poster_id IS NOT NULL)
     )
     SELECT COUNT(*)::int AS n FROM del`,
  );
  return rows[0]?.n ?? 0;
}

export interface CreateChatMessageInput {
  tgId: string;
  authorName: string;
  body: string;
  expiresAt?: Date | string | null;
  replyTo?: string | null;
  /** Topic the message was posted in; defaults to the live group chat. */
  topic?: ChatTopic;
  /** Attached photo (chat_media id) — image + caption land in ONE bubble. */
  mediaId?: string | null;
}

export async function createChatMessage(
  input: CreateChatMessageInput,
): Promise<ChatMessage | null> {
  await initDb();
  const replyTo =
    input.replyTo && /^\d+$/.test(input.replyTo) ? input.replyTo : null;
  const mediaId =
    input.mediaId && /^\d+$/.test(input.mediaId) ? input.mediaId : null;
  const { rows } = await getPool().query<ChatMsgRow>(
    `INSERT INTO chat_messages (tg_id, author_name, body, expires_at, reply_to, topic, media_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id, tg_id, author_name, body, media_id, pinned, created_at, edited_at, expires_at, reply_to,
               (SELECT w FROM chat_media cmed WHERE cmed.id = $7) AS media_w,
               (SELECT h FROM chat_media cmed WHERE cmed.id = $7) AS media_h,
               (SELECT kind FROM chat_media cmed WHERE cmed.id = $7) AS media_kind,
               (SELECT duration FROM chat_media cmed WHERE cmed.id = $7) AS media_duration,
               (SELECT poster_id FROM chat_media cmed WHERE cmed.id = $7) AS media_poster,
               (SELECT name FROM chat_media cmed WHERE cmed.id = $7) AS media_name,
               (SELECT octet_length(bytes) FROM chat_media cmed WHERE cmed.id = $7) AS media_bytes,
               (SELECT photo_url FROM chat_members WHERE tg_id = $1) AS photo_url,
               (SELECT author_name FROM chat_messages r WHERE r.id = $5) AS reply_author,
               (SELECT body FROM chat_messages r WHERE r.id = $5) AS reply_body`,
    [
      input.tgId,
      input.authorName,
      input.body,
      input.expiresAt ?? null,
      replyTo,
      input.topic ?? "chat",
      mediaId,
    ],
  );
  if (!rows[0]) return null;
  const [msg] = await attachReactions(rows, input.tgId);
  return msg ?? null;
}

/** Store an uploaded chat attachment (BYTEA — Render has no persistent disk). */
export async function saveChatMedia(
  bytes: Buffer,
  mime: string,
  w: number | null = null,
  h: number | null = null,
  extra?: {
    kind?: "photo" | "video" | "file";
    duration?: number | null;
    posterId?: string | null;
    name?: string | null;
  },
): Promise<string> {
  await initDb();
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO chat_media (bytes, mime, w, h, kind, duration, poster_id, name)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
    [
      bytes,
      mime,
      w,
      h,
      extra?.kind ?? "photo",
      extra?.duration ?? null,
      extra?.posterId ?? null,
      extra?.name ?? null,
    ],
  );
  return String(rows[0].id);
}

/** Fetch a chat photo for serving via /api/community/chat-media/[id]. */
export async function getChatMedia(
  id: string,
): Promise<{ bytes: Buffer; mime: string } | null> {
  await initDb();
  const { rows } = await getPool().query<{ bytes: Buffer; mime: string }>(
    `SELECT bytes, mime FROM chat_media WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/**
 * Size/kind metadata for the split serving path — large blobs (video clips,
 * documents over the blob-cache entry cap) must NEVER be fully materialized
 * per request; the route SQL-slices the requested byte range instead.
 */
export async function getChatMediaMeta(id: string): Promise<{
  total: number;
  mime: string;
  kind: "photo" | "video" | "file";
  name: string | null;
} | null> {
  await initDb();
  const { rows } = await getPool().query<{
    total: string | number;
    mime: string;
    kind: string | null;
    name: string | null;
  }>(
    `SELECT octet_length(bytes) AS total, mime, kind, name
       FROM chat_media WHERE id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  const kind =
    rows[0].kind === "video" || rows[0].kind === "file"
      ? rows[0].kind
      : "photo";
  return {
    total: Number(rows[0].total),
    mime: rows[0].mime,
    kind,
    name: rows[0].name ?? null,
  };
}

/** SQL-sliced byte range of a large chat attachment (substring on BYTEA). */
export async function getChatMediaSlice(
  id: string,
  start: number,
  length: number,
): Promise<Buffer | null> {
  await initDb();
  const { rows } = await getPool().query<{ chunk: Buffer }>(
    `SELECT substring(bytes FROM $2::int + 1 FOR $3::int) AS chunk
       FROM chat_media WHERE id = $1`,
    [id, start, length],
  );
  return rows[0] ? rows[0].chunk : null;
}

/** Cached custom-emoji sticker (Telegram document id), if fetched before. */
export async function getCustomEmoji(
  id: string,
): Promise<{ bytes: Buffer; mime: string } | null> {
  await initDb();
  const { rows } = await getPool().query<{ bytes: Buffer; mime: string }>(
    `SELECT bytes, mime FROM custom_emoji WHERE id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

/** Cache a custom-emoji sticker downloaded from the Telegram Bot API. */
export async function saveCustomEmoji(
  id: string,
  bytes: Buffer,
  mime: string,
): Promise<void> {
  await initDb();
  await getPool().query(
    `INSERT INTO custom_emoji (id, bytes, mime) VALUES ($1, $2, $3)
     ON CONFLICT (id) DO UPDATE SET bytes = $2, mime = $3, fetched_at = NOW()`,
    [id, bytes, mime],
  );
}

/** Emoji ids that already have a cached row under `id:v<version>` (suffix
 *  stripped). Used by the warm endpoint to compute what is still missing. */
export async function listWarmedEmojiIds(version: number): Promise<Set<string>> {
  await initDb();
  const { rows } = await getPool().query<{ id: string }>(
    `SELECT id FROM custom_emoji WHERE id LIKE '%:v' || $1`,
    [String(version)],
  );
  const suffix = `:v${version}`;
  return new Set(rows.map((r) => String(r.id).slice(0, -suffix.length)));
}

/**
 * Copy every cached row from one ?v generation to the next in a single
 * statement (prior-version rows already hold the ORIGINAL documents, so a
 * cache-version bump must not re-download ~2,300 files from the Bot API).
 * Sub-500-byte poison markers are copied too — a known-blank sticker stays
 * known-blank across bumps. Existing target rows are left untouched.
 */
export async function copyCustomEmojiVersion(
  fromVersion: number,
  toVersion: number,
): Promise<number> {
  await initDb();
  // NOT EXISTS keeps repeat calls from re-reading every prior-generation
  // byte blob just to hit ON CONFLICT DO NOTHING (the warm endpoint is
  // public and calls this every time).
  const { rowCount } = await getPool().query(
    `INSERT INTO custom_emoji (id, bytes, mime)
       SELECT replace(s.id, ':v' || $1, ':v' || $2), s.bytes, s.mime
         FROM custom_emoji s
        WHERE s.id LIKE '%:v' || $1
          AND NOT EXISTS (
            SELECT 1 FROM custom_emoji t
             WHERE t.id = replace(s.id, ':v' || $1, ':v' || $2))
       ON CONFLICT (id) DO NOTHING`,
    [String(fromVersion), String(toVersion)],
  );
  return rowCount ?? 0;
}

export interface PackEmoji {
  id: string;
  alt: string;
  setName: string;
  title: string;
}

/** Upsert a batch of discovered pack emoji (id → alt/set metadata). */
export async function upsertPackEmoji(rows: PackEmoji[]): Promise<number> {
  if (rows.length === 0) return 0;
  await initDb();
  const pool = getPool();
  let n = 0;
  for (const r of rows) {
    if (!/^\d{1,32}$/.test(r.id)) continue;
    await pool.query(
      `INSERT INTO community_emoji_pack (id, alt, set_name, title)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE
         SET alt = EXCLUDED.alt,
             set_name = EXCLUDED.set_name,
             title = EXCLUDED.title`,
      [r.id, r.alt.slice(0, 32), r.setName.slice(0, 128), r.title.slice(0, 128)],
    );
    n++;
  }
  return n;
}

/**
 * mod_config key holding the JSON array of set_names an admin removed from
 * the picker. Discovery (auto + manual "Load packs") filters against it so a
 * removed pack can never be silently resurrected.
 */
export const EMOJI_PACK_DENYLIST_KEY = "emoji_pack_denylist";

/**
 * Remove an entire pack from the picker library by its set_name (admin
 * curation). Only deletes the picker rows — cached emoji bytes in
 * custom_emoji stay, so ids already used inside messages keep rendering.
 */
export async function deletePackBySetName(setName: string): Promise<number> {
  await initDb();
  const { rowCount } = await getPool().query(
    `DELETE FROM community_emoji_pack WHERE set_name = $1`,
    [setName],
  );
  return rowCount ?? 0;
}

/** Is this document id part of a discovered pack? (serving allowlist). */
export async function isPackEmoji(id: string): Promise<boolean> {
  await initDb();
  const { rows } = await getPool().query<{ one: number }>(
    `SELECT 1 AS one FROM community_emoji_pack WHERE id = $1`,
    [id],
  );
  return rows.length > 0;
}

/** Does a cached artwork row already exist under this exact cache key? */
async function hasCustomEmojiRow(key: string): Promise<boolean> {
  await initDb();
  const { rows } = await getPool().query<{ one: number }>(
    `SELECT 1 AS one FROM custom_emoji WHERE id = $1`,
    [key],
  );
  return rows.length > 0;
}

/** `[ce:<docId>:<alt>]` ids referenced by a message body (format.tsx token). */
const BODY_CE_RE = /\[ce:(\d{1,32}):[^\]\n]+\]/g;

/**
 * Send/edit-time discovery for PASTED custom emoji: ids referenced by an
 * incoming message body that are neither seed-pack nor picker-pack ids get
 * validated against getCustomEmojiStickers and their ORIGINAL artwork cached
 * under the current versioned key. The unauthenticated serve route is
 * CACHE-FIRST, so those tiles then render (and animate) WITHOUT widening its
 * allowlist: hand-typed junk ids still die here because Telegram simply
 * returns no sticker for them, and nothing gets cached. Bounded on purpose —
 * runs only for authed message writes, max 5 new ids per message, fail-soft
 * (the message always still posts; a miss just keeps the alt fallback).
 */
export async function discoverMessageEmoji(body: string): Promise<void> {
  try {
    if (!body.includes("[ce:")) return;
    const token = communityBotToken();
    if (!token) return;
    const ids: string[] = [];
    BODY_CE_RE.lastIndex = 0;
    for (const m of body.matchAll(BODY_CE_RE)) {
      const id = m[1] ?? "";
      if (id && !ids.includes(id)) ids.push(id);
    }
    const fresh: string[] = [];
    for (const id of ids) {
      if (fresh.length >= 5) break;
      if (CUSTOM_EMOJI_IDS.has(id)) continue;
      if (await isPackEmoji(id)) continue;
      if (await hasCustomEmojiRow(`${id}:v${EMOJI_CACHE_VERSION}`)) continue;
      fresh.push(id);
    }
    if (fresh.length === 0) return;
    const { ok, stickers } = await getStickersBatch(token, fresh);
    // Owner rule (2026-07-07): a pasted emoji from an UNKNOWN pack pulls the
    // WHOLE pack into the library (max 2 new sets per message, fail-soft;
    // junk ids never reach here because Telegram returns no sticker for
    // them). Shared with the bot's DM teach path — see importSetsFromStickers.
    await importSetsFromStickers(stickers, fresh, 2);
    for (const id of fresh) {
      const sticker = stickers.get(id);
      if (!sticker) {
        // Telegram ANSWERED and doesn't know this id (deleted/junk token):
        // negative-cache a sub-floor poison row so repeat posts of the same
        // id never re-hit the Bot API (the serve route 404s sub-floor rows).
        // ok=false means the batch call itself failed — conclude nothing.
        if (ok) {
          await saveCustomEmoji(
            `${id}:v${EMOJI_CACHE_VERSION}`,
            Buffer.from([0]),
            "application/octet-stream",
          );
        }
        continue;
      }
      const art = await fetchStickerArt(token, sticker);
      if (!art) continue;
      // Sub-floor (blank thumbnail) bytes are still saved: they double as the
      // poison marker the serve route already understands (it 404s those).
      await saveCustomEmoji(`${id}:v${EMOJI_CACHE_VERSION}`, art.bytes, art.mime);
    }
  } catch {
    // Fail-soft: emoji discovery must never block or break a message write.
  }
}

/**
 * Import every UNKNOWN pack (set_name) referenced by these resolved stickers
 * into community_emoji_pack. Admin-removed packs (EMOJI_PACK_DENYLIST_KEY)
 * are skipped so auto-discovery can never silently resurrect a curated-out
 * pack — only the explicit admin discover route may do that. Returns the
 * titles of the packs actually imported (for user-facing confirmations).
 */
async function importSetsFromStickers(
  stickers: Map<string, TgSticker>,
  ids: string[],
  maxSets: number,
): Promise<string[]> {
  const denyRaw = await getModConfig<string[]>(EMOJI_PACK_DENYLIST_KEY, []);
  const denylist = new Set(Array.isArray(denyRaw) ? denyRaw : []);
  const newSets: string[] = [];
  for (const id of ids) {
    const name = (stickers.get(id)?.set_name ?? "").trim();
    if (!name || denylist.has(name) || newSets.includes(name)) continue;
    if (newSets.length >= maxSets) break;
    const { rows: setRows } = await getPool().query<{ x: number }>(
      `SELECT 1 AS x FROM community_emoji_pack WHERE set_name = $1 LIMIT 1`,
      [name],
    );
    if (setRows.length === 0) newSets.push(name);
  }
  const titles: string[] = [];
  for (const name of newSets) {
    const set = await getStickerSet(name);
    if (!set) continue;
    const packRows: PackEmoji[] = [];
    for (const st of set.stickers) {
      const cid = st.custom_emoji_id;
      if (!cid) continue;
      packRows.push({
        id: cid,
        alt: st.emoji ?? "",
        setName: set.name,
        title: set.title,
      });
    }
    if (packRows.length > 0) {
      await upsertPackEmoji(packRows);
      titles.push(set.title || set.name);
    }
  }
  return titles;
}

/**
 * Teach the library new packs from explicit custom-emoji document ids — the
 * community bot's DM path. Native Telegram apps copy custom emoji as BARE
 * unicode (no document id), so a pasted unknown-pack emoji can never be
 * resolved website-side; the one channel that still carries the ids is a
 * Telegram message's entities, which the ingestion bot sees. An admin
 * DMs/forwards any message containing the emoji and every unknown pack in it
 * gets imported (picker-visible + serve-route allowlisted). Returns imported
 * pack titles; [] when everything was already known (or on any failure —
 * teaching must never break the webhook).
 */
export async function learnEmojiPacksFromIds(
  rawIds: string[],
): Promise<string[]> {
  try {
    const token = communityBotToken();
    if (!token) return [];
    const ids = [...new Set(rawIds.filter((s) => /^\d{1,32}$/.test(s)))].slice(
      0,
      20,
    );
    if (ids.length === 0) return [];
    await initDb();
    const { stickers } = await getStickersBatch(token, ids);
    return await importSetsFromStickers(stickers, ids, 5);
  } catch {
    return [];
  }
}

/** Every discovered pack emoji, ordered by pack then insert order. */
export async function listPackEmoji(): Promise<PackEmoji[]> {
  await initDb();
  const { rows } = await getPool().query<{
    id: string;
    alt: string;
    set_name: string;
    title: string;
  }>(
    `SELECT id, alt, set_name, title FROM community_emoji_pack
      ORDER BY title, set_name, created_at, id`,
  );
  return rows.map((r) => ({
    id: String(r.id),
    alt: r.alt,
    setName: r.set_name,
    title: r.title,
  }));
}

export const CHAT_REACTION_EMOJI = [
  "👍",
  "❤️",
  "🔥",
  "😂",
  "😮",
  "🙏",
  "💯",
  "🎉",
];

/**
 * A single emoji grapheme: a regional-indicator pair, a keycap, or an
 * Extended_Pictographic base with optional skin-tone / ZWJ continuations.
 * Reactions accept any one emoji (the full picker), so CHAT_REACTION_EMOJI is
 * now just the quick-reaction row rather than an allow-list.
 */
const SINGLE_EMOJI_RE =
  /^(?:\p{Regional_Indicator}\p{Regional_Indicator}|[#*0-9]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:[\u{1F3FB}-\u{1F3FF}]|\uFE0F)?(?:\u200D\p{Extended_Pictographic}(?:[\u{1F3FB}-\u{1F3FF}]|\uFE0F)?)*)$/u;

/** True when `s` is exactly one emoji (server-side reaction gate). */
export function isReactionEmoji(s: string): boolean {
  return s.length > 0 && s.length <= 40 && SINGLE_EMOJI_RE.test(s);
}

/** Toggle a reaction; returns the updated reaction summary for the message. */
export async function toggleReaction(
  messageId: string,
  tgId: string,
  emoji: string,
): Promise<{ reactions: ChatReaction[]; limited: boolean }> {
  await initDb();
  // Toggle OFF first: removals are always allowed, and running the DELETE
  // before the capped INSERT means the 2-reaction limit can never block an
  // un-react.
  const del = await getPool().query(
    `DELETE FROM message_reactions
      WHERE message_id = $1 AND tg_id = $2 AND emoji = $3`,
    [messageId, tgId, emoji],
  );
  let limited = false;
  if (del.rowCount === 0) {
    // Adding a NEW reaction — capped at 2 distinct emoji per user per post
    // (owner rule 2026-07-07). The count guard lives inside the INSERT so
    // check + insert stay a single statement.
    const ins = await getPool().query(
      `INSERT INTO message_reactions (message_id, tg_id, emoji)
       SELECT $1, $2, $3
        WHERE (SELECT COUNT(DISTINCT emoji) FROM message_reactions
                WHERE message_id = $1 AND tg_id = $2) < 2
       ON CONFLICT (message_id, tg_id, emoji) DO NOTHING`,
      [messageId, tgId, emoji],
    );
    limited = ins.rowCount === 0;
  }
  const { rows } = await getPool().query<{
    emoji: string;
    n: number;
    mine: boolean;
  }>(
    `SELECT emoji, COUNT(*)::int AS n, bool_or(tg_id::text = $2) AS mine
       FROM message_reactions
      WHERE message_id = $1
      GROUP BY emoji
      ORDER BY emoji`,
    [messageId, tgId],
  );
  return {
    reactions: rows.map((r) => ({
      emoji: r.emoji,
      count: r.n,
      mine: Boolean(r.mine),
    })),
    limited,
  };
}

export async function chatMessageExists(id: string): Promise<boolean> {
  await initDb();
  const { rows } = await getPool().query<{ x: number }>(
    `SELECT 1 AS x FROM chat_messages WHERE id = $1 AND deleted = FALSE`,
    [id],
  );
  return rows.length > 0;
}

/**
 * Reactions target three kinds of posts, namespaced in one TEXT key space:
 *   "123"          — live chat message (chat_messages.id)
 *   "v123"         — imported/readonly history bubble (vouches.id)
 *   "seed:<key>"   — constant seed posts (readme/welcome/announcement/…)
 */
const SEED_REACTION_TARGETS = new Set([
  "seed:readme",
  "seed:welcome",
  "seed:announcement",
  "seed:chat-notice",
]);

export function isReactionTargetId(id: string): boolean {
  return /^\d+$/.test(id) || /^v\d+$/.test(id) || SEED_REACTION_TARGETS.has(id);
}

/** Whether the reaction target actually exists (per namespace). */
export async function reactionTargetExists(id: string): Promise<boolean> {
  if (/^\d+$/.test(id)) return chatMessageExists(id);
  const v = id.match(/^v(\d+)$/);
  if (v) {
    await initDb();
    const { rows } = await getPool().query<{ x: number }>(
      `SELECT 1 AS x FROM vouches WHERE id = $1`,
      [v[1]],
    );
    return rows.length > 0;
  }
  return SEED_REACTION_TARGETS.has(id);
}

/**
 * Reaction summaries for an arbitrary set of target keys (vouches/seeds/chat
 * alike). Used by the client to hydrate chips on readonly bubbles.
 */
export async function listReactionSummaries(
  ids: string[],
  viewerTid: string | null,
): Promise<Record<string, ChatReaction[]>> {
  const out: Record<string, ChatReaction[]> = {};
  const valid = ids.filter(isReactionTargetId);
  if (valid.length === 0) return out;
  await initDb();
  const { rows } = await getPool().query<{
    message_id: string;
    emoji: string;
    n: number;
    mine: boolean;
  }>(
    `SELECT message_id, emoji, COUNT(*)::int AS n,
            bool_or(tg_id::text = $2) AS mine
       FROM message_reactions
      WHERE message_id = ANY($1::text[])
      GROUP BY message_id, emoji
      ORDER BY emoji`,
    [valid, viewerTid ?? ""],
  );
  for (const r of rows) {
    const arr = out[r.message_id] ?? [];
    arr.push({ emoji: r.emoji, count: r.n, mine: Boolean(r.mine) });
    out[r.message_id] = arr;
  }
  return out;
}

/**
 * Seconds since this member's most recent message, or null if they have never
 * posted. DB-backed so the throttle holds across Render instances (no shared
 * in-process state). Used to rate-limit the open chat POST endpoint.
 */
export async function secondsSinceLastMessage(
  tgId: string,
): Promise<number | null> {
  await initDb();
  const { rows } = await getPool().query<{ secs: number | null }>(
    `SELECT EXTRACT(EPOCH FROM (NOW() - created_at))::float8 AS secs
       FROM chat_messages
      WHERE tg_id = $1
      ORDER BY id DESC
      LIMIT 1`,
    [tgId],
  );
  if (!rows[0] || rows[0].secs === null) return null;
  return rows[0].secs;
}

// ── Moderation: bans, mutes, warns, blocklist, pins, purge ───────────
// All state is DB-backed (no in-process state) so it holds across the
// multiple Render instances. Every mutating action is audited separately
// by the caller via recordAction.

/**
 * Ensure a member row exists so a ban / mute / warn on a not-yet-joined
 * tg_id still sticks (getChatMemberModState reads from chat_members).
 */
export async function ensureMemberStub(
  tgId: string,
  name = "",
): Promise<void> {
  await initDb();
  await getPool().query(
    `INSERT INTO chat_members (tg_id, first_name) VALUES ($1, $2)
     ON CONFLICT (tg_id) DO NOTHING`,
    [tgId, name],
  );
}

export async function setMemberBan(
  tgId: string,
  banned: boolean,
  reason?: string | null,
): Promise<void> {
  await initDb();
  await ensureMemberStub(tgId);
  // Banning: keep any existing reason unless a new one is supplied (the
  // device-evasion re-flag calls this without a reason and must not wipe the
  // one the admin typed). Unbanning always clears the reason.
  await getPool().query(
    banned
      ? `UPDATE chat_members
            SET is_banned = TRUE,
                ban_reason = COALESCE($2, ban_reason)
          WHERE tg_id = $1`
      : `UPDATE chat_members
            SET is_banned = FALSE, ban_reason = NULL
          WHERE tg_id = $1`,
    banned ? [tgId, reason?.trim() || null] : [tgId],
  );
  // IP/device ban (owner ask): banning a member also bans every device signal
  // hash ever recorded for them; unbanning clears those entries again. Both
  // are exact-hash operations — nothing range-based, nothing disclosed.
  if (banned) {
    await getPool().query(
      `INSERT INTO banned_devices (hash, kind, tg_id)
       SELECT hash, kind, tg_id FROM member_devices WHERE tg_id = $1
       ON CONFLICT (hash) DO NOTHING`,
      [tgId],
    );
  } else {
    await getPool().query(`DELETE FROM banned_devices WHERE tg_id = $1`, [tgId]);
  }
}

/* ── IP + device-fingerprint ban enforcement (owner ask) ──────────────────
   Built the way large commercial sites approach it: MANY independent signals,
   scored TOGETHER, instead of one brittle combined hash.

   • Raw signals are NEVER stored — only salted SHA-256 hashes, so a ban is
     undisclosable even from the DB.
   • Each signal (canvas, webgl, audio, hardware profile, ua, self-healing
     device id, ip) is hashed and matched on its OWN. A partial match — e.g.
     the same GPU + audio stack + device-id after a browser reinstall — still
     accrues score toward a block, while no single weak signal false-positives
     alone. This is what survives VPNs (device signals stay) and storage
     clearing (the self-healing id + hardware/gpu signals stay).
   • Signals carry per-kind WEIGHTS; a block fires when either a strong unique
     signal (device id) matches, or the summed weight of matched signals crosses
     a threshold. IP alone is weak (shared NATs/CGNAT) and never discloses.  */

const DEVICE_PEPPER =
  process.env.SESSION_SECRET || "refgd-device-ban-pepper-v1";

/** Per-signal match weight. Higher = more uniquely identifying. */
const SIGNAL_WEIGHT: Record<string, number> = {
  did: 100, // self-healing device id — effectively unique on its own
  fp: 100, // legacy combined fingerprint — unique on its own
  canvas: 45, // gpu/driver/font render — high entropy
  webgl: 45, // unmasked gpu vendor/renderer — high entropy
  audio: 40, // audio stack float profile — high entropy
  ua: 20, // user-agent — medium (changes on browser update)
  hw: 20, // coarse hardware/locale profile — groups similar devices
  ip: 15, // network address — weak (shared/CGNAT), never disclosed
};

/** Summed weight at/above which independent signals constitute a device match. */
const DEVICE_MATCH_THRESHOLD = 80;

/**
 * Kinds that, matched alone, mean "same physical device". ONLY the effectively
 * unique signals qualify: the self-healing device id and the legacy combined
 * fingerprint. Individually-high-entropy but NON-unique component signals
 * (canvas/webgl/audio) deliberately do NOT short-circuit — they must combine
 * (e.g. canvas 45 + webgl 45 = 90 ≥ threshold) so one coincidental GPU/model
 * collision can't autoban a legitimate user.
 */
const STRONG_DEVICE_KINDS = new Set(["did", "fp"]);

/** Salted hash of one device signal. */
export function hashDeviceSignal(kind: string, value: string): string {
  return createHash("sha256")
    .update(`${kind}:${DEVICE_PEPPER}:${value}`)
    .digest("hex");
}

/**
 * Trusted client IP behind Render's proxy. Render appends the real client IP as
 * the LAST x-forwarded-for hop (client-supplied hops are prepended and thus
 * spoofable), so we take the rightmost entry rather than the first. Falls back
 * to x-real-ip, which Render sets to the same trusted value.
 */
export function ipFromRequest(req: Request): string | null {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const hops = xff
      .split(",")
      .map((h) => h.trim())
      .filter(Boolean);
    const last = hops[hops.length - 1];
    if (last) return last;
  }
  return req.headers.get("x-real-ip")?.trim() || null;
}

/**
 * Map of signal kind → salted hash. Includes the legacy `ip`/`fp`/`did` fields
 * plus the independent component signals (canvas/webgl/audio/hw/ua).
 */
export type DeviceSignalHashes = Record<string, string | null | undefined>;

/** Record (upsert) a member's current device-signal hashes. Fail-soft. */
export async function recordMemberDevice(
  tgId: string,
  sig: DeviceSignalHashes,
): Promise<void> {
  await initDb();
  for (const [kind, hash] of Object.entries(sig)) {
    if (!hash) continue;
    await getPool().query(
      `INSERT INTO member_devices (tg_id, kind, hash)
       VALUES ($1, $2, $3)
       ON CONFLICT (tg_id, kind, hash) DO UPDATE SET last_seen = NOW()`,
      [tgId, kind, hash],
    );
  }
}

/**
 * Does this member (or the signals on this request) match a banned device?
 *
 * Score-based: every signal kind that matches a banned hash adds its weight.
 * Returns 'device' when a strong signal matches OR the summed weight of
 * matched NON-ip signals crosses DEVICE_MATCH_THRESHOLD (→ the "previously
 * banned" message). Returns 'ip' when only the IP matched (→ the generic ban
 * message; IP bans are never disclosed). Otherwise 'none'.
 *
 * Checks BOTH the fresh request signals AND every signal ever recorded for
 * this tg_id (so a device caught once stays caught).
 */
export async function checkDeviceBan(
  tgId: string,
  sig: DeviceSignalHashes,
): Promise<"none" | "ip" | "device"> {
  await initDb();
  const fresh = Object.values(sig).filter((h): h is string => Boolean(h));
  const { rows } = await getPool().query<{ kind: string }>(
    `SELECT DISTINCT bd.kind
       FROM banned_devices bd
      WHERE bd.hash = ANY($2::text[])
         OR bd.hash IN (SELECT md.hash FROM member_devices md WHERE md.tg_id = $1)`,
    [tgId, fresh],
  );

  const matchedKinds = new Set(rows.map((r) => r.kind));
  if (matchedKinds.size === 0) return "none";

  // Any strong signal alone = same physical device.
  for (const k of matchedKinds) {
    if (STRONG_DEVICE_KINDS.has(k)) return "device";
  }

  // Otherwise sum the weight of matched non-ip signals against the threshold.
  let score = 0;
  for (const k of matchedKinds) {
    if (k === "ip") continue;
    score += SIGNAL_WEIGHT[k] ?? 0;
  }
  if (score >= DEVICE_MATCH_THRESHOLD) return "device";

  return matchedKinds.has("ip") ? "ip" : "none";
}

/** until = a future Date for a timed mute, or null to unmute. */
export async function setMemberMute(
  tgId: string,
  until: Date | null,
): Promise<void> {
  await initDb();
  await ensureMemberStub(tgId);
  await getPool().query(
    `UPDATE chat_members SET muted_until = $2 WHERE tg_id = $1`,
    [tgId, until],
  );
}

/** Atomic increment + a mod_warns audit row. Returns the new warn count. */
export async function addWarn(
  tgId: string,
  byTgId: string | null,
  reason: string,
): Promise<number> {
  await initDb();
  await ensureMemberStub(tgId);
  await getPool().query(
    `INSERT INTO mod_warns (tg_id, by_tg_id, reason) VALUES ($1, $2, $3)`,
    [tgId, byTgId, reason],
  );
  const { rows } = await getPool().query<{ warn_count: number }>(
    `UPDATE chat_members SET warn_count = warn_count + 1
      WHERE tg_id = $1 RETURNING warn_count`,
    [tgId],
  );
  return rows[0]?.warn_count ?? 0;
}

/** Decrement one warn (floored at 0). Returns the new count. */
export async function removeWarn(tgId: string): Promise<number> {
  await initDb();
  const { rows } = await getPool().query<{ warn_count: number }>(
    `UPDATE chat_members SET warn_count = GREATEST(warn_count - 1, 0)
      WHERE tg_id = $1 RETURNING warn_count`,
    [tgId],
  );
  return rows[0]?.warn_count ?? 0;
}

export async function resetWarns(tgId: string): Promise<void> {
  await initDb();
  await getPool().query(
    `UPDATE chat_members SET warn_count = 0 WHERE tg_id = $1`,
    [tgId],
  );
}

/** Remove the member row (a kick — they may rejoin, unlike a ban). */
export async function kickMember(tgId: string): Promise<void> {
  await initDb();
  await getPool().query(`DELETE FROM chat_members WHERE tg_id = $1`, [tgId]);
}

/** First name for a known member id, or "" if we've never seen them. */
export async function getMemberName(tgId: string): Promise<string> {
  await initDb();
  const { rows } = await getPool().query<{ first_name: string | null }>(
    `SELECT first_name FROM chat_members WHERE tg_id = $1`,
    [tgId],
  );
  return rows[0]?.first_name ?? "";
}

export interface RosterMember {
  tgId: string;
  name: string;
  /** Telegram @username without the @ (null when the member has none). */
  username: string | null;
  photo: string | null;
  isAdmin: boolean;
  isBanned: boolean;
  mutedUntil: string | null;
  warnCount: number;
  lastSeen: string | null;
}

/**
 * The full member roster (name + numeric tg_id + mod state), admins first then
 * most-recently-seen. Powers the admin-only roster panel, whose whole point is
 * to surface the numeric ids the chat otherwise hides so an admin can copy one
 * and run e.g. `/ban 923182`. Hard-capped so a large group can't blow up the
 * response.
 */
export async function listMembers(limit = 1000): Promise<RosterMember[]> {
  await initDb();
  const { rows } = await getPool().query<{
    tg_id: string;
    first_name: string | null;
    username: string | null;
    photo_url: string | null;
    is_admin: boolean;
    is_banned: boolean;
    muted_until: string | null;
    warn_count: number;
    last_seen: string | null;
  }>(
    `SELECT tg_id, first_name, username, photo_url, is_admin, is_banned,
            muted_until, warn_count, last_seen
       FROM chat_members
      WHERE tg_id IS NOT NULL
      ORDER BY is_admin DESC, last_seen DESC NULLS LAST
      LIMIT $1`,
    [Math.min(Math.max(Math.floor(limit), 1), 5000)],
  );
  return rows.map((r) => ({
    tgId: String(r.tg_id),
    name: r.first_name ?? "",
    username: r.username,
    photo: r.photo_url,
    isAdmin: r.is_admin,
    isBanned: r.is_banned,
    mutedUntil: r.muted_until,
    warnCount: r.warn_count ?? 0,
    lastSeen: r.last_seen,
  }));
}

// ── Blocklist (word filters that reject a member's message on post) ───
export async function addBlocklist(
  pattern: string,
  action = "delete",
): Promise<void> {
  await initDb();
  await getPool().query(
    `INSERT INTO mod_blocklist (pattern, action) VALUES ($1, $2)
     ON CONFLICT (pattern) DO UPDATE SET action = EXCLUDED.action`,
    [pattern.toLowerCase(), action],
  );
}

export async function removeBlocklist(pattern: string): Promise<boolean> {
  await initDb();
  const res = await getPool().query(
    `DELETE FROM mod_blocklist WHERE pattern = $1`,
    [pattern.toLowerCase()],
  );
  return (res.rowCount ?? 0) > 0;
}

export async function listBlocklist(): Promise<string[]> {
  await initDb();
  const { rows } = await getPool().query<{ pattern: string }>(
    `SELECT pattern FROM mod_blocklist ORDER BY pattern`,
  );
  return rows.map((r) => r.pattern);
}

/** First blocklisted word contained in the text (case-insensitive), or null. */
export async function matchBlocklist(text: string): Promise<string | null> {
  const words = await listBlocklist();
  if (words.length === 0) return null;
  const hay = text.toLowerCase();
  for (const w of words) {
    if (w && hay.includes(w)) return w;
  }
  return null;
}

// ── Auto-reply filters (Rose-style /filter <trigger> <reply>) ─────────
export interface ModFilter {
  trigger: string;
  response: string;
}

/** Save (or overwrite) an auto-reply filter. Triggers are case-insensitive. */
export async function addFilter(
  trigger: string,
  response: string,
): Promise<void> {
  await initDb();
  await getPool().query(
    `INSERT INTO mod_filters (trigger, response) VALUES ($1, $2)
     ON CONFLICT (trigger) DO UPDATE SET response = EXCLUDED.response`,
    [trigger.toLowerCase(), response],
  );
}

export async function removeFilter(trigger: string): Promise<boolean> {
  await initDb();
  const res = await getPool().query(`DELETE FROM mod_filters WHERE trigger = $1`, [
    trigger.toLowerCase(),
  ]);
  return (res.rowCount ?? 0) > 0;
}

export async function listFilters(): Promise<ModFilter[]> {
  await initDb();
  const { rows } = await getPool().query<{ trigger: string; response: string }>(
    `SELECT trigger, response FROM mod_filters ORDER BY trigger`,
  );
  return rows.map((r) => ({ trigger: r.trigger, response: r.response }));
}

/**
 * First filter whose trigger appears in the text as a whole word (Rose
 * semantics: "hi" fires on "hi there" but not on "this"), case-insensitive.
 * Multi-word triggers match as a substring on word boundaries.
 */
export async function matchFilter(text: string): Promise<ModFilter | null> {
  const filters = await listFilters();
  if (filters.length === 0) return null;
  const hay = text.toLowerCase();
  for (const f of filters) {
    const t = f.trigger;
    if (!t) continue;
    const idx = hay.indexOf(t);
    if (idx < 0) continue;
    const before = idx === 0 ? "" : hay[idx - 1];
    const after = idx + t.length >= hay.length ? "" : hay[idx + t.length];
    const isWordChar = (c: string) => /[a-z0-9_]/.test(c);
    if ((before === "" || !isWordChar(before)) && (after === "" || !isWordChar(after))) {
      return f;
    }
  }
  return null;
}

// ── Pins & purge ─────────────────────────────────────────────────────
export async function setMessagePinned(
  id: string,
  pinned: boolean,
): Promise<boolean> {
  await initDb();
  // Pinning also clears any auto-delete TTL: a pinned announcement must not
  // vanish out from under the pin. Unpinning leaves expires_at untouched.
  const res = await getPool().query(
    `UPDATE chat_messages
        SET pinned = $2,
            expires_at = CASE WHEN $2 THEN NULL ELSE expires_at END
      WHERE id = $1 AND deleted = FALSE`,
    [id, pinned],
  );
  return (res.rowCount ?? 0) > 0;
}

/** Unpin every currently-pinned message. Returns how many were unpinned. */
export async function unpinAll(): Promise<number> {
  await initDb();
  const res = await getPool().query(
    `UPDATE chat_messages SET pinned = FALSE WHERE pinned = TRUE`,
  );
  return res.rowCount ?? 0;
}

/** Soft-delete the most recent `count` live messages (hard cap 100). */
export async function purgeRecentMessages(count: number): Promise<number> {
  await initDb();
  const n = Math.min(Math.max(Math.floor(count), 1), 100);
  const res = await getPool().query(
    `UPDATE chat_messages SET deleted = TRUE
      WHERE id IN (
        SELECT id FROM chat_messages
         WHERE deleted = FALSE
         ORDER BY id DESC
         LIMIT $1
      )`,
    [n],
  );
  return res.rowCount ?? 0;
}

/** Soft-delete a single live message (context-menu "Delete" → /del). */
export async function deleteSingleMessage(id: string): Promise<boolean> {
  await initDb();
  const res = await getPool().query(
    `UPDATE chat_messages SET deleted = TRUE
      WHERE id = $1 AND deleted = FALSE`,
    [id],
  );
  return (res.rowCount ?? 0) > 0;
}

/** Soft-delete live messages from `fromId` forward (hard cap 100). */
export async function purgeFromMessage(fromId: string): Promise<number> {
  await initDb();
  const res = await getPool().query(
    `UPDATE chat_messages SET deleted = TRUE
      WHERE id IN (
        SELECT id FROM chat_messages
         WHERE deleted = FALSE AND id >= $1
         ORDER BY id ASC
         LIMIT 100
      )`,
    [fromId],
  );
  return res.rowCount ?? 0;
}

export interface MessageAuthor {
  tgId: string;
  authorName: string;
}

/** Look up who authored a message (for reply-based command targeting). */
export async function getMessageAuthor(
  id: string,
): Promise<MessageAuthor | null> {
  await initDb();
  const { rows } = await getPool().query<{
    tg_id: string;
    author_name: string;
  }>(`SELECT tg_id, author_name FROM chat_messages WHERE id = $1`, [id]);
  if (!rows[0]) return null;
  return { tgId: String(rows[0].tg_id), authorName: rows[0].author_name };
}

/** Author name + body for a message, for building a pin announcement. */
export async function getMessageForPin(
  id: string,
): Promise<{ authorName: string; body: string } | null> {
  await initDb();
  const { rows } = await getPool().query<{
    author_name: string;
    body: string | null;
  }>(`SELECT author_name, body FROM chat_messages WHERE id = $1`, [id]);
  if (!rows[0]) return null;
  return { authorName: rows[0].author_name, body: rows[0].body ?? "" };
}

/** Owner + deleted flag + body for a message, used to authorize an in-place
 *  edit (the body lets the route refuse edits on forwarded messages, which
 *  carry a leading [fwd:NAME] token). */
export interface MessageEditInfo {
  tgId: string;
  deleted: boolean;
  body: string;
}

export async function getMessageEditInfo(
  id: string,
): Promise<MessageEditInfo | null> {
  await initDb();
  const { rows } = await getPool().query<{
    tg_id: string;
    deleted: boolean;
    body: string | null;
  }>(`SELECT tg_id, deleted, body FROM chat_messages WHERE id = $1`, [id]);
  if (!rows[0]) return null;
  return {
    tgId: String(rows[0].tg_id),
    deleted: Boolean(rows[0].deleted),
    body: String(rows[0].body ?? ""),
  };
}

/**
 * Edit a live message's body in place, stamping edited_at = NOW(). The caller
 * owns authorization (own message or admin) and content validation; this only
 * touches live, non-deleted rows and returns the refreshed message (with its
 * reply preview + reactions re-attached) exactly like listChatMessages.
 */
export async function editChatMessage(
  id: string,
  body: string,
  viewerTid: string | null,
): Promise<ChatMessage | null> {
  await initDb();
  const { rows } = await getPool().query<ChatMsgRow>(
    `UPDATE chat_messages m
        SET body = $2, edited_at = NOW()
      WHERE m.id = $1 AND m.deleted = FALSE
      RETURNING m.id, m.tg_id, m.author_name, m.body, m.media_id, m.pinned,
                m.created_at, m.edited_at,
                (SELECT photo_url FROM chat_members WHERE tg_id = m.tg_id) AS photo_url,
                m.reply_to,
                (SELECT author_name FROM chat_messages r WHERE r.id = m.reply_to) AS reply_author,
                (SELECT body FROM chat_messages r WHERE r.id = m.reply_to) AS reply_body`,
    [id, body],
  );
  if (!rows[0]) return null;
  const [msg] = await attachReactions(rows, viewerTid);
  return msg ?? null;
}

// ── Invite links ─────────────────────────────────────────────────────
// Custom-named shareable links (/i/<slug>) that redirect into /community
// and track clicks + join attribution. Slugs are admin-created.

export interface InviteLink {
  slug: string;
  name: string;
  clicks: number;
  joins: number;
  createdBy: string | null;
  createdAt: string;
}

/** Valid slug: 1-64 chars of [a-z0-9-_], lowercased by the caller. */
export function isValidInviteSlug(x: unknown): x is string {
  return typeof x === "string" && /^[a-z0-9][a-z0-9_-]{0,63}$/.test(x);
}

export async function createInviteLink(
  slug: string,
  name: string,
  createdBy?: string | number | null,
): Promise<InviteLink | null> {
  await initDb();
  const { rows } = await getPool().query<{
    slug: string;
    name: string;
    clicks: number;
    joins: number;
    created_by: string | null;
    created_at: string;
  }>(
    `INSERT INTO invite_links (slug, name, created_by)
     VALUES ($1, $2, $3)
     ON CONFLICT (slug) DO NOTHING
     RETURNING slug, name, clicks, joins, created_by, created_at`,
    [slug, name, createdBy ?? null],
  );
  if (!rows[0]) return null;
  const r = rows[0];
  return {
    slug: r.slug,
    name: r.name,
    clicks: Number(r.clicks),
    joins: Number(r.joins),
    createdBy: r.created_by ? String(r.created_by) : null,
    createdAt: r.created_at,
  };
}

export async function deleteInviteLink(slug: string): Promise<boolean> {
  await initDb();
  const { rowCount } = await getPool().query(
    `DELETE FROM invite_links WHERE slug = $1`,
    [slug],
  );
  return (rowCount ?? 0) > 0;
}

export async function listInviteLinks(): Promise<InviteLink[]> {
  await initDb();
  const { rows } = await getPool().query<{
    slug: string;
    name: string;
    clicks: number;
    joins: number;
    created_by: string | null;
    created_at: string;
  }>(
    `SELECT slug, name, clicks, joins, created_by, created_at
       FROM invite_links
      ORDER BY created_at DESC`,
  );
  return rows.map((r) => ({
    slug: r.slug,
    name: r.name,
    clicks: Number(r.clicks),
    joins: Number(r.joins),
    createdBy: r.created_by ? String(r.created_by) : null,
    createdAt: r.created_at,
  }));
}

// ── Notification subscriptions ───────────────────────────────────────
// Per-category opt-in for web push (VAPID) and Telegram. Both live in the
// one notif_subs table: web-push rows key off the real PushSubscription
// endpoint; Telegram rows use a synthetic `telegram:<tg_id>` endpoint with
// empty keys. `categories` is a jsonb array of NotifCategory strings.

export type NotifCategory =
  | "testimonials"
  | "buy4u"
  | "announcements"
  | "chat";

export const NOTIF_CATEGORIES: NotifCategory[] = [
  "testimonials",
  "buy4u",
  "announcements",
  "chat",
];

export function isNotifCategory(x: unknown): x is NotifCategory {
  return (
    typeof x === "string" && (NOTIF_CATEGORIES as string[]).includes(x)
  );
}

export function sanitizeCategories(input: unknown): NotifCategory[] {
  if (!Array.isArray(input)) return [];
  const out: NotifCategory[] = [];
  for (const v of input) {
    if (isNotifCategory(v) && !out.includes(v)) out.push(v);
  }
  return out;
}

export interface PushKeys {
  p256dh: string;
  auth: string;
}

export interface NotifSub {
  endpoint: string;
  keys: PushKeys | Record<string, never>;
  categories: NotifCategory[];
}

/** Upsert a web-push subscription with its opted-in categories. */
export async function upsertPushSub(
  tgId: string | number,
  endpoint: string,
  keys: PushKeys,
  categories: NotifCategory[],
): Promise<void> {
  await initDb();
  await getPool().query(
    `INSERT INTO notif_subs (tg_id, endpoint, keys, categories, updated_at)
     VALUES ($1, $2, $3::jsonb, $4::jsonb, NOW())
     ON CONFLICT (endpoint) WHERE endpoint IS NOT NULL DO UPDATE
       SET tg_id = EXCLUDED.tg_id,
           keys = EXCLUDED.keys,
           categories = EXCLUDED.categories,
           updated_at = NOW()`,
    [tgId, endpoint, JSON.stringify(keys), JSON.stringify(categories)],
  );
}

/** Upsert the Telegram opt-in row for a member (synthetic endpoint). */
export async function setTelegramNotify(
  tgId: string | number,
  categories: NotifCategory[],
): Promise<void> {
  await initDb();
  const endpoint = `telegram:${tgId}`;
  await getPool().query(
    `INSERT INTO notif_subs (tg_id, endpoint, keys, categories, updated_at)
     VALUES ($1, $2, '{}'::jsonb, $3::jsonb, NOW())
     ON CONFLICT (endpoint) WHERE endpoint IS NOT NULL DO UPDATE
       SET categories = EXCLUDED.categories, updated_at = NOW()`,
    [tgId, endpoint, JSON.stringify(categories)],
  );
}

export async function deletePushSub(endpoint: string): Promise<void> {
  await initDb();
  await getPool().query(`DELETE FROM notif_subs WHERE endpoint = $1`, [
    endpoint,
  ]);
}

/** All web-push (non-telegram) subs opted into a category. */
export async function getWebSubsForCategory(
  category: NotifCategory,
): Promise<NotifSub[]> {
  await initDb();
  const { rows } = await getPool().query<{
    endpoint: string;
    keys: PushKeys;
    categories: NotifCategory[];
  }>(
    `SELECT endpoint, keys, categories FROM notif_subs
      WHERE endpoint NOT LIKE 'telegram:%' AND categories ? $1`,
    [category],
  );
  return rows.map((r) => ({
    endpoint: r.endpoint,
    keys: r.keys,
    categories: r.categories ?? [],
  }));
}

/** All Telegram tg_ids opted into a category. */
export async function getTelegramSubsForCategory(
  category: NotifCategory,
): Promise<string[]> {
  await initDb();
  const { rows } = await getPool().query<{ tg_id: string }>(
    `SELECT tg_id FROM notif_subs
      WHERE endpoint LIKE 'telegram:%' AND categories ? $1 AND tg_id IS NOT NULL`,
    [category],
  );
  return rows.map((r) => String(r.tg_id));
}

/**
 * Every web-push (non-telegram) subscription, regardless of category. Used
 * for a pin broadcast, which reaches everyone with notifications enabled.
 */
export async function getAllWebSubs(): Promise<NotifSub[]> {
  await initDb();
  const { rows } = await getPool().query<{
    endpoint: string;
    keys: PushKeys;
    categories: NotifCategory[];
  }>(
    `SELECT endpoint, keys, categories FROM notif_subs
      WHERE endpoint NOT LIKE 'telegram:%'`,
  );
  return rows.map((r) => ({
    endpoint: r.endpoint,
    keys: r.keys,
    categories: r.categories ?? [],
  }));
}

/**
 * Every non-banned member's Telegram id (distinct). Used for a pin broadcast
 * so the whole group is reached, not just notif opt-ins.
 */
export async function getAllMemberTgIds(): Promise<string[]> {
  await initDb();
  const { rows } = await getPool().query<{ tg_id: string }>(
    `SELECT DISTINCT tg_id FROM chat_members
      WHERE is_banned = FALSE AND tg_id IS NOT NULL`,
  );
  return rows.map((r) => String(r.tg_id));
}

/** Current opt-in state for a member (web + telegram), for settings UI. */
export async function getMemberNotifState(
  tgId: string | number,
): Promise<{ web: NotifCategory[]; telegram: NotifCategory[] }> {
  await initDb();
  const { rows } = await getPool().query<{
    endpoint: string;
    categories: NotifCategory[];
  }>(
    `SELECT endpoint, categories FROM notif_subs WHERE tg_id = $1`,
    [tgId],
  );
  const web = new Set<NotifCategory>();
  let telegram: NotifCategory[] = [];
  for (const r of rows) {
    if (r.endpoint.startsWith("telegram:")) {
      telegram = sanitizeCategories(r.categories);
    } else {
      for (const c of sanitizeCategories(r.categories)) web.add(c);
    }
  }
  return { web: [...web], telegram };
}

/** Return true if the slug exists (so /i/<slug> knows whether to track). */
export async function inviteLinkExists(slug: string): Promise<boolean> {
  await initDb();
  const { rows } = await getPool().query(
    `SELECT 1 FROM invite_links WHERE slug = $1`,
    [slug],
  );
  return rows.length > 0;
}

/** Record a click on an invite link (increments counter + logs an event). */
export async function recordInviteClick(slug: string): Promise<void> {
  await initDb();
  const { rowCount } = await getPool().query(
    `UPDATE invite_links SET clicks = clicks + 1 WHERE slug = $1`,
    [slug],
  );
  if ((rowCount ?? 0) === 0) return; // unknown slug — don't log noise
  await getPool()
    .query(
      `INSERT INTO invite_events (slug, type, tg_id) VALUES ($1, 'click', NULL)`,
      [slug],
    )
    .catch(() => undefined);
}

/**
 * Attribute a join to an invite slug. De-duped: a given tg_id counts once
 * per slug, so re-signing-in with the same invite cookie won't inflate joins.
 */
export async function recordInviteJoin(
  slug: string,
  tgId: string | number,
): Promise<void> {
  await initDb();
  const exists = await getPool().query(
    `SELECT 1 FROM invite_events WHERE slug = $1 AND type = 'join' AND tg_id = $2`,
    [slug, tgId],
  );
  if (exists.rows.length > 0) return;
  const { rowCount } = await getPool().query(
    `UPDATE invite_links SET joins = joins + 1 WHERE slug = $1`,
    [slug],
  );
  if ((rowCount ?? 0) === 0) return;
  await getPool()
    .query(
      `INSERT INTO invite_events (slug, type, tg_id) VALUES ($1, 'join', $2)`,
      [slug, tgId],
    )
    .catch(() => undefined);
}

/* ------------------------------------------------------------------ */
/*  Polls                                                              */
/* ------------------------------------------------------------------ */

export interface PollOptionResult {
  text: string;
  votes: number;
  mine: boolean;
}

export interface PollData {
  id: string;
  question: string;
  options: PollOptionResult[];
  multiple: boolean;
  closed: boolean;
  /** Distinct members who voted (Telegram shows "N votes" as voters). */
  totalVoters: number;
}

export const POLL_QUESTION_MAX = 255;
export const POLL_OPTION_MAX = 100;
export const POLL_OPTIONS_MAX = 10;

interface PollRow {
  id: string;
  question: string;
  options: unknown;
  multiple: boolean;
  closed: boolean;
}

function pollOptionTexts(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((o) => (typeof o === "string" ? o : "")).filter(Boolean);
}

/**
 * Create a poll and its [poll:<id>] chat message atomically — if the message
 * insert fails the poll row is rolled back too, so no orphaned polls exist.
 * Moderation gates (ban/mute/blocklist/flood) run in the route BEFORE this.
 */
export async function createPollWithMessage(input: {
  tgId: string;
  authorName: string;
  question: string;
  options: string[];
  multiple: boolean;
  topic: ChatTopic;
  expiresAt?: Date | null;
}): Promise<ChatMessage | null> {
  await initDb();
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const { rows: pr } = await client.query<{ id: string }>(
      `INSERT INTO polls (creator_tg_id, question, options, multiple)
       VALUES ($1, $2, $3::jsonb, $4) RETURNING id`,
      [
        input.tgId,
        input.question,
        JSON.stringify(input.options),
        input.multiple,
      ],
    );
    const pollId = String(pr[0].id);
    const { rows } = await client.query<ChatMsgRow>(
      `INSERT INTO chat_messages (tg_id, author_name, body, expires_at, topic)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, tg_id, author_name, body, media_id, pinned, created_at, edited_at, expires_at, reply_to,
                 (SELECT photo_url FROM chat_members WHERE tg_id = $1) AS photo_url,
                 NULL AS reply_author, NULL AS reply_body`,
      [
        input.tgId,
        input.authorName,
        `[poll:${pollId}]`,
        input.expiresAt ?? null,
        input.topic,
      ],
    );
    await client.query("COMMIT");
    if (!rows[0]) return null;
    const [msg] = await attachReactions(rows, input.tgId);
    return msg ?? null;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

/** Batch-load poll results for the ids visible on screen (one round trip). */
export async function getPolls(
  ids: string[],
  viewerTid: string | null,
): Promise<Record<string, PollData>> {
  await initDb();
  const clean = [...new Set(ids.filter((id) => /^\d+$/.test(id)))].slice(0, 100);
  if (clean.length === 0) return {};
  const pool = getPool();
  const [pollsRes, votesRes, votersRes] = await Promise.all([
    pool.query<PollRow>(
      `SELECT id, question, options, multiple, closed
         FROM polls WHERE id = ANY($1::bigint[])`,
      [clean],
    ),
    pool.query<{ poll_id: string; option_idx: number; n: number; mine: boolean }>(
      `SELECT poll_id, option_idx, COUNT(*)::int AS n,
              bool_or(tg_id::text = $2) AS mine
         FROM poll_votes WHERE poll_id = ANY($1::bigint[])
        GROUP BY poll_id, option_idx`,
      [clean, viewerTid ?? ""],
    ),
    pool.query<{ poll_id: string; n: number }>(
      `SELECT poll_id, COUNT(DISTINCT tg_id)::int AS n
         FROM poll_votes WHERE poll_id = ANY($1::bigint[])
        GROUP BY poll_id`,
      [clean],
    ),
  ]);
  const votes = new Map<string, Map<number, { n: number; mine: boolean }>>();
  for (const v of votesRes.rows) {
    const key = String(v.poll_id);
    const m = votes.get(key) ?? new Map<number, { n: number; mine: boolean }>();
    m.set(Number(v.option_idx), { n: v.n, mine: Boolean(v.mine) });
    votes.set(key, m);
  }
  const voters = new Map<string, number>(
    votersRes.rows.map((r) => [String(r.poll_id), r.n]),
  );
  const out: Record<string, PollData> = {};
  for (const p of pollsRes.rows) {
    const id = String(p.id);
    const texts = pollOptionTexts(p.options);
    const pv = votes.get(id);
    out[id] = {
      id,
      question: p.question,
      options: texts.map((text, i) => ({
        text,
        votes: pv?.get(i)?.n ?? 0,
        mine: Boolean(pv?.get(i)?.mine),
      })),
      multiple: Boolean(p.multiple),
      closed: Boolean(p.closed),
      totalVoters: voters.get(id) ?? 0,
    };
  }
  return out;
}

/**
 * Replace the viewer's vote. Empty `optionIdxs` = retract. Runs DELETE+INSERT
 * in a transaction — the PK alone would let a single-choice poll accumulate
 * one row per option across separate requests.
 */
export async function votePoll(input: {
  pollId: string;
  tgId: string;
  optionIdxs: number[];
}): Promise<{ ok: true } | { ok: false; error: string }> {
  await initDb();
  const { rows } = await getPool().query<PollRow>(
    `SELECT id, question, options, multiple, closed FROM polls WHERE id = $1`,
    [input.pollId],
  );
  const poll = rows[0];
  if (!poll) return { ok: false, error: "Poll not found" };
  if (poll.closed) return { ok: false, error: "This poll is closed" };
  const optionCount = pollOptionTexts(poll.options).length;
  const idxs = [...new Set(input.optionIdxs.map((n) => Math.floor(n)))];
  if (idxs.some((i) => !Number.isFinite(i) || i < 0 || i >= optionCount)) {
    return { ok: false, error: "Invalid option" };
  }
  if (!poll.multiple && idxs.length > 1) {
    return { ok: false, error: "This poll allows one answer" };
  }
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `DELETE FROM poll_votes WHERE poll_id = $1 AND tg_id = $2`,
      [input.pollId, input.tgId],
    );
    for (const idx of idxs) {
      await client.query(
        `INSERT INTO poll_votes (poll_id, tg_id, option_idx) VALUES ($1, $2, $3)`,
        [input.pollId, input.tgId, idx],
      );
    }
    await client.query("COMMIT");
    return { ok: true };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw e;
  } finally {
    client.release();
  }
}

/** Close a poll (creator or admin) so no further votes are accepted. */
export async function closePoll(
  pollId: string,
  byTgId: string,
  isAdmin: boolean,
): Promise<boolean> {
  await initDb();
  const { rowCount } = await getPool().query(
    isAdmin
      ? `UPDATE polls SET closed = TRUE WHERE id = $1`
      : `UPDATE polls SET closed = TRUE WHERE id = $1 AND creator_tg_id = $2`,
    isAdmin ? [pollId] : [pollId, byTgId],
  );
  return (rowCount ?? 0) > 0;
}

/* ------------------------------------------------------------------ */
/*  Typing presence                                                    */
/* ------------------------------------------------------------------ */

/** Refresh the member's "typing" heartbeat for a topic (throttled client-side). */
export async function pingTyping(
  topic: ChatTopic,
  tgId: string,
  name: string,
): Promise<void> {
  await initDb();
  await getPool().query(
    `INSERT INTO typing_pings (topic, tg_id, name, at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (topic, tg_id)
     DO UPDATE SET at = NOW(), name = EXCLUDED.name`,
    [topic, tgId, name],
  );
}

/** Drop the member's typing heartbeat (called right after a send). */
export async function clearTyping(topic: ChatTopic, tgId: string): Promise<void> {
  await initDb();
  await getPool().query(
    `DELETE FROM typing_pings WHERE topic = $1 AND tg_id = $2`,
    [topic, tgId],
  );
}

/** Names currently typing in a topic (fresh within ~6s), excluding the viewer. */
export async function listTyping(
  topic: ChatTopic,
  excludeTgId: string | null,
): Promise<string[]> {
  await initDb();
  const { rows } = await getPool().query<{ name: string }>(
    `SELECT name FROM typing_pings
      WHERE topic = $1
        AND at > NOW() - INTERVAL '6 seconds'
        AND tg_id::text <> $2
      ORDER BY at DESC
      LIMIT 3`,
    [topic, excludeTgId ?? ""],
  );
  return rows.map((r) => r.name).filter(Boolean);
}
