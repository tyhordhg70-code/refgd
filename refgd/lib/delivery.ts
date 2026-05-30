/**
 * Auto-delivery data layer.
 *
 * Two tables (created in lib/db.ts initDb):
 *  - product_delivery: per-product delivery configuration (Billgang "Managed"
 *    style). type 'link' delivers a custom URL the buyer receives after paying.
 *  - orders: one row per checkout. Created 'pending' at checkout, flipped to
 *    'paid' by the NOWPayments IPN webhook, then 'delivered' once the product
 *    has been sent via the buyer's chosen channel (email / telegram).
 *
 * This module is server-only (it touches pg). Client components may import the
 * exported *types* only (type-only imports are erased at build time).
 */
import crypto from "node:crypto";
import { getPool, initDb } from "./db";

export type DeliveryType = "link" | "text";

export type ProductDelivery = {
  productId: string;
  enabled: boolean;
  /** 'link' = deliver a clickable URL; 'text' = deliver plain text/credentials. */
  type: DeliveryType;
  /** The URL (type 'link') or text (type 'text') the buyer receives. */
  content: string;
  /** Label shown on the access button, e.g. "Access your product". */
  buttonLabel: string;
  /** Optional custom thank-you note shown in the delivery. */
  message: string;
  /** Free-form delivery-time label shown on the access page, e.g. "Instant". */
  deliveryTime: string;
  updatedAt?: string;
};

export type OrderChannel = "email" | "telegram";
export type OrderStatus = "pending" | "paid" | "delivered" | "failed";

export type Order = {
  id: string;
  productId: string;
  productTitle: string;
  price: number;
  currency: string;
  customFields: Record<string, string>;
  channel: OrderChannel;
  email: string | null;
  telegramChatId: string | null;
  telegramHandle: string | null;
  deliveryToken: string;
  status: OrderStatus;
  paymentStatus: string | null;
  invoiceId: string | null;
  deliveredAt: string | null;
  deliveredVia: string | null;
  createdAt: string;
  updatedAt: string;
};

/** URL-safe random token used for the access page + telegram deep link. */
export function newDeliveryToken(): string {
  return crypto.randomBytes(20).toString("hex");
}

// ─── Product delivery config ────────────────────────────────────────────────

function rowToDelivery(row: Record<string, unknown>): ProductDelivery {
  return {
    productId: String(row.product_id),
    enabled: Boolean(row.enabled),
    type: ((row.type as string) === "text" ? "text" : "link"),
    content: (row.content as string | null) ?? "",
    buttonLabel: (row.button_label as string | null) || "Access your product",
    message: (row.message as string | null) ?? "",
    deliveryTime: (row.delivery_time as string | null) || "Instant",
    updatedAt: row.updated_at ? new Date(row.updated_at as string).toISOString() : undefined,
  };
}

export async function getProductDelivery(productId: string): Promise<ProductDelivery | null> {
  await initDb();
  const { rows } = await getPool().query(
    "SELECT * FROM product_delivery WHERE product_id = $1",
    [productId],
  );
  return rows[0] ? rowToDelivery(rows[0]) : null;
}

export async function listProductDeliveries(): Promise<Record<string, ProductDelivery>> {
  await initDb();
  const { rows } = await getPool().query("SELECT * FROM product_delivery");
  const out: Record<string, ProductDelivery> = {};
  for (const r of rows) {
    const d = rowToDelivery(r);
    out[d.productId] = d;
  }
  return out;
}

export async function upsertProductDelivery(d: ProductDelivery): Promise<void> {
  await initDb();
  await getPool().query(
    `INSERT INTO product_delivery
       (product_id, enabled, type, content, button_label, message, delivery_time, updated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7, NOW())
     ON CONFLICT (product_id) DO UPDATE SET
       enabled       = EXCLUDED.enabled,
       type          = EXCLUDED.type,
       content       = EXCLUDED.content,
       button_label  = EXCLUDED.button_label,
       message       = EXCLUDED.message,
       delivery_time = EXCLUDED.delivery_time,
       updated_at    = NOW()`,
    [
      d.productId,
      d.enabled,
      d.type,
      d.content.slice(0, 4000),
      (d.buttonLabel || "Access your product").slice(0, 80),
      d.message.slice(0, 2000),
      (d.deliveryTime || "Instant").slice(0, 80),
    ],
  );
}

