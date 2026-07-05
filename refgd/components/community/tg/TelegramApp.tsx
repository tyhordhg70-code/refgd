"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from "react";
import { useRouter } from "next/navigation";
import CommunityChat from "../CommunityChat";
import NotificationSettings from "../NotificationSettings";
import { ADMIN_TG, ensureTelegramReady } from "../useCommunityChat";
import { parseStartParam, readStartParam } from "./deeplink";
import { IconBell, IconChat } from "./TgIcons";
import MiddleHeader from "./MiddleHeader";
import MessageBubble from "./MessageBubble";
import VouchHistory from "./VouchTopic";
import {
  ANNOUNCEMENT_SEED_BODY,
  ANNOUNCEMENT_SEED_PHOTO,
  ANNOUNCEMENT_SEED_TEXT,
  ANNOUNCEMENT_SEED_TIME,
  CHAT_NOTICE_SEED_TEXT,
  README_SEED_BODY,
  README_SEED_PHOTO,
  README_SEED_REACTIONS,
  README_SEED_TEXT,
  README_SEED_TIME,
  SEED_AUTHOR,
  SEED_AVATAR,
} from "./seed";
import type { TopicDef, TopicKey, VouchView } from "./types";
import {
  CustomEmojiImg,
  renderBody,
  renderTextWithEmoji,
  shortDateLabel,
  tokenPreview,
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

/**
 * Topics in the saved topic list's order, with each icon's real
 * custom-emoji document id (Group Chat uses the # forum icon).
 */
const TOPICS: TopicDef[] = [
  { key: "chat", title: "Group Chat", emoji: "💬", peer: 4 },
  {
    key: "readme",
    title: "READ ME",
    emoji: "‼️",
    docId: "5440660757194744323",
    peer: 0,
  },
  {
    key: "announcements",
    title: "Announcements",
    emoji: "📣",
    docId: "5424818078833715060",
    peer: 1,
  },
  {
    key: "buy4u",
    title: "BUY4U Vouches",
    emoji: "✈️",
    docId: "5231361378748472914",
    peer: 5,
  },
  {
    key: "testimonials",
    title: "Client Testimonials",
    emoji: "⭐️",
    docId: "5438496463044752972",
    peer: 3,
  },
];

/** Web A topic icon: custom-emoji artwork, or the # icon for Group Chat. */
function TopicIcon({ def }: { def: TopicDef }) {
  if (!def.docId) {
    return (
      <i
        className="icon icon-hashtag I0-98vJl P6JY5GgC general-forum-icon"
        aria-hidden
      />
    );
  }
  return (
    <div
      className="zOQgNBAa P6JY5GgC custom-emoji emoji tg-topic-icon"
      data-alt={def.emoji}
      aria-hidden
    >
      <CustomEmojiImg id={def.docId} alt={def.emoji} />
    </div>
  );
}

const ROW_HEIGHT = 65;
const MAIN_STYLE = { "--pattern-color": "#4A8E3A8C" } as CSSProperties;

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
  seedReadme = "",
  seedAnnouncement = "",
  seedChatNotice = "",
  memberLabel,
  chatPreview,
}: {
  testimonials: VouchView[];
  buy4u: VouchView[];
  announcements: VouchView[];
  welcome: string;
  /** Persisted admin override for the READ ME seed body ("" = use the built-in). */
  seedReadme?: string;
  /** Persisted admin override for the announcement seed body ("" = built-in). */
  seedAnnouncement?: string;
  /** Persisted admin override for the chat-notice seed body ("" = built-in). */
  seedChatNotice?: string;
  memberLabel: string;
  chatPreview: ChatPreview | null;
}) {
  const router = useRouter();
  const [active, setActive] = useState<TopicKey | null>(null);
  const [inTg, setInTg] = useState(false);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  // Topic-list search: null = closed, string = open with that query.
  const [listSearch, setListSearch] = useState<string | null>(null);
  const [showNotif, setShowNotif] = useState(false);
  // Desktop-only (≥926px): collapse the persistent topic-list pane. Read the
  // saved preference in an effect so the SSR markup matches the first paint.
  const [listCollapsed, setListCollapsed] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem("tg_list_collapsed") === "1")
        setListCollapsed(true);
    } catch {
      /* storage unavailable */
    }
  }, []);
  const toggleListCollapsed = () =>
    setListCollapsed((v) => {
      try {
        localStorage.setItem("tg_list_collapsed", v ? "0" : "1");
      } catch {
        /* storage unavailable */
      }
      return !v;
    });
  const listQuery = (listSearch ?? "").trim().toLowerCase();
  const visibleTopics = listQuery
    ? TOPICS.filter((t) => t.title.toLowerCase().includes(listQuery))
    : TOPICS;
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
  // placeholder (black screen) until WebApp.ready() fires — ensureTelegramReady()
  // signals that at SHELL mount (idempotent). Open on the TOPIC LIST
  // (active = null), matching the real Telegram forum/folder view, instead of
  // jumping straight into Group Chat.
  useEffect(() => {
    let cancelled = false;
    void ensureTelegramReady().then((inside) => {
      if (cancelled) return;
      if (inside) setInTg(true);
      // Launch deep link: a `?startapp=m_<topic>_<id>` (from Copy Link /
      // Forward) opens the Mini App straight into that topic; the message id is
      // handed to CommunityChat via the `#msg-<id>` hash it already scrolls to.
      const target = parseStartParam(readStartParam());
      if (target) {
        setActive(target.topic);
        if (target.messageId) {
          window.history.replaceState(null, "", `#msg-${target.messageId}`);
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Admin edits + pins to read-only posts are applied client-side over the
  // server-fetched vouches so the bubble updates instantly without a refetch
  // (which would flicker the whole topic). Keyed by vouch id.
  const [vouchEdits, setVouchEdits] = useState<Record<string, string>>({});
  const [vouchPins, setVouchPins] = useState<Record<string, boolean>>({});
  // Constant "seed" bubbles (READ ME, the welcome card, the announcement seed)
  // are admin-editable too. Their edit persists server-side (welcome →
  // mod_config, readme/announcement → content_blocks) but the bodies arrive as
  // SERVER props, so after a save we patch a client override keyed by the
  // seed's menu id. Effective body = client edit ?? server override ?? built-in.
  const [seedEdits, setSeedEdits] = useState<Record<string, string>>({});
  const onSeedEdited = (id: string, body: string) =>
    setSeedEdits((prev) => ({ ...prev, [id]: body }));
  const effWelcome = seedEdits["seed:welcome"] ?? welcome;
  const effReadme =
    seedEdits["seed:readme"] ?? (seedReadme || README_SEED_TEXT);
  const readmeOverridden =
    seedEdits["seed:readme"] !== undefined || seedReadme.length > 0;
  const effAnnouncement =
    seedEdits["seed:announcement"] ?? (seedAnnouncement || ANNOUNCEMENT_SEED_TEXT);
  const announcementOverridden =
    seedEdits["seed:announcement"] !== undefined || seedAnnouncement.length > 0;
  const effChatNotice =
    seedEdits["seed:chat-notice"] ?? (seedChatNotice || CHAT_NOTICE_SEED_TEXT);
  const chatNoticeOverridden =
    seedEdits["seed:chat-notice"] !== undefined || seedChatNotice.length > 0;
  const applyEdits = (list: VouchView[]): VouchView[] =>
    list.map((v) => {
      const body = vouchEdits[v.id] !== undefined ? vouchEdits[v.id] : v.body;
      const pinned =
        vouchPins[v.id] !== undefined ? vouchPins[v.id] : v.pinned;
      return body === v.body && pinned === v.pinned
        ? v
        : { ...v, body, pinned };
    });
  const byTopic: Record<string, VouchView[]> = {
    testimonials: applyEdits(testimonials),
    buy4u: applyEdits(buy4u),
    announcements: applyEdits(announcements),
  };

  const rowMeta = (key: TopicKey): RowMeta => {
    if (key === "readme") {
      const text = effWelcome.replace(/\s+/g, " ").trim();
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
      const text = tokenPreview(chatPreview.body).replace(/\s+/g, " ").trim();
      return {
        sender: chatPreview.authorName,
        summary: text || "Photo",
        time: shortDateLabel(chatPreview.createdAt),
      };
    }
    const last = latest(byTopic[key] ?? []);
    if (!last) {
      // Announcements' latest post in the real group is the seeded "ask the
      // bot" notice, so mirror it in the row preview until the bot ingests more.
      if (key === "announcements") {
        return {
          sender: SEED_AUTHOR,
          summary:
            "Dear members, Do you have a question, and do not want to wait for a response?",
          time: ANNOUNCEMENT_SEED_TIME,
        };
      }
      return { sender: null, summary: "No messages yet", time: "" };
    }
    const text = tokenPreview(last.body).replace(/\s+/g, " ").trim();
    return {
      sender: last.authorName,
      summary: text || (last.mediaIds.length > 0 ? "Photo" : ""),
      time: shortDateLabel(last.originDate ?? last.createdAt),
    };
  };

  // Inside the Mini App, links out of the replica must NOT navigate the
  // webview (that strands the user on the main site inside Telegram, with no
  // way back to the mini app). Route t.me links through the Telegram client
  // and everything else to the EXTERNAL browser via the bridge.
  useEffect(() => {
    if (!inTg) return;
    const root = htmlRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      const anchor = target?.closest?.("a[href]");
      if (!anchor || !root.contains(anchor)) return;
      const href = anchor.getAttribute("href") ?? "";
      // In-app topic rows use `#key` hashes — leave those alone.
      if (!href || href.startsWith("#")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.protocol !== "http:" && url.protocol !== "https:") return;
      // Links within the replica itself stay in the webview.
      if (
        url.origin === window.location.origin &&
        url.pathname.startsWith("/community")
      ) {
        return;
      }
      e.preventDefault();
      const wa = window.Telegram?.WebApp;
      const abs = url.toString();
      const isTgLink =
        url.hostname === "t.me" || url.hostname === "telegram.me";
      try {
        if (isTgLink && wa?.openTelegramLink) {
          wa.openTelegramLink(abs);
        } else if (wa?.openLink) {
          wa.openLink(abs);
        } else {
          window.open(abs, "_blank", "noopener");
        }
      } catch {
        window.open(abs, "_blank", "noopener");
      }
    };
    root.addEventListener("click", onClick);
    return () => root.removeEventListener("click", onClick);
  }, [inTg]);

  const back = () => setActive(null);

  // Web A-style tap ripple on topic rows: the vendored stylesheet already
  // ships .ripple-container/.ripple-wave and the ripple-animation keyframes —
  // this just spawns the wave <span> at the press point, exactly what Web A's
  // RippleEffect component does. Self-cleaning after the 0.7s animation.
  const spawnRipple = (e: ReactMouseEvent<HTMLAnchorElement>) => {
    const btn = e.currentTarget;
    const container = btn.querySelector(".ripple-container");
    if (!container) return;
    const rect = btn.getBoundingClientRect();
    const size = rect.width / 2;
    const wave = document.createElement("span");
    wave.className = "ripple-wave";
    wave.style.width = `${size}px`;
    wave.style.height = `${size}px`;
    wave.style.left = `${e.clientX - rect.left - size / 2}px`;
    wave.style.top = `${e.clientY - rect.top - size / 2}px`;
    container.appendChild(wave);
    window.setTimeout(() => wave.remove(), 700);
  };

  // ── Mobile swipe-back (≤925px) ─────────────────────────────────────
  // iOS-style edge gesture: a touch starting within 28px of the left screen
  // edge drags the whole chat column with the finger; releasing past 90px
  // slides it away and returns to the topic list. The drag writes an inline
  // transform on #MiddleColumn directly so no re-renders happen per move.
  // MessageBubble ignores edge-started touches for its swipe-to-reply.
  const middleRef = useRef<HTMLDivElement | null>(null);
  const backSwipe = useRef<{
    x: number;
    y: number;
    dragging: boolean;
    dead: boolean;
  } | null>(null);
  const onMiddleTouchStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (active === null || e.touches.length > 1) return;
    if (!window.matchMedia("(max-width: 925px)").matches) return;
    const t = e.touches[0];
    if (!t || t.clientX >= 28) return;
    backSwipe.current = {
      x: t.clientX,
      y: t.clientY,
      dragging: false,
      dead: false,
    };
  };
  const onMiddleTouchMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    const s = backSwipe.current;
    const el = middleRef.current;
    if (!s || s.dead || !el) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (!s.dragging) {
      if (Math.abs(dy) > Math.abs(dx)) {
        // vertical intent — let the message list scroll
        if (Math.abs(dy) > 12) s.dead = true;
        return;
      }
      if (dx < 8) return;
      s.dragging = true;
      el.style.transition = "none";
    }
    el.style.transform = `translateX(${Math.max(0, dx)}px)`;
  };
  const onMiddleTouchEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    const s = backSwipe.current;
    backSwipe.current = null;
    const el = middleRef.current;
    if (!s || !s.dragging || !el) return;
    const t = e.changedTouches[0];
    const dx = t ? t.clientX - s.x : 0;
    el.style.transition = "transform 0.2s ease-out";
    if (dx > 90) {
      // Commit: finish the slide offscreen, then show the list and hand
      // the column's transform back to the stylesheet.
      el.style.transform = "translateX(100vw)";
      window.setTimeout(() => {
        back();
        el.style.transition = "";
        el.style.transform = "";
      }, 210);
    } else {
      // Revert: spring back into place.
      el.style.transform = "translateX(0px)";
      window.setTimeout(() => {
        el.style.transition = "";
        el.style.transform = "";
      }, 210);
    }
  };

  // In the Mini App the ✕ must close the sheet (Web A parity); on the web it
  // returns to the main site. router.push inside Telegram stranded users on
  // the site within the webview.
  const closeApp = () => {
    if (inTg) {
      const wa = window.Telegram?.WebApp;
      if (wa?.close) {
        try {
          wa.close();
          return;
        } catch {
          /* old client — fall through */
        }
      }
      return; // never navigate the webview to the main site
    }
    router.push("/");
  };

  const mainCls = [
    "Transition_slide",
    "Transition_slide-active",
    "opacity-transition",
    "fast",
    active === null ? "left-column-shown left-column-open" : "",
    listCollapsed ? "tg-list-collapsed" : "",
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
    // READ ME is now an admin-postable feed: CommunityChat supplies the header,
    // the live message list and (for admins) the composer, while the original
    // welcome post + welcome banner are injected as its read-only seed. Members
    // see the "Topic locked" footer instead of an input (gated in CommunityChat
    // and enforced server-side in the chat POST route).
    const def = TOPICS.find((t) => t.key === "readme");
    middle = (
      <CommunityChat
        key="readme"
        onBack={back}
        topic="readme"
        title={def?.title ?? "READ ME"}
        icon={def ? <TopicIcon def={def} /> : undefined}
        onSeedEdited={onSeedEdited}
        history={(
          query,
          onReadonlyMenu,
          onOpenMedia,
          pinnedOnly,
          reactionsFor,
          onReact,
        ) => {
          if (pinnedOnly) return null;
          const rq = query.trim().toLowerCase();
          const showSeed = !rq || effReadme.toLowerCase().includes(rq);
          const showWelcome =
            !!effWelcome && (!rq || effWelcome.toLowerCase().includes(rq));
          if (!showSeed && !showWelcome) return null;
          return (
            <div className="message-date-group first-message-date-group">
              <div className="sender-group-container sKXqbu2I">
                {showSeed && (
                  <MessageBubble
                    own={false}
                    first
                    last={!showWelcome}
                    showAvatarGutter
                    sender={{ name: SEED_AUTHOR, peer: 0, admin: true }}
                    avatar={
                      showWelcome
                        ? null
                        : { name: SEED_AUTHOR, photo: SEED_AVATAR, peer: 0 }
                    }
                    hasAppendix={!showWelcome}
                    pinned
                    media={[README_SEED_PHOTO]}
                    reactions={reactionsFor(
                      "seed:readme",
                      README_SEED_REACTIONS,
                    )}
                    onReact={(e) => onReact("seed:readme", e)}
                    body={readmeOverridden ? renderBody(effReadme) : README_SEED_BODY}
                    time={README_SEED_TIME}
                    onOpenMenu={(pos) =>
                      onReadonlyMenu(pos, {
                        id: "seed:readme",
                        text: effReadme,
                        pinned: true,
                        canModify: true,
                        canPin: false,
                      })
                    }
                    onOpenMedia={onOpenMedia}
                  />
                )}
                {showWelcome && (
                  <MessageBubble
                    own={false}
                    first={!showSeed}
                    last
                    showAvatarGutter
                    sender={null}
                    avatar={{ name: SEED_AUTHOR, photo: SEED_AVATAR, peer: 0 }}
                    hasAppendix
                    body={renderBody(effWelcome)}
                    reactions={reactionsFor("seed:welcome")}
                    onReact={(e) => onReact("seed:welcome", e)}
                    onOpenMenu={(pos) =>
                      onReadonlyMenu(pos, {
                        id: "seed:welcome",
                        text: effWelcome,
                        pinned: false,
                        canModify: true,
                        canPin: false,
                      })
                    }
                  />
                )}
              </div>
            </div>
          );
        }}
      />
    );
  } else if (
    active === "announcements" ||
    active === "buy4u" ||
    active === "testimonials"
  ) {
    const def = TOPICS.find((t) => t.key === active);
    const topicKey = active;
    middle = (
      <CommunityChat
        key={active}
        onBack={back}
        topic={active}
        title={def?.title ?? ""}
        icon={def ? <TopicIcon def={def} /> : undefined}
        onVouchEdited={(id, body) =>
          setVouchEdits((prev) => ({ ...prev, [id]: body }))
        }
        onVouchPinned={(id, pinned) =>
          setVouchPins((prev) => ({ ...prev, [id]: pinned }))
        }
        onSeedEdited={onSeedEdited}
        chatNoticeText={effChatNotice}
        chatNoticeOverridden={chatNoticeOverridden}
        pinnedExtras={(byTopic[topicKey] ?? [])
          .filter((v) => v.pinned)
          .sort((a, b) => {
            const ta = a.originDate ?? a.createdAt;
            const tb = b.originDate ?? b.createdAt;
            if (ta !== tb) return ta < tb ? -1 : 1;
            return Number(a.id) - Number(b.id);
          })
          .map((v) => ({ id: `v${v.id}`, body: v.body ?? "" }))}
        history={(
          query,
          onReadonlyMenu,
          onOpenMedia,
          pinnedOnly,
          reactionsFor,
          onReact,
        ) => {
          const q = query.trim().toLowerCase();
          const vouches = byTopic[topicKey] ?? [];
          const shown = (
            q
              ? vouches.filter(
                  (v) =>
                    v.body.toLowerCase().includes(q) ||
                    v.authorName.toLowerCase().includes(q),
                )
              : vouches
          ).filter((v) => !pinnedOnly || v.pinned);
          return (
            <>
              {topicKey === "announcements" && !q && !pinnedOnly && (
                <div className="message-date-group first-message-date-group">
                  <div className="sender-group-container sKXqbu2I">
                    <MessageBubble
                      own={false}
                      first
                      last
                      showAvatarGutter
                      sender={{ name: SEED_AUTHOR, peer: 0, admin: true }}
                      avatar={{ name: SEED_AUTHOR, photo: SEED_AVATAR, peer: 0 }}
                      hasAppendix
                      pinned
                      media={[ANNOUNCEMENT_SEED_PHOTO]}
                      body={
                        announcementOverridden
                          ? renderBody(effAnnouncement)
                          : ANNOUNCEMENT_SEED_BODY
                      }
                      time={ANNOUNCEMENT_SEED_TIME}
                      reactions={reactionsFor("seed:announcement")}
                      onReact={(e) => onReact("seed:announcement", e)}
                      onOpenMenu={(pos) =>
                        onReadonlyMenu(pos, {
                          id: "seed:announcement",
                          text: effAnnouncement,
                          pinned: true,
                          canModify: true,
                          canPin: false,
                        })
                      }
                      onOpenMedia={onOpenMedia}
                    />
                  </div>
                </div>
              )}
              <VouchHistory
                vouches={shown}
                onOpenMenu={onReadonlyMenu}
                onOpenMedia={onOpenMedia}
                reactionsFor={reactionsFor}
                onReact={onReact}
              />
            </>
          );
        }}
      />
    );
  } else {
    middle = (
      <CommunityChat
        key="chat"
        onBack={back}
        onSeedEdited={onSeedEdited}
        chatNoticeText={effChatNotice}
        chatNoticeOverridden={chatNoticeOverridden}
      />
    );
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
                  {listSearch === null ? (
                    <>
                      <button
                        type="button"
                        className="Button smaller translucent round"
                        aria-label="Close"
                        title="Close"
                        onClick={closeApp}
                      >
                        <i className="icon icon-close" aria-hidden />
                      </button>
                      <div className="ChatInfo RpNeGy4Y">
                        <div className="info">
                          <div className="title eZi5Ws-N">
                            <h3
                              dir="auto"
                              role="button"
                              className="fullName _8IVW0azL"
                            >
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
                          className="Button smaller translucent round tg-desk-only"
                          aria-label="Hide topic list"
                          title="Hide topic list"
                          onClick={toggleListCollapsed}
                        >
                          <i className="icon icon-sidebar" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="Button smaller translucent round"
                          aria-label="Search topics"
                          title="Search topics"
                          onClick={() => setListSearch("")}
                        >
                          <i className="icon icon-search" aria-hidden />
                        </button>
                        <button
                          type="button"
                          className="Button smaller translucent round"
                          aria-label="More actions"
                          title="More actions"
                          aria-expanded={listMenuOpen}
                          onClick={() => setListMenuOpen((v) => !v)}
                        >
                          <i className="icon icon-more" aria-hidden />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="Button smaller translucent round"
                        aria-label="Close search"
                        title="Close search"
                        onClick={() => setListSearch(null)}
                      >
                        <i className="icon icon-arrow-left" aria-hidden />
                      </button>
                      <div className="SearchInput tg-list-search" dir="ltr">
                        <input
                          type="text"
                          dir="auto"
                          placeholder="Search"
                          className="form-control"
                          value={listSearch}
                          autoFocus
                          onChange={(e) => setListSearch(e.target.value)}
                        />
                      </div>
                    </>
                  )}
                  {listMenuOpen && (
                    <>
                      <button
                        type="button"
                        className="tg-menu-backdrop"
                        onClick={() => setListMenuOpen(false)}
                        aria-label="Close menu"
                      />
                      <div className="tg-menu" role="menu">
                        <button
                          type="button"
                          className="tg-menu-item"
                          onClick={() => {
                            setListMenuOpen(false);
                            setShowNotif(true);
                          }}
                        >
                          <IconBell />
                          Notifications
                        </button>
                        <a
                          className="tg-menu-item"
                          href={ADMIN_TG}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={() => setListMenuOpen(false)}
                        >
                          <IconChat />
                          Message admin
                        </a>
                      </div>
                    </>
                  )}
                </div>
                <div className="biKrMjRH" />
                <div className="chat-list custom-scroll">
                  <div className="ztAcxuDG" />
                  <div
                    style={{
                      position: "relative",
                      height: visibleTopics.length * ROW_HEIGHT,
                    }}
                  >
                    {visibleTopics.map((t, i) => {
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
                            onMouseDown={spawnRipple}
                            onClick={(e) => {
                              e.preventDefault();
                              setActive(t.key);
                            }}
                          >
                            <div className="ripple-container" />
                            <div className="info">
                              <div className="info-row">
                                <div className="title">
                                  <TopicIcon def={t} />
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

            <div
              id="MiddleColumn"
              className="mask-image-disabled ui-ready"
              ref={middleRef}
              onTouchStart={onMiddleTouchStart}
              onTouchMove={onMiddleTouchMove}
              onTouchEnd={onMiddleTouchEnd}
              onTouchCancel={onMiddleTouchEnd}
            >
              <div className="resize-handle" />
              <div id="middle-column-portals" />
              <button
                type="button"
                className="Button smaller translucent round tg-list-reopen"
                aria-label="Show topic list"
                title="Show topic list"
                onClick={toggleListCollapsed}
              >
                <i className="icon icon-sidebar" aria-hidden />
              </button>
              <div className="messages-layout">{middle}</div>
            </div>
          </div>
        </div>
        {showNotif && (
          <NotificationSettings onClose={() => setShowNotif(false)} />
        )}
      </div>
    </div>
  );
}
