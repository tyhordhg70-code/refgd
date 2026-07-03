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
import { getPool, initDb } from "./db";
import { isCommunityAdmin } from "./community-bot";

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

export interface Vouch {
  id: string;
  section: VouchSection;
  authorName: string;
  body: string;
  mediaIds: string[];
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
            ) AS media_ids
       FROM vouches v
       LEFT JOIN vouch_media m ON m.vouch_id = v.id
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
  // when the identical image is already attached.
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO vouch_media (vouch_id, bytes, mime, sha256)
     SELECT $1, $2, $3, $4
      WHERE $4::text IS NULL
         OR NOT EXISTS (
           SELECT 1 FROM vouch_media WHERE vouch_id = $1 AND sha256 = $4
         )
     RETURNING id`,
    [vouchId, bytes, mime, sha256 ?? null],
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
}

/** Join / refresh a chat member (called when a signed-in member loads or posts). */
export async function upsertChatMember(m: ChatMemberInput): Promise<void> {
  await initDb();
  await getPool().query(
    `INSERT INTO chat_members (tg_id, first_name, photo_url, is_admin, invite_slug, last_seen)
     VALUES ($1, $2, $3, $4, $5, NOW())
     ON CONFLICT (tg_id) DO UPDATE
       SET first_name  = EXCLUDED.first_name,
           photo_url   = EXCLUDED.photo_url,
           is_admin    = EXCLUDED.is_admin,
           last_seen   = NOW(),
           invite_slug = COALESCE(chat_members.invite_slug, EXCLUDED.invite_slug)`,
    [m.tgId, m.name, m.photo, m.isAdmin, m.inviteSlug ?? null],
  );
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
  mutedUntil: string | null;
}

export async function getChatMemberModState(
  tgId: string,
): Promise<ChatMemberModState> {
  await initDb();
  const { rows } = await getPool().query<{
    is_banned: boolean;
    muted_until: string | null;
  }>(`SELECT is_banned, muted_until FROM chat_members WHERE tg_id = $1`, [tgId]);
  if (!rows[0]) return { exists: false, isBanned: false, mutedUntil: null };
  return {
    exists: true,
    isBanned: rows[0].is_banned,
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
  /** Attached photo (chat_media id), served via /api/community/chat-media/[id]. */
  mediaId: string | null;
  isAdmin: boolean;
  pinned: boolean;
  createdAt: string;
  /** ISO timestamp of the last in-place edit, or null if never edited. */
  editedAt: string | null;
  reactions: ChatReaction[];
  reply: ChatReplyRef | null;
}

interface ChatMsgRow {
  id: string;
  tg_id: string;
  author_name: string;
  body: string;
  media_id: string | null;
  pinned: boolean;
  created_at: string;
  edited_at: string | null;
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
    isAdmin: isCommunityAdmin(r.tg_id),
    pinned: r.pinned,
    createdAt: isoTs(r.created_at),
    editedAt: r.edited_at ? isoTs(r.edited_at) : null,
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
      WHERE message_id = ANY($1::bigint[])
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
 * Forum topics members can post in (Web A parity — the real group lets
 * members write in every topic). "readme" is intentionally absent: the
 * pinned READ ME topic stays read-only.
 */
export const CHAT_TOPICS = [
  "chat",
  "testimonials",
  "buy4u",
  "announcements",
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
      `SELECT m.id, m.tg_id, m.author_name, m.body, m.media_id, m.pinned, m.created_at,
              m.edited_at, cm.photo_url,
              m.reply_to, rm.author_name AS reply_author, rm.body AS reply_body
         FROM chat_messages m
         LEFT JOIN chat_members cm ON cm.tg_id = m.tg_id
         LEFT JOIN chat_messages rm ON rm.id = m.reply_to
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
      `SELECT m.id, m.tg_id, m.author_name, m.body, m.media_id, m.pinned, m.created_at,
              m.edited_at, cm.photo_url,
              m.reply_to, rm.author_name AS reply_author, rm.body AS reply_body
         FROM chat_messages m
         LEFT JOIN chat_members cm ON cm.tg_id = m.tg_id
         LEFT JOIN chat_messages rm ON rm.id = m.reply_to
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
 * Opportunistic hard-sweep of expired messages. Soft-deletes any message
 * whose expires_at has passed so the table doesn't accumulate ghosts. Runs on
 * the chat full-load path (never the short-poll); idempotent across instances
 * so no cross-worker lock is needed. listChatMessages already hides expired
 * rows, so this is cleanup, not correctness.
 */
export async function sweepExpiredMessages(): Promise<number> {
  await initDb();
  const { rowCount } = await getPool().query(
    `UPDATE chat_messages SET deleted = TRUE
      WHERE deleted = FALSE
        AND expires_at IS NOT NULL
        AND expires_at <= NOW()`,
  );
  return rowCount ?? 0;
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
     RETURNING id, tg_id, author_name, body, media_id, pinned, created_at, edited_at, reply_to,
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

/** Store an uploaded chat photo (BYTEA — Render has no persistent disk). */
export async function saveChatMedia(
  bytes: Buffer,
  mime: string,
): Promise<string> {
  await initDb();
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO chat_media (bytes, mime) VALUES ($1, $2) RETURNING id`,
    [bytes, mime],
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

/** Is this document id part of a discovered pack? (serving allowlist). */
export async function isPackEmoji(id: string): Promise<boolean> {
  await initDb();
  const { rows } = await getPool().query<{ one: number }>(
    `SELECT 1 AS one FROM community_emoji_pack WHERE id = $1`,
    [id],
  );
  return rows.length > 0;
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
): Promise<ChatReaction[]> {
  await initDb();
  const ins = await getPool().query(
    `INSERT INTO message_reactions (message_id, tg_id, emoji)
     VALUES ($1, $2, $3)
     ON CONFLICT (message_id, tg_id, emoji) DO NOTHING`,
    [messageId, tgId, emoji],
  );
  if (ins.rowCount === 0) {
    await getPool().query(
      `DELETE FROM message_reactions
        WHERE message_id = $1 AND tg_id = $2 AND emoji = $3`,
      [messageId, tgId, emoji],
    );
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
  return rows.map((r) => ({ emoji: r.emoji, count: r.n, mine: Boolean(r.mine) }));
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
): Promise<void> {
  await initDb();
  await ensureMemberStub(tgId);
  await getPool().query(`UPDATE chat_members SET is_banned = $2 WHERE tg_id = $1`, [
    tgId,
    banned,
  ]);
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
    photo_url: string | null;
    is_admin: boolean;
    is_banned: boolean;
    muted_until: string | null;
    warn_count: number;
    last_seen: string | null;
  }>(
    `SELECT tg_id, first_name, photo_url, is_admin, is_banned,
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

/** Owner + deleted flag for a message, used to authorize an in-place edit. */
export interface MessageEditInfo {
  tgId: string;
  deleted: boolean;
}

export async function getMessageEditInfo(
  id: string,
): Promise<MessageEditInfo | null> {
  await initDb();
  const { rows } = await getPool().query<{ tg_id: string; deleted: boolean }>(
    `SELECT tg_id, deleted FROM chat_messages WHERE id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  return { tgId: String(rows[0].tg_id), deleted: Boolean(rows[0].deleted) };
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
