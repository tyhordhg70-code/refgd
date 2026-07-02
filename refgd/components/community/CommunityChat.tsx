"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import NotificationSettings from "./NotificationSettings";
import AdminPanel from "./AdminPanel";
import MiddleHeader from "./tg/MiddleHeader";
import MessageBubble from "./tg/MessageBubble";
import Appendix from "./tg/Appendix";
import EmojiPanel from "./tg/EmojiPanel";
import {
  IconBan,
  IconBell,
  IconChat,
  IconClose,
  IconCopy,
  IconDelete,
  IconDownload,
  IconExpand,
  IconForward,
  IconLink,
  IconPin,
  IconReply,
  IconSettings,
} from "./tg/TgIcons";
import {
  LocalTime,
  dateKey,
  dateLabel,
  peerIdx,
  renderBody,
} from "./tg/format";
import {
  ADMIN_TG,
  REACTIONS,
  prepareChatImage,
  useCommunityChat,
  type ChatMessage,
} from "./useCommunityChat";
import type { ChatTopic } from "@/lib/community";
import {
  CHAT_NOTICE_SEED_BODY,
  CHAT_NOTICE_SEED_TIME,
  SEED_AUTHOR,
  SEED_AVATAR,
} from "./tg/seed";

/**
 * The "Group Chat" forum topic, rendered as an exact Telegram Web A light
 * theme replica: real MessageList DOM (Transition-wrapped custom-scroll list,
 * sticky date pills, sender-group runs) and the real Composer DOM
 * (.composer-wrapper with the #composerAppendix tail, #editable-message-text
 * contenteditable input and the round send button). All live behaviour
 * (polling, sending, reactions, Mini App sign-in, moderation) lives in
 * useCommunityChat — this component is purely presentational.
 */

interface DateGroup {
  key: string;
  label: string;
  runs: ChatMessage[][];
}

function buildGroups(messages: ChatMessage[]): DateGroup[] {
  const todayYear = new Date().getUTCFullYear();
  const groups: DateGroup[] = [];
  for (const m of messages) {
    const key = dateKey(m.createdAt);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: dateLabel(key, todayYear), runs: [] };
      groups.push(group);
    }
    const run = group.runs[group.runs.length - 1];
    if (run && run[run.length - 1].tgId === m.tgId) {
      run.push(m);
    } else {
      group.runs.push([m]);
    }
  }
  return groups;
}

const LIST_STYLE = {
  "--message-list-bottom-inset": "76px",
  "--message-list-bottom-fade": "68px",
} as CSSProperties;

const MAX_LEN = 2000;

const FS_PROMPT_KEY = "rg_fs_prompted";

