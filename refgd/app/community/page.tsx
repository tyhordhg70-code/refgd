import "./telegram.css";
import {
  countChatMembers,
  getModConfig,
  listChatMessages,
  listVouches,
} from "@/lib/community";
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
  const [testimonials, buy4u, announcements, welcome, hideMembers] =
    await Promise.all([
      listVouches("testimonials"),
      listVouches("buy4u"),
      listVouches("announcements"),
      getModConfig<string>("welcome", ""),
      getModConfig<boolean>("chat_hide_members", false),
    ]);

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

  return (
    <main>
      <TelegramApp
        testimonials={testimonials}
        buy4u={buy4u}
        announcements={announcements}
        welcome={welcome}
        memberLabel={memberLabel}
        chatPreview={chatPreview}
      />
    </main>
  );
}
