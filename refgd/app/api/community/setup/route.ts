import { NextResponse } from "next/server";
import { readSession } from "@/lib/auth";
import { publicBaseUrl } from "@/lib/deliver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/community/setup  (site-admin only)
 *
 * Registers this app's /api/community/webhook as the community bot's webhook
 * and installs its slash-command hints. Run once after setting
 * COMMUNITY_BOT_TOKEN (and optional COMMUNITY_WEBHOOK_SECRET).
 */
export async function GET(req: Request) {
  const s = await readSession();
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const token = process.env.COMMUNITY_BOT_TOKEN;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: "COMMUNITY_BOT_TOKEN not set" },
      { status: 400 },
    );
  }

  const base = publicBaseUrl(`https://${req.headers.get("host") ?? ""}`);
  const webhookUrl = `${base}/api/community/webhook`;
  const body: Record<string, unknown> = {
    url: webhookUrl,
    allowed_updates: ["message"],
  };
  if (process.env.COMMUNITY_WEBHOOK_SECRET) {
    body.secret_token = process.env.COMMUNITY_WEBHOOK_SECRET;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const j = await res.json();

    // Best-effort: give every private chat a persistent "Community" menu
    // button that launches the Mini App (no BotFather step needed).
    await fetch(`https://api.telegram.org/bot${token}/setChatMenuButton`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        menu_button: {
          type: "web_app",
          text: "Community",
          web_app: { url: `${base}/community` },
        },
      }),
      cache: "no-store",
    }).catch(() => undefined);

    // Best-effort: register the ingestion command hints in the Telegram UI.
    await fetch(`https://api.telegram.org/bot${token}/setMyCommands`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commands: [
          { command: "testimonials", description: "Post forwards to Client Testimonials" },
          { command: "buy4u", description: "Post forwards to BUY4U Vouches" },
          { command: "announcements", description: "Post forwards to Announcements" },
          { command: "status", description: "Show active section and post counts" },
        ],
      }),
      cache: "no-store",
    }).catch(() => undefined);

    return NextResponse.json({ ok: res.ok, webhook: webhookUrl, telegram: j });
  } catch (e) {
    return NextResponse.json({ ok: false, error: String(e) }, { status: 502 });
  }
}
