import { NextResponse } from "next/server";
import { getOrder, getOrderByToken, setOrderTelegramChat } from "@/lib/delivery";
import { deliverOrder, publicBaseUrl } from "@/lib/deliver";
import { sendTelegram } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/telegram/webhook
 *
 * Telegram pushes bot updates here. A buyer who chose Telegram delivery taps a
 * deep link (t.me/<bot>?start=<token>) and presses Start; we capture their
 * chat id against the order and, if already paid, deliver instantly.
 *
 * Required env: TELEGRAM_BOT_TOKEN. Optional: TELEGRAM_WEBHOOK_SECRET.
 */
export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const update = (await req.json().catch(() => null)) as {
    message?: {
      text?: string;
      chat?: { id?: number | string };
      from?: { username?: string };
    };
  } | null;

  const msg = update?.message;
  const chatId = msg?.chat?.id;
  const text = msg?.text ?? "";
  if (!chatId) return NextResponse.json({ ok: true });

  const chat = String(chatId);
  const handle = msg?.from?.username ? `@${msg.from.username}` : null;

  if (text.startsWith("/start")) {
    const token = text.split(/\s+/)[1] ?? "";
    if (!token) {
      await sendTelegram(
        chat,
        "👋 Welcome! To receive a product, tap the <b>Receive on Telegram</b> button on your order page after checkout.",
      );
      return NextResponse.json({ ok: true });
    }

    const order = await getOrderByToken(token);
    if (!order) {
      await sendTelegram(
        chat,
        "We couldn't match that order. Please use the Telegram button on your order page.",
      );
      return NextResponse.json({ ok: true });
    }

    await setOrderTelegramChat(order.id, chat, handle);
    const fresh = await getOrder(order.id);

    if (fresh && (fresh.status === "paid" || fresh.status === "delivered")) {
      const baseUrl = publicBaseUrl(`https://${req.headers.get("host") ?? ""}`);
      const result = await deliverOrder(fresh, baseUrl);
      if (!result.delivered) {
        await sendTelegram(
          chat,
          "✅ Connected! We're preparing your delivery — it will arrive here shortly.",
        );
      }
    } else {
      await sendTelegram(
        chat,
        "✅ Connected! As soon as your payment is confirmed, your product will arrive right here automatically.",
      );
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
