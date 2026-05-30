/**
 * Delivery orchestration — the single entry point that actually sends a paid
 * order to the buyer over their chosen channel. Idempotent: a delivered order
 * is never delivered twice.
 *
 * Called from:
 *  - the NOWPayments IPN webhook once payment is confirmed
 *  - the telegram webhook when a buyer connects their chat (for telegram orders)
 *  - the admin "deliver now" action
 */
import { getProductDelivery, markOrderDelivered, type Order } from "./delivery";
import { buildDeliveryEmail, buildTelegramDelivery } from "./delivery-render";
import { sendEmail, sendTelegram } from "./notify";

export type DeliverResult = {
  delivered: boolean;
  via?: string;
  reason?: string;
};

export function publicBaseUrl(origin?: string | null): string {
  if (origin && /^https?:\/\//.test(origin)) return origin.replace(/\/$/, "");
  const env =
    process.env.PUBLIC_BASE_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    "https://refgd.onrender.com";
  return env.replace(/\/$/, "");
}

export function accessUrlFor(order: Order, baseUrl: string): string {
  return `${baseUrl}/access/${order.deliveryToken}`;
}

/**
 * Deliver a paid order. Safe to call repeatedly — returns early if already
 * delivered. Returns a reason (not delivered) when delivery can't proceed yet
 * (e.g. a telegram buyer who hasn't connected their chat).
 */
export async function deliverOrder(
  order: Order,
  baseUrl: string,
  opts?: { force?: boolean },
): Promise<DeliverResult> {
  if (!opts?.force && order.status === "delivered") {
    return { delivered: true, via: order.deliveredVia ?? "already" };
  }

  const config = await getProductDelivery(order.productId);
  if (!config || !config.enabled || !config.content.trim()) {
    return { delivered: false, reason: "no delivery configured for this product" };
  }

  const accessUrl = accessUrlFor(order, baseUrl);

  if (order.channel === "email") {
    if (!order.email) return { delivered: false, reason: "no email on order" };
    const { subject, html } = buildDeliveryEmail(order, config, accessUrl);
    const r = await sendEmail({ to: order.email, subject, html });
    if (!r.ok) return { delivered: false, reason: r.error };
    await markOrderDelivered(order.id, "email");
    return { delivered: true, via: "email" };
  }

  // telegram
  if (!order.telegramChatId) {
    return { delivered: false, reason: "buyer has not connected telegram yet" };
  }
  const { text, button } = buildTelegramDelivery(order, config);
  const r = await sendTelegram(order.telegramChatId, text, button);
  if (!r.ok) return { delivered: false, reason: r.error };
  await markOrderDelivered(order.id, "telegram");
  return { delivered: true, via: "telegram" };
}
