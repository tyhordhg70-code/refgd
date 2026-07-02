"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import NotificationSettings from "./NotificationSettings";
import AdminPanel from "./AdminPanel";
import MiddleHeader from "./tg/MiddleHeader";
import MessageBubble from "./tg/MessageBubble";
import Appendix from "./tg/Appendix";
import {
  IconBell,
  IconChat,
  IconClose,
  IconExpand,
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
  useCommunityChat,
  type ChatMessage,
} from "./useCommunityChat";
import {
  CHAT_MIGRATED_SEED,
  CHAT_NOTICE_SEED_BODY,
  CHAT_NOTICE_SEED_TIME,
  SEED_AUTHOR,
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

export default function CommunityChat({ onBack }: { onBack?: () => void }) {
  const chat = useCommunityChat();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [fsPrompt, setFsPrompt] = useState(false);
  const inputRef = useRef<HTMLDivElement>(null);

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
  const groups = useMemo(
    () => buildGroups(state?.messages ?? []),
    [state?.messages],
  );

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
        title="Group Chat"
        subtitle={subtitle}
        icon={
          <i
            className="icon icon-hashtag I0-98vJl P6JY5GgC general-forum-icon"
            aria-hidden
          />
        }
        onBack={onBack}
      >
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
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <i className="icon icon-more" aria-hidden />
        </button>
      </MiddleHeader>

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

      <div className="Transition">
        <div className="Transition_slide Transition_slide-active">
          <div
            ref={chat.scrollRef}
            onScroll={chat.onScroll}
            className="Transition MessageList custom-scroll with-default-bg"
            style={LIST_STYLE}
          >
            <div className="Transition_slide Transition_slide-active">
              <div className="messages-container" style={{ paddingBottom: 76 }}>
                <div className="backwards-trigger" />
                {state === null ? (
                  <div className="tg-loading">Loading chat…</div>
                ) : (
                  <>
                    {state.welcome && (
                      <div className="tg-service-card">
                        {renderBody(state.welcome)}
                      </div>
                    )}
                    {/* History seeded from the real group's saved pages. */}
                    {CHAT_MIGRATED_SEED}
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
                          photo: null,
                          peer: peerIdx(SEED_AUTHOR),
                        }}
                        hasAppendix
                        pinned
                        body={CHAT_NOTICE_SEED_BODY}
                        time={CHAT_NOTICE_SEED_TIME}
                      />
                    </div>
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
                                  time={<LocalTime iso={m.createdAt} />}
                                  ticks={own}
                                  reactions={m.reactions}
                                  onReact={(emoji) =>
                                    void chat.react(m.id, emoji)
                                  }
                                  actionsOpen={chat.reactOpen === m.id}
                                  actions={
                                    me ? (
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
                                    ) : undefined
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

      <div className="middle-column-footer">
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
                  <button
                    id="attach-menu-button"
                    type="button"
                    className="Button AttachMenu--button composer-action-button default translucent round"
                    aria-label="Add an attachment"
                    title="Add an attachment"
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
              disabled={chat.sending || !chat.text.trim()}
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
    </>
  );
}
