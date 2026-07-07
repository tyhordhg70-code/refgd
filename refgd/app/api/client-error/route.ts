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

export async function POST(req: Request) {
  try {
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
