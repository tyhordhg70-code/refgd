import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";

/**
 * POST /api/client-error — tiny crash-report sink for EditorErrorBoundary.
 *
 * The "Inline editor hit a snag" fallback replaces the whole page subtree,
 * and inside webviews (Telegram Mini App, in-app browsers) there is no
 * devtools console to read the caught error from. The boundary fire-and-
 * forgets the error here so the crash (message + component stack + path)
 * is inspectable server-side afterwards.
 *
 * Deliberately dumb: capped field sizes, a hard 200-row rolling buffer
 * (this is a diagnostics buffer, not an archive), and a console.error
 * mirror so the report also lands in the host's log stream.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

let tableReady: Promise<unknown> | null = null;
function ensureTable(): Promise<unknown> {
  if (!tableReady) {
    tableReady = getPool()
      .query(
        `CREATE TABLE IF NOT EXISTS client_errors (
           id         BIGSERIAL PRIMARY KEY,
           message    TEXT NOT NULL DEFAULT '',
           stack      TEXT NOT NULL DEFAULT '',
           site       TEXT NOT NULL DEFAULT '',
           path       TEXT NOT NULL DEFAULT '',
           ua         TEXT NOT NULL DEFAULT '',
           created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
         );`,
      )
      .catch((e) => {
        // Allow a retry on the next report instead of caching the failure.
        tableReady = null;
        throw e;
      });
  }
  return tableReady;
}

function cut(v: unknown, max: number): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}

// Per-IP throttle: crash reports are rare by nature (the client caps itself
// at 3 per page load), so anything chattier is a flood — drop it before it
// reaches the pool. In-memory is fine per worker; the cap just needs to be
// rough, not exact.
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 10;
const rateHits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const hits = (rateHits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) {
    rateHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  rateHits.set(ip, hits);
  // Keep the map bounded under address churn.
  if (rateHits.size > 500) {
    for (const [k, v] of rateHits) {
      if (v.every((t) => now - t >= RATE_WINDOW_MS)) rateHits.delete(k);
    }
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (rateLimited(ip)) {
      return NextResponse.json({ ok: false }, { status: 429 });
    }
    const body = (await req.json().catch(() => null)) as Record<
      string,
      unknown
    > | null;
    const message = cut(body?.message, 500);
    if (!message) return NextResponse.json({ ok: false }, { status: 400 });
    const stack = cut(body?.stack, 2000);
    const site = cut(body?.site, 2000);
    const path = cut(body?.path, 300);
    const ua = req.headers.get("user-agent")?.slice(0, 300) ?? "";

    await ensureTable();
    const pool = getPool();
    await pool.query(
      `INSERT INTO client_errors (message, stack, site, path, ua)
       VALUES ($1, $2, $3, $4, $5)`,
      [message, stack, site, path, ua],
    );
    await pool.query(
      `DELETE FROM client_errors
       WHERE id NOT IN (SELECT id FROM client_errors ORDER BY id DESC LIMIT 200)`,
    );

    // Mirror into the host's log stream too.
    // eslint-disable-next-line no-console
    console.error("[client-error]", path, "—", message);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
