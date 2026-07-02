/** Shared view types for the Telegram-replica community UI. */

export interface VouchView {
  id: string;
  authorName: string;
  body: string;
  mediaIds: string[];
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
   * topic list). Absent for Group Chat, which uses the # forum icon.
   */
  docId?: string;
  /** Index into the tg-bg-peer-N avatar palette. */
  peer: number;
}
