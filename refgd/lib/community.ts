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
): Promise<string> {
  await initDb();
  const { rows } = await getPool().query<{ id: string }>(
    `INSERT INTO vouch_media (vouch_id, bytes, mime, sha256)
     VALUES ($1, $2, $3, $4) RETURNING id`,
    [vouchId, bytes, mime, sha256 ?? null],
  );
  return String(rows[0].id);
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
