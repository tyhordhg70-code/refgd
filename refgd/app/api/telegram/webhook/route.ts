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
 * 2. message.successful_payment — Stars payment confirmed. Split-payment
 *    orders are coordinated so delivery only fires once both parts are paid:
 *    - Part 1 order IDs contain "_xtr_"
 *    - Part 2 order IDs contain "_xtr2_"
 *    When Part 1 arrives we check whether Part 2 is also already paid before
 *    delivering. When Part 2 arrives we copy the buyer's chat to Part 1's
 *    record and deliver from Part 1 (the canonical order for delivery).
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

/** True when orderId looks like a split Part-2 order (contains "_xtr2_"). */
function isSplitPart2(orderId: string): boolean {
  return orderId.includes("_xtr2_");
}

/** Derive the Part-1 order ID from a Part-2 order ID. */
function part1IdFromPart2(part2Id: string): string {
  return part2Id.replace("_xtr2_", "_xtr_");
}

/** Derive the Part-2 order ID from a Part-1 order ID (may not exist). */
function part2IdFromPart1(part1Id: string): string {
  return part1Id.replace("_xtr_", "_xtr2_");
}

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

    // ── Split Part 2 ─────────────────────────────────────────────────────
    if (isSplitPart2(orderId)) {
      // Part 2 of a split payment just completed. Deliver via the Part-1
      // order (canonical record that holds the buyer's channel/email info).
      const part1Id = part1IdFromPart2(orderId);
      await setOrderTelegramChat(part1Id, chat, handle); // sync chat to Part 1

      const part1 = await getOrder(part1Id);
      if (part1) {
        if (part1.status === "paid" || part1.status === "delivered") {
          // Both parts paid — deliver now.
          const result = await deliverOrder(part1, baseUrl);
          if (!result.delivered) {
            await sendTelegram(
              chat,
              "✅ Both payments received! Your delivery is being prepared and will arrive here shortly.",
            );
          }
        } else {
          // Part 1 not yet confirmed — rare (Telegram processes sequentially
          // but network can be odd). Acknowledge and let Part-1's webhook
          // trigger delivery when it arrives.
          await sendTelegram(
            chat,
            "✅ Second payment received! Waiting for the first payment confirmation — your product will arrive here automatically once both are confirmed.",
          );
        }
      } else {
        // Part 1 record missing (shouldn't happen) — still acknowledge.
        await sendTelegram(
          chat,
          "✅ Second payment received! Your delivery is being prepared.",
        );
      }
      return NextResponse.json({ ok: true });
    }

    // ── Regular order OR Split Part 1 ────────────────────────────────────
    const order = await getOrder(orderId);
    if (!order) {
      await sendTelegram(chat, "✅ Payment received! Your delivery will arrive here shortly.");
      return NextResponse.json({ ok: true });
    }

    // Check if this is Part 1 of a split (a Part-2 sibling order exists).
    const potentialPart2Id = part2IdFromPart1(orderId);
    const part2 = await getOrder(potentialPart2Id);

    if (part2) {
      // This IS Part 1 of a split payment.
      if (part2.status === "paid" || part2.status === "delivered") {
        // Part 2 already paid — deliver now (both done).
        const result = await deliverOrder(order, baseUrl);
        if (!result.delivered) {
          await sendTelegram(
            chat,
            "✅ Both payments received! Your delivery is being prepared and will arrive here shortly.",
          );
        }
      } else {
        // Part 2 not yet paid — prompt the buyer to complete Step 2.
        await sendTelegram(
          chat,
          "✅ First payment received!\n\n" +
          "To complete your order please pay the second part (Step 2). " +
          "Open the checkout panel in your browser and tap <b>Open Payment 2 of 2</b>. " +
          "Your product will be delivered here automatically once both payments are confirmed. ⭐",
        );
      }
    } else {
      // Normal single-invoice order — deliver immediately.
      const result = await deliverOrder(order, baseUrl);
      if (!result.delivered) {
        await sendTelegram(
          chat,
          "✅ Payment received! Your delivery is being prepared and will arrive here shortly.",
        );
      }
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
