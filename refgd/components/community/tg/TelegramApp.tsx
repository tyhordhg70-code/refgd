"use client";

import { useState } from "react";
import CommunityChat from "../CommunityChat";
import MiddleHeader from "./MiddleHeader";
import MessageBubble from "./MessageBubble";
import VouchTopic from "./VouchTopic";
import type { TopicDef, TopicKey, VouchView } from "./types";
import { renderBody, shortDateLabel } from "./format";

/**
 * The full-viewport Telegram Web A replica for /community: a forum group
 * ("RefundGod") with a left topic list and a middle chat column. Vouch topics
 * (Testimonials, BUY4U, Announcements) are read-only mirrors of the group;
 * READ ME shows the welcome post; Group Chat is the live chat. On mobile the
 * columns stack exactly like Web A (list first, topic slides in).
 */

const TOPICS: TopicDef[] = [
  { key: "readme", title: "READ ME", emoji: "📌", peer: 0 },
  { key: "announcements", title: "Announcements", emoji: "📣", peer: 1 },
  { key: "buy4u", title: "BUY4U Vouches", emoji: "🛒", peer: 5 },
  { key: "testimonials", title: "Client Testimonials", emoji: "⭐", peer: 3 },
  { key: "chat", title: "Group Chat", emoji: "💬", peer: 4 },
];

const NOTICES: Record<string, string> = {
  announcements: "Official updates from the RefundGod team.",
  buy4u: "Proof from our BUY4U concierge orders.",
  testimonials: "Real customers, real refunds — straight from the group.",
};

export interface ChatPreview {
  authorName: string;
  body: string;
  createdAt: string;
}

function previewText(v: VouchView | undefined): string {
  if (!v) return "No messages yet";
  const text = v.body.replace(/\s+/g, " ").trim();
  if (text) return `${v.authorName}: ${text}`;
  if (v.mediaIds.length > 0) return `${v.authorName}: Photo`;
  return v.authorName;
}

function latest(vouches: VouchView[]): VouchView | undefined {
  let best: VouchView | undefined;
  for (const v of vouches) {
    if (!best || v.createdAt > best.createdAt) best = v;
  }
  return best;
}

export default function TelegramApp({
  testimonials,
  buy4u,
  announcements,
  welcome,
  memberLabel,
  chatPreview,
}: {
  testimonials: VouchView[];
  buy4u: VouchView[];
  announcements: VouchView[];
  welcome: string;
  memberLabel: string;
  chatPreview: ChatPreview | null;
}) {
  const [active, setActive] = useState<TopicKey | null>(null);

  const byTopic: Record<string, VouchView[]> = {
    testimonials,
    buy4u,
    announcements,
  };

  const rowMeta = (key: TopicKey): { preview: string; time: string } => {
    if (key === "readme") {
      const text = welcome.replace(/\s+/g, " ").trim();
      return { preview: text || "Welcome to RefundGod", time: "" };
    }
    if (key === "chat") {
      if (!chatPreview) return { preview: "Talk to the community", time: "" };
      const text = chatPreview.body.replace(/\s+/g, " ").trim();
      return {
        preview: `${chatPreview.authorName}: ${text || "Photo"}`,
        time: shortDateLabel(chatPreview.createdAt),
      };
    }
    const last = latest(byTopic[key] ?? []);
    return {
      preview: previewText(last),
      time: last ? shortDateLabel(last.originDate ?? last.createdAt) : "",
    };
  };

  const back = () => setActive(null);

  return (
    <div className={`tg-app${active ? " is-topic-open" : ""}`}>
      <div className="tg-left">
        <div className="tg-left-header">
          <div className="tg-group-avatar" aria-hidden>
            RG
          </div>
          <div className="tg-group-title">
            <h1>RefundGod</h1>
            <p>{memberLabel}</p>
          </div>
        </div>
        <div className="tg-topics tg-scroll">
          {TOPICS.map((t) => {
            const meta = rowMeta(t.key);
            return (
              <button
                key={t.key}
                type="button"
                className="tg-topic"
                aria-current={active === t.key}
                onClick={() => setActive(t.key)}
              >
                <span className={`tg-topic-avatar tg-bg-peer-${t.peer}`}>
                  {t.emoji}
                </span>
                <span className="tg-topic-body">
                  <span className="tg-topic-top">
                    <span className="tg-topic-title">{t.title}</span>
                    {meta.time && (
                      <span className="tg-topic-time">{meta.time}</span>
                    )}
                  </span>
                  <span className="tg-topic-preview">{meta.preview}</span>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="tg-middle">
        {active === null && (
          <div className="tg-empty-middle">
            <span className="tg-action">Select a topic to start messaging</span>
          </div>
        )}

        {active === "readme" && (
          <>
            <MiddleHeader title="READ ME" subtitle="1 message" onBack={back} />
            <div className="tg-messages">
              <div className="tg-messages-scroll tg-scroll">
                <div className="tg-messages-inner">
                  {welcome ? (
                    <MessageBubble
                      own={false}
                      showAvatarGutter
                      sender={{ name: "RefundGod", peer: 0, admin: true }}
                      avatar={{ name: "RefundGod", photo: null, peer: 0 }}
                      hasAppendix
                      pinned
                      body={renderBody(welcome)}
                    />
                  ) : (
                    <div className="tg-action">Nothing here yet.</div>
                  )}
                </div>
              </div>
            </div>
            <div className="tg-composer-area">
              <div className="tg-composer-notice">
                Only admins can post in this topic.
              </div>
            </div>
          </>
        )}

        {(active === "announcements" ||
          active === "buy4u" ||
          active === "testimonials") && (
          <VouchTopic
            title={TOPICS.find((t) => t.key === active)?.title ?? ""}
            vouches={byTopic[active] ?? []}
            notice={NOTICES[active] ?? ""}
            onBack={back}
          />
        )}

        {active === "chat" && <CommunityChat onBack={back} />}
      </div>
    </div>
  );
}
