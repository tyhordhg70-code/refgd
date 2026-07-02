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

function mapVouch(r: VouchRow): Vouch {
  return {
    id: String(r.id),
    section: isVouchSection(r.section) ? r.section : "testimonials",
    authorName: r.author_name,
    body: r.body,
    mediaIds: (r.media_ids ?? []).map((x) => String(x)),
    pinned: r.pinned,
    createdAt: r.created_at,
    originDate: r.origin_date,
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
  isAdmin: boolean;
  pinned: boolean;
  createdAt: string;
  reactions: ChatReaction[];
  reply: ChatReplyRef | null;
}

interface ChatMsgRow {
  id: string;
  tg_id: string;
  author_name: string;
  body: string;
  pinned: boolean;
  created_at: string;
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
    isAdmin: isCommunityAdmin(r.tg_id),
    pinned: r.pinned,
    createdAt: r.created_at,
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

export interface ListChatOptions {
  afterId?: string | null;
  limit?: number;
  viewerTid?: string | null;
}

/** Chat messages in chronological (ASC) order. With afterId → only newer. */
export async function listChatMessages(
  opts: ListChatOptions = {},
): Promise<ChatMessage[]> {
  await initDb();
  const limit = Math.min(Math.max(opts.limit ?? 60, 1), 200);
  const viewer = opts.viewerTid ?? null;
  let rows: ChatMsgRow[];
  if (opts.afterId && /^\d+$/.test(opts.afterId)) {
    const res = await getPool().query<ChatMsgRow>(
      `SELECT m.id, m.tg_id, m.author_name, m.body, m.pinned, m.created_at,
              cm.photo_url,
              m.reply_to, rm.author_name AS reply_author, rm.body AS reply_body
         FROM chat_messages m
         LEFT JOIN chat_members cm ON cm.tg_id = m.tg_id
         LEFT JOIN chat_messages rm ON rm.id = m.reply_to
        WHERE m.deleted = FALSE
          AND (m.expires_at IS NULL OR m.expires_at > NOW())
          AND m.id > $1
        ORDER BY m.id ASC
        LIMIT $2`,
      [opts.afterId, limit],
    );
    rows = res.rows;
  } else {
    const res = await getPool().query<ChatMsgRow>(
      `SELECT m.id, m.tg_id, m.author_name, m.body, m.pinned, m.created_at,
              cm.photo_url,
              m.reply_to, rm.author_name AS reply_author, rm.body AS reply_body
         FROM chat_messages m
         LEFT JOIN chat_members cm ON cm.tg_id = m.tg_id
         LEFT JOIN chat_messages rm ON rm.id = m.reply_to
        WHERE m.deleted = FALSE
          AND (m.expires_at IS NULL OR m.expires_at > NOW())
        ORDER BY m.id DESC
        LIMIT $1`,
      [limit],
    );
    rows = res.rows.reverse();
  }
  return attachReactions(rows, viewer);
}

export interface CreateChatMessageInput {
  tgId: string;
  authorName: string;
  body: string;
  expiresAt?: Date | string | null;
  replyTo?: string | null;
}

export async function createChatMessage(
  input: CreateChatMessageInput,
): Promise<ChatMessage | null> {
  await initDb();
  const replyTo =
    input.replyTo && /^\d+$/.test(input.replyTo) ? input.replyTo : null;
  const { rows } = await getPool().query<ChatMsgRow>(
    `INSERT INTO chat_messages (tg_id, author_name, body, expires_at, reply_to)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, tg_id, author_name, body, pinned, created_at, reply_to,
               (SELECT photo_url FROM chat_members WHERE tg_id = $1) AS photo_url,
               (SELECT author_name FROM chat_messages r WHERE r.id = $5) AS reply_author,
               (SELECT body FROM chat_messages r WHERE r.id = $5) AS reply_body`,
    [input.tgId, input.authorName, input.body, input.expiresAt ?? null, replyTo],
  );
  if (!rows[0]) return null;
  const [msg] = await attachReactions(rows, input.tgId);
  return msg ?? null;
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
  const res = await getPool().query(
    `UPDATE chat_messages SET pinned = $2 WHERE id = $1 AND deleted = FALSE`,
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
