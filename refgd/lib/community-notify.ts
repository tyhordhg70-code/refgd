/**
 * Community notification fan-out — web push (VAPID) + Telegram.
 *
 * Fails soft everywhere: a missing VAPID env var, an expired subscription, or
 * a Telegram hiccup must never throw into the caller (webhook / chat POST).
 * Web-push subscriptions that come back 404/410 (Gone) are pruned from
 * notif_subs so the table self-cleans.
 *
 * Runtime: nodejs only (imports the `web-push` npm package). Never import this
 * from middleware or edge code.
 */
import webpush from "web-push";
import {
  deletePushSub,
  getWebSubsForCategory,
  getTelegramSubsForCategory,
  getAllWebSubs,
  getAllMemberTgIds,
  type NotifCategory,
  type NotifSub,
} from "./community";
import { sendCommunityTelegram } from "./community-bot";

export interface NotifPayload {
  title: string;
  body: string;
  /** Path to open on click (defaults to /community). */
  url?: string;
}

let vapidReady: boolean | null = null;

/** Configure web-push once; returns false if VAPID env vars are absent. */
function ensureVapid(): boolean {
  if (vapidReady !== null) return vapidReady;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@refundgod.io";
  if (!pub || !priv) {
    vapidReady = false;
    return false;
  }
  try {
    webpush.setVapidDetails(subject, pub, priv);
    vapidReady = true;
  } catch {
    vapidReady = false;
  }
  return vapidReady;
}

async function pushOne(sub: NotifSub, payload: NotifPayload): Promise<void> {
  const keys = sub.keys as { p256dh?: string; auth?: string };
  if (!keys?.p256dh || !keys?.auth) return;
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: keys.p256dh, auth: keys.auth },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        url: payload.url || "/community",
      }),
    );
  } catch (e) {
    const status = (e as { statusCode?: number })?.statusCode;
    if (status === 404 || status === 410) {
      await deletePushSub(sub.endpoint).catch(() => undefined);
    }
    // other errors (rate limit, transient) — ignore; next event retries
  }
}

async function runPool<T>(
  items: T[],
  worker: (item: T) => Promise<void>,
  concurrency = 20,
): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(concurrency, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await worker(items[idx]);
    }
  });
  await Promise.all(workers);
}

/**
 * Fan a notification out to every subscriber opted into `category`, over both
 * web push and Telegram. Best-effort; resolves once all sends settle.
 */
export async function notifyCategory(
  category: NotifCategory,
  payload: NotifPayload,
): Promise<void> {
  // Web push
  if (ensureVapid()) {
    try {
      const subs = await getWebSubsForCategory(category);
      await runPool(subs, (s) => pushOne(s, payload));
    } catch {
      /* ignore */
    }
  }
  // Telegram
  try {
    const ids = await getTelegramSubsForCategory(category);
    const text = `<b>${escapeHtml(payload.title)}</b>\n${escapeHtml(payload.body)}`;
    await runPool(
      ids,
      async (id) => {
        await sendCommunityTelegram(id, text).catch(() => undefined);
      },
      10,
    );
  } catch {
    /* ignore */
  }
}

/**
 * Broadcast a notification to the whole community — every web-push subscriber
 * plus every non-banned member on Telegram, ignoring category opt-ins. Used
 * for pins, which are meant to reach everyone. Best-effort; never throws.
 */
export async function notifyAll(payload: NotifPayload): Promise<void> {
  // Web push
  if (ensureVapid()) {
    try {
      const subs = await getAllWebSubs();
      await runPool(subs, (s) => pushOne(s, payload));
    } catch {
      /* ignore */
    }
  }
  // Telegram
  try {
    const ids = await getAllMemberTgIds();
    const text = `<b>${escapeHtml(payload.title)}</b>\n${escapeHtml(payload.body)}`;
    await runPool(
      ids,
      async (id) => {
        await sendCommunityTelegram(id, text).catch(() => undefined);
      },
      10,
    );
  } catch {
    /* ignore */
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
