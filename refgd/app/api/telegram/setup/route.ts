import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { publicBaseUrl } from "@/lib/deliver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/telegram/setup  (admin only)
 *
 * Registers this app's /api/telegram/webhook as the bot's webhook so buyers can
 * connect their chat and receive deliveries. Run once after setting
 * TELEGRAM_BOT_TOKEN (and optional TELEGRAM_WEBHOOK_SECRET).
 */
export async function GET(req: Request) {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    return NextResponse.json({ ok: false, error: "TELEGRAM_BOT_TOKEN not set" }, { status: 400 });
  }

  const base = publicBaseUrl(`https://${req.headers.get("host") ?? ""}`);
  const webhookUrl = `${base}/api/telegram/webhook`;
  const body: Record<string, unknown> = {
    url: webhookUrl,
    allowed_updates: ["message"],
  };
  if (process.env.TELEGRAM_WEBHOOK_SECRET) {
    body.secret_token = process.env.TELEGRAM_WEBHOOK_SECRET;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const j = await res.json();
    return NextResponse.json({ ok: res.ok, webhook: webhookUrl, telegram: j });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