export default function CommunityChat({
  onBack,
  topic = "chat",
  title = "Group Chat",
  icon,
  history,
}: {
  onBack?: () => void;
  /** Which forum topic this feed reads/writes; defaults to the group chat. */
  topic?: ChatTopic;
  title?: string;
  /** Header icon override (topic emoji); defaults to the # forum icon. */
  icon?: ReactNode;
  /**
   * Read-only migrated history rendered above the live messages. A function
   * receives the active in-chat search query so it can filter itself.
   */
  history?: ReactNode | ((query: string) => ReactNode);
}) {
  const chat = useCommunityChat(topic);
  const isGroupChat = topic === "chat";
  const [menuOpen, setMenuOpen] = useState(false);
  // In-chat search: null = closed, string = open with that query.
  const [search, setSearch] = useState<string | null>(null);
  const [showNotif, setShowNotif] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [fsPrompt, setFsPrompt] = useState(false);
  // Web A message context menu (right-click / long-press on a bubble).
  const [ctxMenu, setCtxMenu] = useState<{
    m: ChatMessage;
    x: number;
    y: number;
  } | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  // Fullscreen photo viewer (click a message photo to expand it).
  const [lightbox, setLightbox] = useState<string | null>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Keep the message list clear of the composer: the footer is overlaid at the
  // bottom, so the list needs bottom padding equal to its live height (which
  // grows with the reply bar, attachment preview or admin TTL row).
  const footerRef = useRef<HTMLDivElement>(null);
  const [composerPad, setComposerPad] = useState(76);
  useEffect(() => {
    const el = footerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      setComposerPad(Math.max(76, el.offsetHeight + 12));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Absolute URL for a stored chat photo (same-origin API route).
  const mediaUrl = (mediaId: string) =>
    `/api/community/chat-media/${mediaId}`;

  // Context-menu media helpers. Copy/Download/Forward all operate on the
  // clicked message's photo (Forward opens Telegram's share sheet so the
  // member can save it to Saved Messages, matching the real client).
  const copyImage = async (mediaId: string) => {
    try {
      const res = await fetch(mediaUrl(mediaId));
      const blob = await res.blob();
      // Normalise to PNG (the only universally clipboard-writable image type).
      const bmp = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      canvas.getContext("2d")?.drawImage(bmp, 0, 0);
      const png = await new Promise<Blob | null>((r) =>
        canvas.toBlob(r, "image/png"),
      );
      if (png)
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": png }),
        ]);
    } catch {
      /* clipboard/image API unavailable — ignore */
    }
  };
  const downloadImage = (mediaId: string) => {
    const a = document.createElement("a");
    a.href = mediaUrl(mediaId);
    a.download = `photo-${mediaId}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  const copyMessageLink = (m: ChatMessage) => {
    const base = window.location.href.split("#")[0];
    void navigator.clipboard
      ?.writeText(`${base}#msg-${m.id}`)
      .catch(() => undefined);
  };
  const forwardMessage = (m: ChatMessage) => {
    const base = window.location.href.split("#")[0];
    const url = `https://t.me/share/url?url=${encodeURIComponent(
      `${base}#msg-${m.id}`,
    )}&text=${encodeURIComponent(m.body || "Photo")}`;
    const tg = (
      window as unknown as {
        Telegram?: { WebApp?: { openTelegramLink?: (u: string) => void } };
      }
    ).Telegram?.WebApp;
    if (tg?.openTelegramLink) tg.openTelegramLink(url);
    else window.open(url, "_blank", "noopener");
  };

  // Append an emoji character / custom-emoji token to the composer text and
  // keep the contenteditable + caret in sync.
  const insertAtComposer = (snippet: string) => {
    const next = (chat.text + snippet).slice(0, MAX_LEN);
    chat.setText(next);
    const el = inputRef.current;
    if (el) {
      el.innerText = next;
      el.focus();
      const sel = window.getSelection();
      sel?.selectAllChildren(el);
      sel?.collapseToEnd();
    }
  };

  // Turn a picked/pasted image into the pending attachment (downscaled
  // client-side so the server's 3 MB cap is practically never hit).
  const attachImage = async (file: Blob) => {
    const prepared = await prepareChatImage(file);
    if (prepared) {
      chat.setAttachment(prepared);
      chat.setError(null);
    } else {
      chat.setError("That file doesn't look like an image");
    }
  };

  // Offer fullscreen as an entry prompt (once per session) instead of a
  // buried menu item.
  useEffect(() => {
    if (!chat.canFullscreen || chat.isFullscreen) return;
    try {
      if (sessionStorage.getItem(FS_PROMPT_KEY)) return;
    } catch {
      /* storage unavailable — still prompt */
    }
    setFsPrompt(true);
  }, [chat.canFullscreen, chat.isFullscreen]);

  const dismissFsPrompt = () => {
    setFsPrompt(false);
    try {
      sessionStorage.setItem(FS_PROMPT_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const { state, me } = chat;
  const query = (search ?? "").trim().toLowerCase();
  const groups = useMemo(() => {
    const all = state?.messages ?? [];
    const shown = query
      ? all.filter(
          (m) =>
            m.body.toLowerCase().includes(query) ||
            m.authorName.toLowerCase().includes(query),
        )
      : all;
    return buildGroups(shown);
  }, [state?.messages, query]);

  // Latest pinned message, surfaced in a banner under the header (Web A parity).
  const pinnedMsg = useMemo(() => {
    const pins = (state?.messages ?? []).filter((m) => m.pinned);
    return pins.length ? pins[pins.length - 1] : null;
  }, [state?.messages]);

  // Keep the contenteditable input in sync with chat.text when it changes
  // programmatically (e.g. cleared after send) without clobbering the caret
  // while the user is typing.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const current = el.innerText.replace(/\n$/, "");
    if (chat.text === "" && current !== "") {
      el.innerText = "";
    } else if (current !== chat.text && document.activeElement !== el) {
      el.innerText = chat.text;
    }
  }, [chat.text]);

  const subtitle =
    state === null
      ? "connecting…"
      : state.memberCount !== null && state.memberCount > 0
        ? `${state.memberCount} member${state.memberCount === 1 ? "" : "s"}`
        : state.memberCount === 0
          ? "public group"
          : "members hidden";

  return (
    <>
      <MiddleHeader
        title={title}
        subtitle={subtitle}
        icon={
          icon ?? (
            <i
              className="icon icon-hashtag I0-98vJl P6JY5GgC general-forum-icon"
              aria-hidden
            />
          )
        }
        onBack={onBack}
      >
        <button
          type="button"
          className="Button smaller translucent round"
          aria-label="Search this chat"
          title="Search this chat"
          onClick={() => setSearch((s) => (s === null ? "" : null))}
        >
          <i className="icon icon-search" aria-hidden />
        </button>
        <button
          type="button"
          className="Button smaller translucent round"
          aria-label="More actions"
          title="More actions"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <i className="icon icon-more" aria-hidden />
        </button>
      </MiddleHeader>

      {search !== null && (
        <div className="tg-chat-search">
          <div className="SearchInput tg-list-search" dir="ltr">
            <input
              type="text"
              dir="auto"
              placeholder="Search messages"
              className="form-control"
              value={search}
              autoFocus
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <button
            type="button"
            className="Button smaller translucent round"
            aria-label="Close search"
            title="Close search"
            onClick={() => setSearch(null)}
          >
            <i className="icon icon-close" aria-hidden />
          </button>
        </div>
      )}

      {pinnedMsg && search === null && (
        <button
          type="button"
          className="tg-pinned-banner"
          onClick={() => {
            document
              .querySelector(`[data-mid="${pinnedMsg.id}"]`)
              ?.scrollIntoView({ behavior: "smooth", block: "center" });
          }}
        >
          <span className="tg-pinned-bar" aria-hidden />
          <span className="tg-pinned-body">
            <span className="tg-pinned-label">Pinned message</span>
            <span className="tg-pinned-text">
              {pinnedMsg.body?.trim() || "Photo"}
            </span>
          </span>
          <IconPin />
        </button>
      )}

      {menuOpen && (
        <>
          <button
            type="button"
            className="tg-menu-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          />
          <div className="tg-menu" role="menu">
            {me && (
              <button
                type="button"
                className="tg-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  setShowNotif(true);
                }}
              >
                <IconBell />
                Notifications
              </button>
            )}
            {me?.admin && (
              <button
                type="button"
                className="tg-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  setShowAdmin(true);
                }}
              >
                <IconSettings />
                Admin panel
              </button>
            )}
            {me?.admin && state && (
              <button
                type="button"
                className="tg-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  void chat.toggleHideMembers();
                }}
              >
                <IconBell />
                {state.hideMembers ? "Show member count" : "Hide member count"}
              </button>
            )}
            <a
              className="tg-menu-item"
              href={ADMIN_TG}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
            >
              <IconChat />
              Message admin
            </a>
          </div>
        </>
      )}

      {showNotif && <NotificationSettings onClose={() => setShowNotif(false)} />}
      {showAdmin && me?.admin && <AdminPanel onClose={() => setShowAdmin(false)} />}

      {/* Fullscreen entry prompt — asked once per session on open. */}
      {fsPrompt && (
        <div
          className="tg-modal-backdrop tg-fs-backdrop"
          onClick={dismissFsPrompt}
        >
          <div
            className="tg-modal tg-fs-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Fullscreen"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tg-fs-title">
              <IconExpand />
              <h3>Fullscreen</h3>
            </div>
            <p className="tg-fs-text">
              Open the community in fullscreen for the full experience?
            </p>
            <div className="tg-fs-actions">
              <button
                type="button"
                className="tg-fs-btn"
                onClick={dismissFsPrompt}
              >
                Not now
              </button>
              <button
                type="button"
                className="tg-fs-btn is-primary"
                onClick={() => {
                  dismissFsPrompt();
                  chat.toggleFullscreen();
                }}
              >
                Fullscreen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Web A message context menu — Reply/Copy for members, moderation for
          admins. Admin items ride the slash-command pipeline (/pin /del /ban)
          so server-side auth + audit apply exactly as if typed. */}
      {ctxMenu && (
        <>
          <button
            type="button"
            className="tg-menu-backdrop"
            onClick={() => setCtxMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setCtxMenu(null);
            }}
            aria-label="Close menu"
          />
          <div
            className="tg-menu tg-ctx-menu"
            role="menu"
            style={{
              left: Math.max(
                8,
                Math.min(ctxMenu.x, window.innerWidth - 216),
              ),
              top: Math.max(
                8,
                Math.min(ctxMenu.y, window.innerHeight - 240),
              ),
            }}
          >
            <button
              type="button"
              className="tg-menu-item"
              onClick={() => {
                chat.setReplyTo({
                  id: ctxMenu.m.id,
                  authorName: ctxMenu.m.authorName,
                  body: ctxMenu.m.body,
                });
                setCtxMenu(null);
              }}
            >
              <IconReply />
              Reply
            </button>
            {ctxMenu.m.mediaId && (
              <button
                type="button"
                className="tg-menu-item"
                onClick={() => {
                  const id = ctxMenu.m.mediaId;
                  if (id) void copyImage(id);
                  setCtxMenu(null);
                }}
              >
                <IconCopy />
                Copy Image
              </button>
            )}
            {ctxMenu.m.body && (
              <button
                type="button"
                className="tg-menu-item"
                onClick={() => {
                  void navigator.clipboard
                    ?.writeText(ctxMenu.m.body)
                    .catch(() => undefined);
                  setCtxMenu(null);
                }}
              >
                <IconCopy />
                Copy Text
              </button>
            )}
            <button
              type="button"
              className="tg-menu-item"
              onClick={() => {
                copyMessageLink(ctxMenu.m);
                setCtxMenu(null);
              }}
            >
              <IconLink />
              Copy Message Link
            </button>
            {me?.admin && (
              <button
                type="button"
                className="tg-menu-item"
                onClick={() => {
                  void chat.sendCommand(
                    ctxMenu.m.pinned ? "/unpin" : "/pin",
                    ctxMenu.m.id,
                  );
                  setCtxMenu(null);
                }}
              >
                <IconPin />
                {ctxMenu.m.pinned ? "Unpin" : "Pin"}
              </button>
            )}
            {me?.admin && ctxMenu.m.mediaId && (
              <button
                type="button"
                className="tg-menu-item"
                onClick={() => {
                  const id = ctxMenu.m.mediaId;
                  if (id) downloadImage(id);
                  setCtxMenu(null);
                }}
              >
                <IconDownload />
                Download
              </button>
            )}
            <button
              type="button"
              className="tg-menu-item"
              onClick={() => {
                forwardMessage(ctxMenu.m);
                setCtxMenu(null);
              }}
            >
              <IconForward />
              Forward
            </button>
            {me?.admin && (
              <button
                type="button"
                className="tg-menu-item tg-menu-item-danger"
                onClick={() => {
                  void chat.sendCommand("/del", ctxMenu.m.id);
                  setCtxMenu(null);
                }}
              >
                <IconDelete />
                Delete
              </button>
            )}
            {me?.admin &&
              ctxMenu.m.tgId !== me.tid &&
              !ctxMenu.m.isAdmin && (
                <button
                  type="button"
                  className="tg-menu-item tg-menu-item-danger"
                  onClick={() => {
                    void chat.sendCommand("/ban", ctxMenu.m.id);
                    setCtxMenu(null);
                  }}
                >
                  <IconBan />
                  Ban User
                </button>
              )}
          </div>
        </>
      )}

      <div className="Transition">
        <div className="Transition_slide Transition_slide-active">
          <div
            ref={chat.scrollRef}
            onScroll={chat.onScroll}
            className="Transition MessageList custom-scroll with-default-bg"
            style={LIST_STYLE}
          >
            <div className="Transition_slide Transition_slide-active">
              <div
                className="messages-container"
                style={{
                  paddingTop: pinnedMsg && search === null ? 44 : undefined,
                  paddingBottom: composerPad,
                }}
              >
                <div className="backwards-trigger" />
                {state === null ? (
                  <div className="tg-loading">Loading chat…</div>
                ) : (
                  <>
                    {isGroupChat && state.welcome && !query && (
                      <div className="tg-service-card">
                        {renderBody(state.welcome)}
                      </div>
                    )}
                    {/* Read-only migrated history (vouch topics). */}
                    {typeof history === "function" ? history(query) : history}
                    {(isGroupChat || topic === "testimonials") && !query && (
                      <div className="sender-group-container sKXqbu2I">
                        <MessageBubble
                          own={false}
                          first
                          last
                          showAvatarGutter
                          sender={{
                            name: SEED_AUTHOR,
                            peer: peerIdx(SEED_AUTHOR),
                            admin: true,
                          }}
                          avatar={{
                            name: SEED_AUTHOR,
                            photo: SEED_AVATAR,
                            peer: peerIdx(SEED_AUTHOR),
                          }}
                          hasAppendix
                          pinned
                          body={CHAT_NOTICE_SEED_BODY}
                          time={CHAT_NOTICE_SEED_TIME}
                        />
                      </div>
                    )}
                    {groups.map((g, gi) => (
                      <div
                        key={g.key}
                        className={`message-date-group${
                          gi === 0 ? " first-message-date-group" : ""
                        }`}
                      >
                        <div className="sticky-date interactive">
                          <span dir="auto">{g.label}</span>
                        </div>
                        {g.runs.map((run) => (
                          <div
                            key={run[0].id}
                            className="sender-group-container sKXqbu2I"
                          >
                            {run.map((m, i) => {
                              const own = Boolean(me && m.tgId === me.tid);
                              const first = i === 0;
                              const last = i === run.length - 1;
                              const peer = peerIdx(m.authorName);
                              return (
                                <MessageBubble
                                  key={m.id}
                                  mid={m.id}
                                  own={own}
                                  first={first}
                                  last={last}
                                  showAvatarGutter
                                  sender={
                                    first
                                      ? {
                                          name: m.authorName,
                                          peer,
                                          admin: m.isAdmin,
                                        }
                                      : null
                                  }
                                  avatar={
                                    last
                                      ? {
                                          name: m.authorName,
                                          photo: m.authorPhoto,
                                          peer,
                                        }
                                      : null
                                  }
                                  hasAppendix={last}
                                  pinned={m.pinned}
                                  reply={m.reply}
                                  body={
                                    m.body ? renderBody(m.body) : undefined
                                  }
                                  media={
                                    m.mediaId
                                      ? [
                                          `/api/community/chat-media/${m.mediaId}`,
                                        ]
                                      : undefined
                                  }
                                  time={<LocalTime iso={m.createdAt} />}
                                  ticks={own}
                                  reactions={m.reactions}
                                  onReact={(emoji) =>
                                    void chat.react(m.id, emoji)
                                  }
                                  onOpenMedia={(src) => setLightbox(src)}
                                  onOpenMenu={(pos) =>
                                    setCtxMenu({ m, x: pos.x, y: pos.y })
                                  }
                                  actionsOpen={chat.reactOpen === m.id}
                                  actions={
                                    <>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          chat.setReplyTo({
                                            id: m.id,
                                            authorName: m.authorName,
                                            body: m.body,
                                          })
                                        }
                                        aria-label="Reply"
                                      >
                                        <IconReply />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() =>
                                          chat.setReactOpen(
                                            chat.reactOpen === m.id
                                              ? null
                                              : m.id,
                                          )
                                        }
                                        aria-label="Add reaction"
                                      >
                                        😊
                                      </button>
                                    </>
                                  }
                                  picker={
                                    chat.reactOpen === m.id ? (
                                      <div className="tg-reaction-picker">
                                        {REACTIONS.map((e) => (
                                          <button
                                            key={e}
                                            type="button"
                                            onClick={() =>
                                              void chat.react(m.id, e)
                                            }
                                          >
                                            {e}
                                          </button>
                                        ))}
                                      </div>
                                    ) : undefined
                                  }
                                />
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="middle-column-footer" ref={footerRef}>
        {chat.error && (
          <div className="tg-composer-alert is-error">
            <span>{chat.error}</span>
            <button
              type="button"
              onClick={() => chat.setError(null)}
              aria-label="Dismiss"
            >
              <IconClose />
            </button>
          </div>
        )}
        {chat.systemNote && (
          <div className="tg-composer-alert">
            <span>{chat.systemNote}</span>
            <button
              type="button"
              onClick={() => chat.setSystemNote(null)}
              aria-label="Dismiss"
            >
              <IconClose />
            </button>
          </div>
        )}

        {state !== null && me && (
          <div className="Composer shown mounted">
            {emojiOpen && (
              <EmojiPanel
                onPick={insertAtComposer}
                onClose={() => setEmojiOpen(false)}
              />
            )}
            <div className="composer-wrapper">
              <Appendix own={false} composer />
              {chat.replyTo && (
                <div className="tg-reply-bar">
                  <span className="tg-reply-embed">
                    <span className="tg-reply-sender">
                      Reply to {chat.replyTo.authorName || "message"}
                    </span>
                    <span className="tg-reply-text">
                      {chat.replyTo.body || "message"}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="tg-icon-btn"
                    onClick={() => chat.setReplyTo(null)}
                    aria-label="Cancel reply"
                  >
                    <IconClose />
                  </button>
                </div>
              )}
              {me.admin && chat.text.trim().startsWith("/") && (
                <p className="tg-composer-hint">
                  Command mode — try /help for the full list.
                </p>
              )}
              {chat.attachment && (
                <div className="tg-attach-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={chat.attachment.previewUrl}
                    alt="Attached image"
                  />
                  <span className="tg-attach-preview-label">
                    Photo attached — add a caption or hit send
                  </span>
                  <button
                    type="button"
                    className="tg-icon-btn"
                    onClick={() => chat.setAttachment(null)}
                    aria-label="Remove attachment"
                  >
                    <IconClose />
                  </button>
                </div>
              )}
              {me.admin && (
                <div className="tg-ttl-row">
                  <span>Auto-delete:</span>
                  <select
                    value={chat.ttlSeconds}
                    onChange={(e) => chat.setTtlSeconds(Number(e.target.value))}
                  >
                    <option value={0}>Keep</option>
                    <option value={3600}>1 hour</option>
                    <option value={86400}>1 day</option>
                    <option value={604800}>1 week</option>
                  </select>
                </div>
              )}
              <div className="message-input-wrapper">
                <button
                  type="button"
                  className="Button symbol-menu-button composer-action-button default translucent round"
                  aria-label="Choose an emoji"
                  title="Choose an emoji"
                  onClick={() => setEmojiOpen((v) => !v)}
                >
                  <i className="icon icon-smile" aria-hidden />
                </button>
                <div id="message-input-text">
                  <div className="custom-scroll input-scroller">
                    <div className="input-scroller-content">
                      <div
                        ref={inputRef}
                        id="editable-message-text"
                        className="form-control allow-selection"
                        contentEditable
                        suppressContentEditableWarning
                        role="textbox"
                        dir="auto"
                        tabIndex={0}
                        aria-label={`Message as ${me.name}`}
                        onInput={(e) => {
                          let v = e.currentTarget.innerText.replace(
                            /\u00A0/g,
                            " ",
                          );
                          if (v === "\n") v = "";
                          if (v.length > MAX_LEN) {
                            v = v.slice(0, MAX_LEN);
                            e.currentTarget.innerText = v;
                            const sel = window.getSelection();
                            sel?.selectAllChildren(e.currentTarget);
                            sel?.collapseToEnd();
                          }
                          chat.setText(v);
                        }}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !e.shiftKey &&
                            !e.nativeEvent.isComposing
                          ) {
                            e.preventDefault();
                            void chat.send();
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          // A pasted screenshot/photo becomes the pending
                          // attachment (Web A parity), text pastes as plain.
                          const items = Array.from(e.clipboardData.items);
                          const img = items.find((it) =>
                            it.type.startsWith("image/"),
                          );
                          if (img) {
                            const file = img.getAsFile();
                            if (file) {
                              void attachImage(file);
                              return;
                            }
                          }
                          const text = e.clipboardData.getData("text/plain");
                          document.execCommand("insertText", false, text);
                        }}
                      />
                      {!chat.text && (
                        <span className="placeholder-text" dir="auto">
                          Message
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="AttachMenu">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void attachImage(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    id="attach-menu-button"
                    type="button"
                    className="Button AttachMenu--button composer-action-button default translucent round"
                    aria-label="Add an attachment"
                    title="Add an attachment"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <i className="icon icon-attach" aria-hidden />
                  </button>
                </div>
              </div>
            </div>
            <button
              type="button"
              className="Button send main-button default secondary round click-allowed"
              aria-label="Send message"
              title="Send message"
              onClick={() => void chat.send()}
              disabled={
                chat.sending || (!chat.text.trim() && !chat.attachment)
              }
            >
              <i className="icon icon-send" aria-hidden />
            </button>
          </div>
        )}

        {state !== null && !me && (
          <div className="tg-composer-notice">
            {chat.inTelegram ? (
              <span>
                {chat.authError ??
                  "Sign-in didn't complete — close and reopen the mini app to try again."}
              </span>
            ) : (
              <>
                <span>
                  This chat is for Telegram members — open it in Telegram to
                  join the conversation.
                </span>
                {state.botUsername ? (
                  <a
                    className="tg-signin-btn"
                    href={`https://t.me/${state.botUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Telegram
                  </a>
                ) : (
                  <span>Chat access is being set up — check back shortly.</span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {lightbox && (
        <div
          className="tg-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="tg-lightbox-close"
            aria-label="Close photo"
            onClick={() => setLightbox(null)}
          >
            <IconClose />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Photo"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
