"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import CommunityChat from "../CommunityChat";
import { ensureTelegramReady } from "../useCommunityChat";
import MiddleHeader from "./MiddleHeader";
import MessageBubble from "./MessageBubble";
import VouchTopic from "./VouchTopic";
import { README_SEED_BODY, README_SEED_TIME, SEED_AUTHOR } from "./seed";
import type { TopicDef, TopicKey, VouchView } from "./types";
import {
  emojiSrc,
  renderBody,
  renderTextWithEmoji,
  shortDateLabel,
} from "./format";

/**
 * The full-viewport Telegram Web A replica for /community, emitting the real
 * client's DOM: .tg-html/.tg-body stand-ins carrying the saved runtime style
 * vars, #Main with the saved column classes, #LeftColumn (topic-list panel
 * with #TopicListHeader and the 65px virtualised .chat-list rows) and
 * #MiddleColumn (.messages-layout hosting the active topic). Vouch topics
 * (Testimonials, BUY4U, Announcements) are read-only mirrors of the group;
 * READ ME shows the welcome post; Group Chat is the live chat.
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

const ROW_HEIGHT = 65;
const MAIN_STYLE = { "--pattern-color": "#4A8E3A8C" } as CSSProperties;
const README_LIST_STYLE = {
  "--message-list-bottom-inset": "60px",
  "--message-list-bottom-fade": "48px",
} as CSSProperties;

export interface ChatPreview {
  authorName: string;
  body: string;
  createdAt: string;
}

interface RowMeta {
  sender: string | null;
  summary: string;
  time: string;
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
  const router = useRouter();
  const [active, setActive] = useState<TopicKey | null>(null);
  const htmlRef = useRef<HTMLDivElement>(null);

  // Web A sizes everything against --vh (set from window.innerHeight) so the
  // layout tracks mobile browser chrome exactly like the real client.
  useEffect(() => {
    const el = htmlRef.current;
    if (!el) return;
    const set = () =>
      el.style.setProperty("--vh", `${window.innerHeight * 0.01}px`);
    set();
    window.addEventListener("resize", set);
    return () => window.removeEventListener("resize", set);
  }, []);

  // Inside the Telegram Mini App webview, the client shows an opaque loading
  // placeholder (black screen) until WebApp.ready() fires — so signal ready
  // at SHELL mount, not only when the chat topic mounts. The mini app has
  // always opened straight into the live group chat, so jump there too.
  useEffect(() => {
    let cancelled = false;
    void ensureTelegramReady().then((inside) => {
      if (inside && !cancelled) {
        setActive((cur) => cur ?? "chat");
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const byTopic: Record<string, VouchView[]> = {
    testimonials,
    buy4u,
    announcements,
  };

  const rowMeta = (key: TopicKey): RowMeta => {
    if (key === "readme") {
      const text = welcome.replace(/\s+/g, " ").trim();
      return {
        sender: null,
        summary:
          text ||
          "READ ME❗️ If you haven't already, we kindly ask you to please visit our website…",
        time: "",
      };
    }
    if (key === "chat") {
      if (!chatPreview) {
        return { sender: null, summary: "Talk to the community", time: "" };
      }
      const text = chatPreview.body.replace(/\s+/g, " ").trim();
      return {
        sender: chatPreview.authorName,
        summary: text || "Photo",
        time: shortDateLabel(chatPreview.createdAt),
      };
    }
    const last = latest(byTopic[key] ?? []);
    if (!last) return { sender: null, summary: "No messages yet", time: "" };
    const text = last.body.replace(/\s+/g, " ").trim();
    return {
      sender: last.authorName,
      summary: text || (last.mediaIds.length > 0 ? "Photo" : ""),
      time: shortDateLabel(last.originDate ?? last.createdAt),
    };
  };

  const back = () => setActive(null);

  const mainCls = [
    "Transition_slide",
    "Transition_slide-active",
    "opacity-transition",
    "fast",
    active === null ? "left-column-shown left-column-open" : "",
    "right-column-not-shown",
    "right-column-not-open",
  ]
    .filter(Boolean)
    .join(" ");

  let middle: ReactNode = null;
  if (active === null) {
    middle = (
      <div className="tg-empty-middle">
        <span className="tg-action">Select a topic to start messaging</span>
      </div>
    );
  } else if (active === "readme") {
    middle = (
      <>
        <MiddleHeader
          title="READ ME"
          subtitle={welcome ? "2 messages" : "1 message"}
          icon={
            <div
              className="zOQgNBAa P6JY5GgC custom-emoji emoji tg-topic-icon"
              data-alt="📌"
              aria-hidden
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={emojiSrc("📌")}
                className="emoji"
                alt="📌"
                draggable={false}
              />
            </div>
          }
          onBack={back}
        />
        <div className="Transition">
          <div className="Transition_slide Transition_slide-active">
            <div
              className="Transition MessageList custom-scroll with-default-bg"
              style={README_LIST_STYLE}
            >
              <div className="Transition_slide Transition_slide-active">
                <div
                  className="messages-container"
                  style={{ paddingBottom: 60 }}
                >
                  <div className="backwards-trigger" />
                  <div className="message-date-group first-message-date-group">
                    <div className="sender-group-container sKXqbu2I">
                      <MessageBubble
                        own={false}
                        first
                        last={!welcome}
                        showAvatarGutter
                        sender={{ name: SEED_AUTHOR, peer: 0, admin: true }}
                        avatar={
                          welcome
                            ? null
                            : { name: SEED_AUTHOR, photo: null, peer: 0 }
                        }
                        hasAppendix={!welcome}
                        pinned
                        body={README_SEED_BODY}
                        time={README_SEED_TIME}
                      />
                      {welcome && (
                        <MessageBubble
                          own={false}
                          last
                          showAvatarGutter
                          sender={null}
                          avatar={{ name: SEED_AUTHOR, photo: null, peer: 0 }}
                          hasAppendix
                          body={renderBody(welcome)}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="middle-column-footer">
          <div className="messaging-disabled shown">
            <div className="messaging-disabled-inner">
              <span>Only admins can post in this topic.</span>
            </div>
          </div>
        </div>
      </>
    );
  } else if (
    active === "announcements" ||
    active === "buy4u" ||
    active === "testimonials"
  ) {
    const def = TOPICS.find((t) => t.key === active);
    middle = (
      <VouchTopic
        title={def?.title ?? ""}
        emoji={def?.emoji ?? "⭐"}
        vouches={byTopic[active] ?? []}
        notice={NOTICES[active] ?? ""}
        onBack={back}
      />
    );
  } else {
    middle = <CommunityChat onBack={back} />;
  }

  return (
    <div className="tg-app">
      <div
        ref={htmlRef}
        className="tg-html theme-light"
        data-message-text-size="15"
      >
        <div className="tg-body Y7owXZmb is-pointer-env">
          <div id="Main" className={mainCls} style={MAIN_STYLE}>
            <div id="LeftColumn" className="Transition">
              <div
                id="LeftColumn-main"
                className="Transition_slide Transition_slide-active"
              />
              <div className="m2EjaIDq" style={{ transform: "none" }}>
                <div id="TopicListHeader" className="left-header">
                  <button
                    type="button"
                    className="Button smaller translucent round"
                    aria-label="Close"
                    title="Close"
                    onClick={() => router.push("/")}
                  >
                    <i className="icon icon-close" aria-hidden />
                  </button>
                  <div className="ChatInfo RpNeGy4Y">
                    <div className="info">
                      <div className="title eZi5Ws-N">
                        <h3 dir="auto" role="button" className="fullName _8IVW0azL">
                          RefundGod
                        </h3>
                      </div>
                      <span className="status">
                        <span className="group-status">{memberLabel}</span>
                      </span>
                    </div>
                  </div>
                  <div className="HeaderActions">
                    <button
                      type="button"
                      className="Button smaller translucent round"
                      aria-label="Search this chat"
                      title="Search this chat"
                    >
                      <i className="icon icon-search" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className="Button smaller translucent round"
                      aria-label="More actions"
                      title="More actions"
                    >
                      <i className="icon icon-more" aria-hidden />
                    </button>
                  </div>
                </div>
                <div className="biKrMjRH" />
                <div className="chat-list custom-scroll">
                  <div className="ztAcxuDG" />
                  <div
                    style={{
                      position: "relative",
                      height: TOPICS.length * ROW_HEIGHT,
                    }}
                  >
                    {TOPICS.map((t, i) => {
                      const meta = rowMeta(t.key);
                      return (
                        <div
                          key={t.key}
                          className={`ListItem L6dKWJvD Chat${
                            active === t.key ? " selected" : ""
                          } chat-item-clickable`}
                          style={{ top: i * ROW_HEIGHT }}
                        >
                          <a
                            className="ListItem-button"
                            href={`#${t.key}`}
                            tabIndex={0}
                            onClick={(e) => {
                              e.preventDefault();
                              setActive(t.key);
                            }}
                          >
                            <div className="info">
                              <div className="info-row">
                                <div className="title">
                                  {t.key === "chat" ? (
                                    <i
                                      className="icon icon-hashtag I0-98vJl P6JY5GgC general-forum-icon"
                                      aria-hidden
                                    />
                                  ) : (
                                    <div
                                      className="zOQgNBAa P6JY5GgC custom-emoji emoji tg-topic-icon"
                                      data-alt={t.emoji}
                                      aria-hidden
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={emojiSrc(t.emoji)}
                                        className="emoji"
                                        alt={t.emoji}
                                        draggable={false}
                                      />
                                    </div>
                                  )}
                                  <h3 dir="auto" className="fullName">
                                    {t.title}
                                  </h3>
                                </div>
                                <div className="separator" />
                                <div className="LastMessageMeta">
                                  {meta.time && (
                                    <span className="time">{meta.time}</span>
                                  )}
                                </div>
                              </div>
                              <div className="subtitle">
                                <p
                                  className="last-message shared-canvas-container"
                                  dir="ltr"
                                >
                                  {meta.sender && (
                                    <>
                                      <span className="sender-name">
                                        {meta.sender}
                                      </span>
                                      <span className="colon">:</span>
                                    </>
                                  )}
                                  <span
                                    className="last-message-summary"
                                    dir="auto"
                                  >
                                    {renderTextWithEmoji(
                                      meta.summary,
                                      `pv-${t.key}`,
                                    )}
                                  </span>
                                </p>
                              </div>
                            </div>
                          </a>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div id="MiddleColumn" className="mask-image-disabled ui-ready">
              <div className="resize-handle" />
              <div id="middle-column-portals" />
              <div className="messages-layout">{middle}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
