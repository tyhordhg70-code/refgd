/**
 * PostgreSQL pool singleton.
 *
 * Reads connection string from DATABASE_URL (preferred) or
 * RENDER_DATABASE_URL (legacy fallback) environment variable.
 *
 * Works with Neon, Render Postgres, Supabase, or any standard Postgres host.
 * Tables are created on first call to initDb() and then cached in memory —
 * subsequent calls are no-ops (no DB round-trip).
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
  // Priority: Neon → Render → any other Postgres (never Replit's internal DATABASE_URL first,
  // as Replit auto-injects DATABASE_URL pointing to its own internal database).
  const url =
    process.env.NEON_DATABASE_URL ??
    process.env.RENDER_DATABASE_URL ??
    process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "No database URL found. Set RENDER_DATABASE_URL (Render) or DATABASE_URL (Neon/other Postgres) as an environment variable."
    );
  }
  // Strip any sslmode= param from the URL — pg 8.16+ logs a security
  // warning that 'prefer'/'require'/'verify-ca' are now treated as
  // aliases for 'verify-full'. We control SSL via the explicit `ssl`
  // option below, so the URL-level mode is redundant noise.
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

/** Singleton pool — reused across hot-reloads in dev. */
export function getPool(): Pool {
  if (!global._pgPool) {
    global._pgPool = createPool();
  }
  return global._pgPool;
}

/** Create tables if they don't exist. Cached — only runs SQL once per process.
 *  Promise-locked so concurrent callers share the same in-flight query. */
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
    `)
    .then(() => setDbInitialized());

  setDbInitPromise(p);
  return p;
}
