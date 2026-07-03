import type { TopicKey } from "./types";

/**
 * Telegram Mini App deep links for the /community replica.
 *
 * This app is only ever opened inside the Telegram Mini App (never on the
 * web), so "Copy Link" / "Forward" must produce a link that re-opens the Mini
 * App at the right place — not a website URL.
 *
 * A `t.me/<bot>?startapp=<param>` link surfaces `<param>` to the launched Mini
 * App as `initDataUnsafe.start_param`. Telegram restricts that value to
 * `[A-Za-z0-9_-]` (max 512 chars). Topic keys are lowercase alphanumerics and
 * message ids are numeric BIGINT strings, so a message target encodes as
 * `m_<topic>_<id>` and a bare-section target as `t_<topic>`.
 */

const TOPIC_KEYS: readonly TopicKey[] = [
  "chat",
  "readme",
  "announcements",
  "buy4u",
  "testimonials",
];

function isTopicKey(v: string): v is TopicKey {
  return (TOPIC_KEYS as readonly string[]).includes(v);
}

/** Encode a startapp param for a topic, optionally targeting one message. */
export function buildStartParam(
  topic: string,
  messageId?: string | null,
): string {
  return messageId && /^\d+$/.test(messageId)
    ? `m_${topic}_${messageId}`
    : `t_${topic}`;
}

/** Full deep link that re-opens this Mini App at the encoded target. */
export function buildMiniAppLink(
  botUsername: string,
  startParam: string,
): string {
  return `https://t.me/${botUsername}?startapp=${startParam}`;
}

export interface DeepLinkTarget {
  topic: TopicKey;
  messageId: string | null;
}

/** Parse a launch startapp param back into a topic (+ optional message id). */
export function parseStartParam(
  param: string | null | undefined,
): DeepLinkTarget | null {
  if (!param) return null;
  const withMsg = /^m_([a-z0-9]+)_(\d+)$/.exec(param);
  if (withMsg && isTopicKey(withMsg[1])) {
    return { topic: withMsg[1], messageId: withMsg[2] };
  }
  const topicOnly = /^t_([a-z0-9]+)$/.exec(param);
  if (topicOnly && isTopicKey(topicOnly[1])) {
    return { topic: topicOnly[1], messageId: null };
  }
  return null;
}

/**
 * Read the launch `start_param` from the Telegram bridge. Cast locally because
 * the shared TelegramWebApp interface intentionally omits `initDataUnsafe`.
 */
export function readStartParam(): string | null {
  if (typeof window === "undefined") return null;
  const wa = (
    window as unknown as {
      Telegram?: { WebApp?: { initDataUnsafe?: { start_param?: string } } };
    }
  ).Telegram?.WebApp;
  return wa?.initDataUnsafe?.start_param ?? null;
}
