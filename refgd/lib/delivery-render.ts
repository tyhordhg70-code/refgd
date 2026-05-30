/**
 * Renders the buyer-facing delivery content (email HTML + telegram message).
 *
 * The delivery thanks the buyer and gives them a single prominent button that
 * goes to whatever the admin configured for the product (a custom link). When
 * the configured delivery is plain text (credentials etc.) the text is shown
 * inline instead of a button.
 */
import type { Order, ProductDelivery } from "./delivery";

const BRAND = "RefundGod";
const ACCENT = "#7c3aed"; // violet-600

export function isUrl(s: string): boolean {
  return /^https?:\/\/\S+$/i.test(s.trim());
}

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Build the delivery email (subject + responsive HTML with inline styles). */
export function buildDeliveryEmail(
  order: Order,
  config: ProductDelivery,
  accessUrl: string,
): { subject: string; html: string } {
  const subject = `Your ${order.productTitle} is ready ✓`;
  const linkMode = config.type === "link" && isUrl(config.content);
  const destination = linkMode ? config.content.trim() : accessUrl;
  const buttonLabel = config.buttonLabel || "Access your product";
  const note = config.message?.trim();

  const textBlock =
    !linkMode && config.content.trim()
      ? `<div style="margin:24px 0;padding:16px 18px;background:#0f1117;border:1px solid #262b39;border-radius:12px;color:#e5e7eb;font-family:'SFMono-Regular',Consolas,monospace;font-size:14px;line-height:1.6;white-space:pre-wrap;word-break:break-word;">${esc(config.content.trim())}</div>`
      : "";

  const html = `<!doctype html>
<html>
<body style="margin:0;padding:0;background:#0b0d12;">
  <div style="display:none;max-height:0;overflow:hidden;">Thank you for your purchase — your ${esc(order.productTitle)} is ready.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0b0d12;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#12141c;border:1px solid #232838;border-radius:20px;overflow:hidden;">
        <tr><td style="padding:28px 32px 0;text-align:center;">
          <div style="font-family:Arial,Helvetica,sans-serif;font-size:13px;letter-spacing:.22em;text-transform:uppercase;color:${ACCENT};font-weight:700;">${BRAND}</div>
        </td></tr>
        <tr><td style="padding:8px 32px 0;text-align:center;">
          <div style="font-size:40px;line-height:1;">✅</div>
          <h1 style="margin:14px 0 6px;font-family:Arial,Helvetica,sans-serif;font-size:24px;color:#ffffff;font-weight:800;">Thank you for your purchase</h1>
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;color:#aab2c5;">Your payment is confirmed and your product is ready below.</p>
        </td></tr>
        <tr><td style="padding:22px 32px 0;">
          <div style="padding:14px 16px;background:#0f1117;border:1px solid #232838;border-radius:12px;font-family:Arial,Helvetica,sans-serif;">
            <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#7b8398;">Product</div>
            <div style="margin-top:4px;font-size:16px;color:#ffffff;font-weight:700;">${esc(order.productTitle)}</div>
            <div style="margin-top:6px;font-size:13px;color:#8b93a7;">Order ${esc(order.id)} · $${order.price} ${esc(order.currency)}</div>
          </div>
        </td></tr>
        ${note ? `<tr><td style="padding:18px 32px 0;"><p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.65;color:#c7cedd;">${esc(note)}</p></td></tr>` : ""}
        ${textBlock ? `<tr><td style="padding:0 32px;">${textBlock}</td></tr>` : ""}
        ${
          linkMode
            ? `<tr><td style="padding:24px 32px 8px;text-align:center;">
                 <a href="${esc(destination)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;padding:15px 34px;border-radius:999px;">${esc(buttonLabel)} →</a>
               </td></tr>
               <tr><td style="padding:10px 32px 0;text-align:center;">
                 <a href="${esc(accessUrl)}" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#7b8398;">View your order page</a>
               </td></tr>`
            : `<tr><td style="padding:8px 32px 0;text-align:center;">
                 <a href="${esc(accessUrl)}" style="display:inline-block;background:${ACCENT};color:#ffffff;text-decoration:none;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;padding:13px 28px;border-radius:999px;">View your order page →</a>
               </td></tr>`
        }
        <tr><td style="padding:26px 32px 30px;text-align:center;">
          <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;line-height:1.6;color:#5f6678;">You received this email because a purchase was completed for this address at ${BRAND}. If this wasn't you, you can ignore it.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html };
}

/** Build the telegram delivery message (HTML text + optional inline button). */
export function buildTelegramDelivery(
  order: Order,
  config: ProductDelivery,
): { text: string; button?: { text: string; url: string } } {
  const linkMode = config.type === "link" && isUrl(config.content);
  const note = config.message?.trim();
  const lines = [
    `✅ <b>Thank you for your purchase!</b>`,
    ``,
    `Your payment is confirmed and <b>${esc(order.productTitle)}</b> is ready.`,
  ];
  if (note) {
    lines.push(``, esc(note));
  }
  if (!linkMode && config.content.trim()) {
    lines.push(``, `<pre>${esc(config.content.trim())}</pre>`);
  }
  lines.push(``, `<i>Order ${esc(order.id)}</i>`);
  const text = lines.join("\n");
  const button = linkMode
    ? { text: config.buttonLabel || "Access your product", url: config.content.trim() }
    : undefined;
  return { text, button };
}
