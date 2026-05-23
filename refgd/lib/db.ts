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
      `)
      .then(() => setDbInitialized());

    setDbInitPromise(p);
    return p;
  }
  