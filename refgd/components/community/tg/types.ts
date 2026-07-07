/** Shared view types for the Telegram-replica community UI. */

export interface VouchView {
  id: string;
  authorName: string;
  body: string;
  mediaIds: string[];
  /** Intrinsic pixel size per media id (same order); null/absent = unknown. */
  mediaDims?: ({ w: number; h: number } | null)[];
  pinned: boolean;
  createdAt: string;
  originDate: string | null;
}

export type TopicKey =
  | "readme"
  | "announcements"
  | "buy4u"
  | "testimonials"
  | "chat";

export interface TopicDef {
  key: TopicKey;
  title: string;
  emoji: string;
  /**
   * Telegram custom-emoji document id of the topic icon (from the saved
   * topic list).
   */
  docId?: string;
  /**
   * Render the icon's REAL animated pack artwork (Lottie/.webm via the emoji
   * API) instead of the instant self-hosted static webp still. Used for
   * icons whose artwork only reads right in motion (e.g. the Duck-pack ✈️
   * still is a plain plane — the duck riding it exists only in the
   * animation).
   */
  animated?: boolean;
  /** Index into the tg-bg-peer-N avatar palette. */
  peer: number;
}
