/**
 * PostgreSQL pool singleton.
 *
 * Connection string read from RENDER_DATABASE_URL (Replit secret).
 * In development the secret is injected automatically.
 * For self-hosting: set RENDER_DATABASE_URL in your host environment.
 *
 * Tables are created on first call to initDb().
 */
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  const url = process.env.RENDER_DATABASE_URL;
  if (!url) {
    throw new Error(
      "RENDER_DATABASE_URL is not set. Add it as a Replit secret or environment variable."
    );
  }
  return new Pool({
    connectionString: url,
    ssl: { rejectUnauthorized: false }, // required for Render external connections
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

/** Create tables if they don't exist. Call once at startup / in seed. */
export async function initDb(): Promise<void> {
  const pool = getPool();
  await pool.query(`
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
  `);
}
