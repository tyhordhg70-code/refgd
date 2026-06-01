import { NextResponse } from "next/server";
import {
  getOrder,
  getOrderByToken,
  markOrderPaid,
  setOrderTelegramChat,
} from "@/lib/delivery";
import { deliverOrder, publicBaseUrl } from "@/lib/deliver";
import { sendTelegram } from "@/lib/notify";
import { partInfo, siblingIds, firstPartId } from "@/lib/stars-split";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/telegram/webhook
 *
 * Handles three Telegram update types:
 *
 * 1. pre_checkout_query — approve immediately (required within 10 s).
 *
 * 2. message.successful_payment — Stars payment confirmed.
 *    Split-payment coordination (no intermediate Telegram messages —
 *    the /invoice/[orderId] page shows status in real-time):
 *    - Part-1 IDs contain "_xtr_"; Part-2 IDs contain "_xtr2_".
 *    - Part 1 paid: marks it paid, checks if Part 2 is also paid.
 *      If yes → deliver. If no → wait silently (page polls for status).
 *    - Part 2 paid: syncs chat to Part-1 record, checks Part-1 status.
 *      If Part 1 already paid → deliver from Part-1 order. If not →
 *      wait silently.
 *
 * 3. message /start <token> — deep-link from access page; connect chat
 *    and deliver if already paid.
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

const isPaidStatus = (s?: string) => s === "paid" || s === "delivered";

export async function POST(req: Request) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-telegram-bot-api-secret-token") !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN ?? "";
  const update = (await req.json().catch(() => null)) as TgUpdate | null;
  if (!update) return NextResponse.json({ ok: true });

  const baseUrl = publicBaseUrl(`https://${req.headers.get("host") ?? ""}`);

  // ── 1. pre_checkout_query ─────────────────────────────────────────────
  if (update.pre_checkout_query) {
    await fetch(`https://api.telegram.org/bot${botToken}/answerPreCheckoutQuery`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pre_checkout_query_id: update.pre_checkout_query.id, ok: true }),
    });
    return NextResponse.json({ ok: true });
  }

  const msg = update.message;
  if (!msg) return NextResponse.json({ ok: true });

  const chatId = msg.chat?.id;
  if (!chatId) return NextResponse.json({ ok: true });

  const chat = String(chatId);
  const handle = msg.from?.username ? `@${msg.from.username}` : null;

  // ── 2. successful_payment ─────────────────────────────────────────────
  if (msg.successful_payment) {
    const { invoice_payload: orderId, telegram_payment_charge_id: chargeId } =
      msg.successful_payment;

    // Mark this part paid and capture the buyer's chat on it.
    await setOrderTelegramChat(orderId, chat, handle);
    await markOrderPaid(orderId, `xtr_${chargeId}`);

    const { total } = partInfo(orderId);

    // ── Single-invoice order — deliver immediately. ─────────────────────
    if (total <= 1) {
      const order = await getOrder(orderId);
      if (!order) return NextResponse.json({ ok: true });
      const result = await deliverOrder(order, baseUrl);
      if (!result.delivered) {
        await sendTelegram(
          chat,
          "✅ Payment received! Your delivery is being prepared and will arrive here shortly.",
        );
      }
      return NextResponse.json({ ok: true });
    }

    // ── Multi-part order ────────────────────────────────────────────────
    // Always mirror the chat onto Part 1, which carries the real delivery
    // token. Deliver only once EVERY part is paid.
    const part1Id = firstPartId(orderId);
    await setOrderTelegramChat(part1Id, chat, handle);

    const parts = await Promise.all(siblingIds(orderId).map((id) => getOrder(id)));
    const allPaid = parts.length > 0 && parts.every((o) => isPaidStatus(o?.status));
    if (allPaid) {
      const part1 = await getOrder(part1Id);
      if (part1) {
        const result = await deliverOrder(part1, baseUrl);
        if (!result.delivered && result.reason) {
          await sendTelegram(
            chat,
            `✅ All payments received! There was an issue sending your product automatically — please contact support with order ID: <code>${part1Id}</code>`,
          );
        }
      }
    }
    // Not all parts paid yet — the invoice page shows live step progress.
    return NextResponse.json({ ok: true });
  }

  // ── 3. /start [token]: connect delivery to this chat ─────────────────
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
