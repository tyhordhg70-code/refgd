/**
 * Outbound notification senders — fully server-side, no third-party SDKs.
 *
 *  - Email via Resend HTTP API (RESEND_API_KEY). From address defaults to the
 *    Resend sandbox sender; set RESEND_FROM to your verified domain sender.
 *  - Telegram via the Bot HTTP API (TELEGRAM_BOT_TOKEN).
 *
 * Every function fails soft: it returns { ok, error } instead of throwing, so a
 * missing key never crashes the payment webhook.
 */

type SendResult = { ok: boolean; error?: string };

export async function sendEmail(args: {
  to: string;
  subject: string;
  html: string;
}): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, error: "RESEND_API_KEY not set" };
  const from = process.env.RESEND_FROM || "RefundGod <onboarding@resend.dev>";
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [args.to], subject: args.subject, html: args.html }),
      cache: "no-store",
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `Resend ${res.status}: ${t.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Resend request failed: ${String(e)}` };
  }
}

export async function sendTelegram(
  chatId: string,
  text: string,
  button?: { text: string; url: string },
): Promise<SendResult> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return { ok: false, error: "TELEGRAM_BOT_TOKEN not set" };
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
  };
  if (button) {
    body.reply_markup = { inline_keyboard: [[{ text: button.text, url: button.url }]] };
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, error: `Telegram ${res.status}: ${t.slice(0, 300)}` };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, error: `Telegram request failed: ${String(e)}` };
  }
}

declare global {
  var _tgBotUsername: string | undefined;
}

/** Resolve the bot's @username (for t.me deep links). Cached per process. */
export async function getBotUsername(): Promise<string | null> {
  if (process.env.TELEGRAM_BOT_USERNAME) {
    return process.env.TELEGRAM_BOT_USERNAME.replace(/^@/, "");
  }
  if (global._tgBotUsername) return global._tgBotUsername;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getMe`, {
      cache: "no-store",
    });
    const j = (await res.json()) as { ok?: boolean; result?: { username?: string } };
    if (j.ok && j.result?.username) {
      global._tgBotUsername = j.result.username;
      return j.result.username;
    }
  } catch {
    /* ignore */
  }
  return null;
}
