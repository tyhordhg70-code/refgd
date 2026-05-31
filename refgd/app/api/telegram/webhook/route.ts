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

function isSplitPart2(id: string) { return id.includes("_xtr2_"); }
function part1IdFromPart2(id: string) { return id.replace("_xtr2_", "_xtr_"); }
function part2IdFromPart1(id: string) { return id.replace("_xtr_", "_xtr2_"); }

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

    await setOrderTelegramChat(orderId, chat, handle);
    await markOrderPaid(orderId, `xtr_${chargeId}`);

    if (isSplitPart2(orderId)) {
      // ── Part 2 of a split payment ──────────────────────────────────────
      const part1Id = part1IdFromPart2(orderId);
      // Sync the buyer's chat to Part-1 so delivery goes to the right place.
      await setOrderTelegramChat(part1Id, chat, handle);

      const part1 = await getOrder(part1Id);
      if (part1 && (part1.status === "paid" || part1.status === "delivered")) {
        // Both paid — deliver now. The invoice page will see the status
        // update via polling and redirect automatically.
        const result = await deliverOrder(part1, baseUrl);
        if (!result.delivered && result.reason) {
          // Only send a Telegram message when there's a genuine problem
          // (e.g. delivery not configured), not for normal split flow.
          await sendTelegram(
            chat,
            `✅ Both payments received! There was an issue sending your product automatically — please contact support with order ID: <code>${part1Id}</code>`,
          );
        }
      }
      // Part 1 not yet confirmed — invoice page will catch up when Part 1
      // fires. No Telegram message needed; the page shows live status.
      return NextResponse.json({ ok: true });
    }

    // ── Regular order OR Part 1 of a split ──────────────────────────────
    const order = await getOrder(orderId);
    if (!order) return NextResponse.json({ ok: true });

    // Check for a Part-2 sibling.
    const part2 = await getOrder(part2IdFromPart1(orderId));

    if (part2) {
      // This is Part 1 of a split.
      if (part2.status === "paid" || part2.status === "delivered") {
        // Both done — deliver. Page polls and auto-redirects.
        const result = await deliverOrder(order, baseUrl);
        if (!result.delivered && result.reason) {
          await sendTelegram(
            chat,
            `✅ Both payments received! There was an issue with auto-delivery — please contact support with order ID: <code>${orderId}</code>`,
          );
        }
      }
      // Part 2 not yet paid — page shows "awaiting Part 2" state.
      // No Telegram message; the invoice page handles the UX.
      return NextResponse.json({ ok: true });
    }

    // Normal single-invoice order — deliver immediately.
    const result = await deliverOrder(order, baseUrl);
    if (!result.delivered) {
      await sendTelegram(
        chat,
        "✅ Payment received! Your delivery is being prepared and will arrive here shortly.",
      );
    }
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
