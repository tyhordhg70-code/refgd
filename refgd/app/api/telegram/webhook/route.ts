import { NextResponse } from "next/server";
import {
  getOrder,
  getOrderByToken,
  markOrderPaid,
  setOrderTelegramChat,
} from "@/lib/delivery";
import { deliverOrder, publicBaseUrl } from "@/lib/deliver";
import { sendTelegram } from "@/lib/notify";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/telegram/webhook
 *
 * Handles three Telegram update types:
 *
 * 1. pre_checkout_query — Telegram asks us to approve a Stars payment.
 *    Must be answered within 10 s. We always approve.
 *
 * 2. message.successful_payment — Stars payment confirmed. We connect the
 *    buyer's Telegram chat to the order, mark it paid, and auto-deliver.
 *
 * 3. message /start <token> — Buyer taps the deep-link from the access page
 *    to receive a copy of their delivery via Telegram.
 *
 * Required env: TELEGRAM_BOT_TOKEN. Optional: TELEGRAM_WEBHOOK_SECRET.
 */

type TgUpdate = {
  update_id?: number;
  message?: {
    text?: string;
    chat?: { id?: number | string };
    from?: { id?: number | string; username?: string };
    successful_payment?: {
      currency: string;
      total_amount: number;
      invoice_payload: string;
      telegram_payment_charge_id: string;
    };
  };
  pre_checkout_query?: {
    id: string;
    from: { id: number | string; username?: string };
    currency: string;
    total_amount: number;
    invoice_payload: string;
  };
};

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const update = (await req.json().catch(() => null)) as TgUpdate | null;
  if (!update) return NextResponse.json({ ok: true });

  const baseUrl = publicBaseUrl(`https://${req.headers.get("host") ?? ""}`);

  // ── 1. pre_checkout_query: approve immediately ───────────────────────────
  if (update.pre_checkout_query) {
    await fetch(`https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true,
      }),
    });
    return NextResponse.json({ ok: true });
  }

  const msg = update.message;
  if (!msg) return NextResponse.json({ ok: true });

  const chatId = msg.chat?.id;
  if (!chatId) return NextResponse.json({ ok: true });

  const chat = String(chatId);
  const handle = msg.from?.username ? `@${msg.from.username}` : null;

  // ── 2. successful_payment: Stars payment confirmed ───────────────────────
  if (msg.successful_payment) {
    const { invoice_payload: orderId, telegram_payment_charge_id: chargeId } =
      msg.successful_payment;

    await setOrderTelegramChat(orderId, chat, handle);
    await markOrderPaid(orderId, `xtr_${chargeId}`);

    const order = await getOrder(orderId);
    if (order) {
      const result = await deliverOrder(order, baseUrl);
      if (!result.delivered) {
        await sendTelegram(
          chat,
          "✅ Payment received! Your delivery is being prepared and will arrive here shortly.",
        );
      }
    } else {
      await sendTelegram(
        chat,
        "✅ Payment received! Your delivery will arrive here shortly.",
      );
    }
    return NextResponse.json({ ok: true });
  }

  // ── 3. /start [token]: connect delivery to this chat ────────────────────
  const text = msg.text ?? "";
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
  }

  return NextResponse.json({ ok: true });
}