// ─── Orders ─────────────────────────────────────────────────────────────────

function rowToOrder(row: Record<string, unknown>): Order {
  const cf = row.custom_fields;
  return {
    id: String(row.id),
    productId: String(row.product_id),
    productTitle: (row.product_title as string | null) ?? "",
    price: Number(row.price ?? 0),
    currency: (row.currency as string | null) ?? "USD",
    customFields:
      cf && typeof cf === "object" && !Array.isArray(cf)
        ? (cf as Record<string, string>)
        : typeof cf === "string"
          ? JSON.parse(cf)
          : {},
    channel: ((row.channel as string) === "telegram" ? "telegram" : "email"),
    email: (row.email as string | null) ?? null,
    telegramChatId: (row.telegram_chat_id as string | null) ?? null,
    telegramHandle: (row.telegram_handle as string | null) ?? null,
    deliveryToken: String(row.delivery_token),
    status: (row.status as OrderStatus) ?? "pending",
    paymentStatus: (row.payment_status as string | null) ?? null,
    invoiceId: (row.invoice_id as string | null) ?? null,
    deliveredAt: row.delivered_at ? new Date(row.delivered_at as string).toISOString() : null,
    deliveredVia: (row.delivered_via as string | null) ?? null,
    createdAt: row.created_at ? new Date(row.created_at as string).toISOString() : "",
    updatedAt: row.updated_at ? new Date(row.updated_at as string).toISOString() : "",
  };
}

export type NewOrder = {
  id: string;
  productId: string;
  productTitle: string;
  price: number;
  currency: string;
  customFields: Record<string, string>;
  channel: OrderChannel;
  email: string | null;
  telegramHandle: string | null;
  deliveryToken: string;
  invoiceId: string | null;
};

export async function createOrder(o: NewOrder): Promise<void> {
  await initDb();
  await getPool().query(
    `INSERT INTO orders
       (id, product_id, product_title, price, currency, custom_fields,
        channel, email, telegram_handle, delivery_token, invoice_id, status)
     VALUES ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,'pending')
     ON CONFLICT (id) DO NOTHING`,
    [
      o.id,
      o.productId,
      o.productTitle,
      o.price,
      o.currency,
      JSON.stringify(o.customFields ?? {}),
      o.channel,
      o.email,
      o.telegramHandle,
      o.deliveryToken,
      o.invoiceId,
    ],
  );
}

export async function getOrder(id: string): Promise<Order | null> {
  await initDb();
  const { rows } = await getPool().query("SELECT * FROM orders WHERE id = $1", [id]);
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function getOrderByToken(token: string): Promise<Order | null> {
  await initDb();
  const { rows } = await getPool().query(
    "SELECT * FROM orders WHERE delivery_token = $1",
    [token],
  );
  return rows[0] ? rowToOrder(rows[0]) : null;
}

export async function listOrders(limit = 100): Promise<Order[]> {
  await initDb();
  const { rows } = await getPool().query(
    "SELECT * FROM orders ORDER BY created_at DESC LIMIT $1",
    [Math.min(Math.max(limit, 1), 500)],
  );
  return rows.map(rowToOrder);
}

/** Mark the order paid (idempotent). Never downgrades a delivered order. */
export async function markOrderPaid(id: string, paymentStatus: string): Promise<void> {
  await initDb();
  await getPool().query(
    `UPDATE orders
       SET status = CASE WHEN status = 'delivered' THEN 'delivered' ELSE 'paid' END,
           payment_status = $2,
           updated_at = NOW()
     WHERE id = $1`,
    [id, paymentStatus],
  );
}

export async function markOrderDelivered(id: string, via: string): Promise<void> {
  await initDb();
  await getPool().query(
    `UPDATE orders
       SET status = 'delivered', delivered_via = $2, delivered_at = NOW(), updated_at = NOW()
     WHERE id = $1`,
    [id, via],
  );
}

export async function setOrderTelegramChat(
  id: string,
  chatId: string,
  handle: string | null,
): Promise<void> {
  await initDb();
  await getPool().query(
    `UPDATE orders SET telegram_chat_id = $2, telegram_handle = COALESCE($3, telegram_handle), updated_at = NOW() WHERE id = $1`,
    [id, chatId, handle],
  );
}
