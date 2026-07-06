import "./tg-webapp.css";
import "./telegram.css";
import {
  countChatMembers,
  getModConfig,
  listChatMessages,
  listVouches,
} from "@/lib/community";
import { getContentBlock } from "@/lib/content";
import TelegramApp, {
  type ChatPreview,
} from "@/components/community/tg/TelegramApp";

/* DB-backed, never statically cached — the bot ingests posts continuously. */
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Community — RefundGod",
  description:
    "Client testimonials, BUY4U vouches and announcements from the RefundGod community.",
};

export default async function CommunityPage() {
  const [
    testimonials,
    buy4u,
    announcements,
    welcome,
    hideMembers,
    seedReadme,
    seedAnnouncement,
    seedChatNotice,
    ...seedFlags
  ] = await Promise.all([
    listVouches("testimonials"),
    listVouches("buy4u"),
    listVouches("announcements"),
    getModConfig<string>("welcome", ""),
    getModConfig<boolean>("chat_hide_members", false),
    getContentBlock("community_seed:readme"),
    getContentBlock("community_seed:announcement"),
    getContentBlock("community_seed:chat-notice"),
    /* Admin pin/delete state for the constant seed bubbles ("1" = set). */
    getContentBlock("community_seed_pin:readme"),
    getContentBlock("community_seed_pin:welcome"),
    getContentBlock("community_seed_pin:announcement"),
    getContentBlock("community_seed_pin:chat-notice"),
    getContentBlock("community_seed_hidden:readme"),
    getContentBlock("community_seed_hidden:welcome"),
    getContentBlock("community_seed_hidden:announcement"),
    getContentBlock("community_seed_hidden:chat-notice"),
  ]);
  const [
    pinReadme,
    pinWelcome,
    pinAnnouncement,
    pinChatNotice,
    hiddenReadme,
    hiddenWelcome,
    hiddenAnnouncement,
    hiddenChatNotice,
  ] = seedFlags as string[];
  const seedPins = {
    readme: pinReadme === "1",
    welcome: pinWelcome === "1",
    announcement: pinAnnouncement === "1",
    "chat-notice": pinChatNotice === "1",
  };
  const seedHidden = {
    readme: hiddenReadme === "1",
    welcome: hiddenWelcome === "1",
    announcement: hiddenAnnouncement === "1",
    "chat-notice": hiddenChatNotice === "1",
  };

  let memberLabel = "public group";
  if (!hideMembers) {
    const count = await countChatMembers();
    if (count > 0) {
      memberLabel = `${count} member${count === 1 ? "" : "s"}`;
    }
  }

  let chatPreview: ChatPreview | null = null;
  try {
    const lastMessages = await listChatMessages({ limit: 1 });
    const last = lastMessages[lastMessages.length - 1];
    if (last) {
      chatPreview = {
        authorName: last.authorName,
        body: last.body,
        createdAt: last.createdAt,
      };
    }
  } catch {
    /* preview only — the live chat loads client-side regardless */
  }

  /* NO <main> wrapper here — the root layout already renders <main>, and a
     nested <main> gets caught by the mobile perf rule `main > * { contain:
     layout style }` (globals.css), which turns it into the containing block
     for the fixed-position .tg-app → the whole app collapses to 0 height on
     ≤768px viewports (black screen in the Telegram mini app / phones). */
  return (
    <TelegramApp
      testimonials={testimonials}
      buy4u={buy4u}
      announcements={announcements}
      welcome={welcome}
      seedReadme={seedReadme}
      seedAnnouncement={seedAnnouncement}
      seedChatNotice={seedChatNotice}
      seedPins={seedPins}
      seedHidden={seedHidden}
      memberLabel={memberLabel}
      chatPreview={chatPreview}
    />
  );
}
