/**
   * PostgreSQL pool singleton.
   *
   * Reads connection string from NEON_DATABASE_URL (preferred), RENDER_DATABASE_URL
   * (legacy), or DATABASE_URL (fallback).
   *
   * Works with Neon, Render Postgres, Supabase, or any standard Postgres host.
   * Tables are created on first call to initDb() and then cached in memory.
   */
  import { Pool } from "pg";
  import {
    isDbInitialized,
    setDbInitialized,
    getDbInitPromise,
    setDbInitPromise,
  } from "./cache";

  declare global {
    var _pgPool: Pool | undefined;
  }

  function createPool(): Pool {
    const url =
      process.env.NEON_DATABASE_URL ??
      process.env.RENDER_DATABASE_URL ??
      process.env.DATABASE_URL;
    if (!url) {
      throw new Error(
        "No database URL found. Set NEON_DATABASE_URL, RENDER_DATABASE_URL, or DATABASE_URL."
      );
    }
    const cleanUrl = url.replace(/[?&]sslmode=[^&]*/g, (match) =>
      match.startsWith("?") ? "?" : "",
    ).replace(/\?&/, "?").replace(/\?$/, "");
    return new Pool({
      connectionString: cleanUrl,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30_000,
    });
  }

  export function getPool(): Pool {
    if (!global._pgPool) {
      global._pgPool = createPool();
    }
    return global._pgPool;
  }

  /** Create tables if they don't exist. Cached — only runs SQL once per process. */
  export function initDb(): Promise<void> {
    if (isDbInitialized()) return Promise.resolve();

    const inflight = getDbInitPromise();
    if (inflight) return inflight;

    const p = getPool()
      .query(`
        CREATE TABLE IF NOT EXISTS stores (
          id           TEXT PRIMARY KEY,
          name         TEXT NOT NULL,
          domain       TEXT,
          region       TEXT NOT NULL,
          category     TEXT NOT NULL DEFAULT 'Other',
          price_limit  TEXT,
          item_limit   TEXT,
          fee          TEXT,
          timeframe    TEXT,
          notes        TEXT,
          tags         TEXT NOT NULL DEFAULT '[]',
          prismatic_glow BOOLEAN NOT NULL DEFAULT FALSE,
          logo_url     TEXT,
          raw_text     TEXT,
          sort_order   INTEGER NOT NULL DEFAULT 0,
          created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS content_blocks (
          id         TEXT PRIMARY KEY,
          value      TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS shop_categories (
          slug             TEXT PRIMARY KEY,
          title            TEXT NOT NULL,
          tagline          TEXT,
          long_description TEXT,
          image            TEXT,
          accent           TEXT NOT NULL DEFAULT 'violet',
          rgb              TEXT NOT NULL DEFAULT '167,139,250',
          sort_order       INTEGER NOT NULL DEFAULT 0,
          created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS shop_products (
          id              TEXT PRIMARY KEY,
          title           TEXT NOT NULL,
          price           NUMERIC NOT NULL DEFAULT 0,
          currency        TEXT NOT NULL DEFAULT 'USD',
          image           TEXT,
          summary         TEXT,
          description     TEXT,
          charge_type     TEXT NOT NULL DEFAULT 'ONE_TIME',
          custom_fields   JSONB NOT NULL DEFAULT '[]',
          category_slugs  JSONB NOT NULL DEFAULT '[]',
          sort_order      INTEGER NOT NULL DEFAULT 0,
          created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS product_delivery (
          product_id    TEXT PRIMARY KEY,
          enabled       BOOLEAN NOT NULL DEFAULT FALSE,
          type          TEXT NOT NULL DEFAULT 'link',
          content       TEXT NOT NULL DEFAULT '',
          button_label  TEXT NOT NULL DEFAULT 'Access your product',
          message       TEXT NOT NULL DEFAULT '',
          delivery_time TEXT NOT NULL DEFAULT 'Instant',
          updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS orders (
          id               TEXT PRIMARY KEY,
          product_id       TEXT NOT NULL,
          product_title    TEXT NOT NULL DEFAULT '',
          price            NUMERIC NOT NULL DEFAULT 0,
          currency         TEXT NOT NULL DEFAULT 'USD',
          custom_fields    JSONB NOT NULL DEFAULT '{}',
          channel          TEXT NOT NULL DEFAULT 'email',
          email            TEXT,
          telegram_chat_id TEXT,
          telegram_handle  TEXT,
          delivery_token   TEXT NOT NULL,
          status           TEXT NOT NULL DEFAULT 'pending',
          payment_status   TEXT,
          invoice_id       TEXT,
          delivered_via    TEXT,
          delivered_at     TIMESTAMPTZ,
          created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS orders_token_idx ON orders (delivery_token);
        CREATE INDEX IF NOT EXISTS orders_created_idx ON orders (created_at DESC);

        -- ── Community / vouch / group-chat feature ───────────────────────────
        CREATE TABLE IF NOT EXISTS vouches (
          id             BIGSERIAL PRIMARY KEY,
          section        TEXT NOT NULL DEFAULT 'testimonials',
          author_name    TEXT NOT NULL DEFAULT 'Anonymous',
          body           TEXT NOT NULL DEFAULT '',
          origin_chat_id BIGINT,
          origin_msg_id  BIGINT,
          media_group_id TEXT,
          dedupe_hash    TEXT,
          origin_date    TIMESTAMPTZ,
          pinned         BOOLEAN NOT NULL DEFAULT FALSE,
          created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS vouches_origin_idx
          ON vouches (origin_chat_id, origin_msg_id)
          WHERE origin_msg_id IS NOT NULL;
        CREATE UNIQUE INDEX IF NOT EXISTS vouches_dedupe_idx
          ON vouches (dedupe_hash) WHERE dedupe_hash IS NOT NULL;
        CREATE INDEX IF NOT EXISTS vouches_section_idx
          ON vouches (section, created_at DESC);

        CREATE TABLE IF NOT EXISTS vouch_media (
          id         BIGSERIAL PRIMARY KEY,
          vouch_id   BIGINT NOT NULL,
          bytes      BYTEA NOT NULL,
          mime       TEXT NOT NULL DEFAULT 'image/jpeg',
          sha256     TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS vouch_media_vouch_idx ON vouch_media (vouch_id);

        CREATE TABLE IF NOT EXISTS chat_members (
          tg_id       BIGINT PRIMARY KEY,
          first_name  TEXT NOT NULL DEFAULT '',
          last_name   TEXT,
          photo_url   TEXT,
          is_admin    BOOLEAN NOT NULL DEFAULT FALSE,
          is_banned   BOOLEAN NOT NULL DEFAULT FALSE,
          muted_until TIMESTAMPTZ,
          warn_count  INTEGER NOT NULL DEFAULT 0,
          invite_slug TEXT,
          joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          last_seen   TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS chat_media (
          id         BIGSERIAL PRIMARY KEY,
          bytes      BYTEA NOT NULL,
          mime       TEXT NOT NULL DEFAULT 'image/jpeg',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- Custom (premium pack) emoji stickers cached from the Telegram Bot
        -- API by document id, so the composer's custom-emoji tab renders the
        -- real artwork without hitting Telegram per view.
        CREATE TABLE IF NOT EXISTS custom_emoji (
          id         TEXT PRIMARY KEY,
          bytes      BYTEA NOT NULL,
          mime       TEXT NOT NULL DEFAULT 'image/webp',
          fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        -- The full custom-emoji sets discovered by expanding the seed pack
        -- ids (lib/custom-emoji.ts) via getStickerSet. An admin triggers
        -- discovery once; the composer's Custom tab then offers every emoji in
        -- each pack, not just the handful captured from chat. Bytes are still
        -- served/cached through custom_emoji; this table is the id allowlist.
        CREATE TABLE IF NOT EXISTS community_emoji_pack (
          id         TEXT PRIMARY KEY,
          alt        TEXT NOT NULL DEFAULT '',
          set_name   TEXT NOT NULL DEFAULT '',
          title      TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS chat_messages (
          id          BIGSERIAL PRIMARY KEY,
          tg_id       BIGINT NOT NULL,
          author_name TEXT NOT NULL DEFAULT '',
          body        TEXT NOT NULL DEFAULT '',
          media_id    BIGINT,
          reply_to    BIGINT,
          pinned      BOOLEAN NOT NULL DEFAULT FALSE,
          deleted     BOOLEAN NOT NULL DEFAULT FALSE,
          expires_at  TIMESTAMPTZ,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS chat_messages_live_idx
          ON chat_messages (id DESC) WHERE deleted = FALSE;
        CREATE INDEX IF NOT EXISTS chat_messages_expiry_idx
          ON chat_messages (expires_at) WHERE expires_at IS NOT NULL;

        -- Members can post in every forum topic (Web A parity), so live
        -- messages carry the topic they were posted in. Existing rows are
        -- group-chat posts, hence the 'chat' default (idempotent migration).
        ALTER TABLE chat_messages
          ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT 'chat';
        CREATE INDEX IF NOT EXISTS chat_messages_topic_idx
          ON chat_messages (topic, id DESC) WHERE deleted = FALSE;

        -- Members can edit their own messages (admins any); edited_at records
        -- the last in-place edit so the bubble can show Web A's "edited" mark.
        -- NULL on every existing row (never edited); idempotent migration.
        ALTER TABLE chat_messages
          ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;

        CREATE TABLE IF NOT EXISTS message_reactions (
          message_id BIGINT NOT NULL,
          tg_id      BIGINT NOT NULL,
          emoji      TEXT NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (message_id, tg_id, emoji)
        );

        CREATE TABLE IF NOT EXISTS mod_config (
          key        TEXT PRIMARY KEY,
          value      JSONB NOT NULL DEFAULT '{}',
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS mod_filters (
          trigger    TEXT PRIMARY KEY,
          response   TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS mod_blocklist (
          pattern    TEXT PRIMARY KEY,
          action     TEXT NOT NULL DEFAULT 'delete',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS mod_warns (
          id         BIGSERIAL PRIMARY KEY,
          tg_id      BIGINT NOT NULL,
          by_tg_id   BIGINT,
          reason     TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS mod_warns_tg_idx ON mod_warns (tg_id);

        CREATE TABLE IF NOT EXISTS invite_links (
          slug       TEXT PRIMARY KEY,
          name       TEXT NOT NULL DEFAULT '',
          clicks     INTEGER NOT NULL DEFAULT 0,
          joins      INTEGER NOT NULL DEFAULT 0,
          created_by BIGINT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS invite_events (
          id         BIGSERIAL PRIMARY KEY,
          slug       TEXT NOT NULL,
          type       TEXT NOT NULL,
          tg_id      BIGINT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS invite_events_slug_idx ON invite_events (slug);

        CREATE TABLE IF NOT EXISTS notif_subs (
          id         BIGSERIAL PRIMARY KEY,
          tg_id      BIGINT,
          endpoint   TEXT,
          keys       JSONB,
          categories JSONB NOT NULL DEFAULT '{}',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE UNIQUE INDEX IF NOT EXISTS notif_subs_endpoint_idx
          ON notif_subs (endpoint) WHERE endpoint IS NOT NULL;

        CREATE TABLE IF NOT EXISTS recent_actions (
          id          BIGSERIAL PRIMARY KEY,
          actor_tg_id BIGINT,
          actor_name  TEXT,
          action      TEXT NOT NULL,
          target      TEXT,
          meta        JSONB NOT NULL DEFAULT '{}',
          created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS recent_actions_created_idx
          ON recent_actions (created_at DESC);
      `)
      .then(async () => {
        // v6.13.60 — One-time migration: clear known-bad saved admin-drag
        // positions on /evade-cancelations elements that were dragged out of
        // bounds in a prior session (tier-1 pricing image cut off, shield
        // image pushed offscreen). Idempotent via a marker row in
        // content_blocks so future intentional drags are preserved.
        try {
          const pool = getPool();
          const MARK = "_migration.reset_evade_positions_v2";
          const { rows } = await pool.query(
            "SELECT 1 FROM content_blocks WHERE id = $1",
            [MARK]
          );
          if (rows.length === 0) {
            const badKeys = [
              "evade.pricing.0.img.dx", "evade.pricing.0.img.dy",
              "evade.pricing.0.img.scale", "evade.pricing.0.img.mb",
              "evade.pricing.0.img.anim",
              "evade.pricing.1.img.dx", "evade.pricing.1.img.dy",
              "evade.pricing.1.img.scale", "evade.pricing.1.img.mb",
              "evade.pricing.1.img.anim",
              "evade.pricing.2.img.dx", "evade.pricing.2.img.dy",
              "evade.pricing.2.img.scale", "evade.pricing.2.img.mb",
              "evade.pricing.2.img.anim",
              "evade.divider.secShield.dx", "evade.divider.secShield.dy",
              "evade.divider.secShield.scale", "evade.divider.secShield.mb",
              "evade.divider.secShield.anim",
              "evade.art.solLocks.dx", "evade.art.solLocks.dy",
              "evade.art.solLocks.scale", "evade.art.solLocks.mb",
              "evade.art.solLocks.anim",
              "evade.ch1.eyebrow.dx", "evade.ch1.eyebrow.dy",
                // v2 originally also cleared "evade.divider.secShield"
                // (base src). That was wrong — the admin upload there was
                // intentional. Removed. Existing DBs already had v2 run
                // (the base64 src is gone there and must be re-uploaded
                // via admin edit mode); the marker stays v2 so the
                // migration won't run again.
              ];
            await pool.query(
              "DELETE FROM content_blocks WHERE id = ANY($1::text[])",
              [badKeys]
            );
            await pool.query(
              "INSERT INTO content_blocks (id, value, updated_at) " +
                "VALUES ($1, 'done', NOW()) " +
                "ON CONFLICT (id) DO NOTHING",
              [MARK]
            );
            // eslint-disable-next-line no-console
            console.log(
              "[db] migration reset_evade_positions_v1: cleared " +
                badKeys.length + " saved-position keys"
            );
          }
        } catch (err) {
          // eslint-disable-next-line no-console
          console.error("[db] migration reset_evade_positions_v1 failed:", err);
        }
        setDbInitialized();
      });

    setDbInitPromise(p);
    return p;
  }
  