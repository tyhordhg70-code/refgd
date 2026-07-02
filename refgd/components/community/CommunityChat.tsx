"use client";

import { useMemo, useState } from "react";
import NotificationSettings from "./NotificationSettings";
import AdminPanel from "./AdminPanel";
import MiddleHeader from "./tg/MiddleHeader";
import MessageBubble from "./tg/MessageBubble";
import Appendix from "./tg/Appendix";
import {
  IconBell,
  IconChat,
  IconClose,
  IconCollapse,
  IconExpand,
  IconMore,
  IconReply,
  IconSend,
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

/**
 * The "Group Chat" forum topic, rendered as an exact Telegram Web A light
 * theme replica. All live behaviour (polling, sending, reactions, Mini App
 * sign-in, moderation) lives in useCommunityChat — this component is purely
 * presentational.
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

export default function CommunityChat({ onBack }: { onBack?: () => void }) {
  const chat = useCommunityChat();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [fsDismissed, setFsDismissed] = useState(false);

  const { state, me } = chat;
  const groups = useMemo(
    () => buildGroups(state?.messages ?? []),
    [state?.messages],
  );

  const subtitle =
    state === null
      ? "connecting…"
      : state.memberCount !== null
        ? `${state.memberCount} member${state.memberCount === 1 ? "" : "s"}`
        : "members hidden";

  return (
    <>
      <MiddleHeader title="Group Chat" subtitle={subtitle} onBack={onBack}>
        <button
          type="button"
          className="tg-icon-btn"
          onClick={() => setMenuOpen((v) => !v)}
          aria-label="More actions"
          aria-expanded={menuOpen}
        >
          <IconMore />
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
            {chat.canFullscreen && (
              <button
                type="button"
                className="tg-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  chat.toggleFullscreen();
                }}
              >
                {chat.isFullscreen ? <IconCollapse /> : <IconExpand />}
                {chat.isFullscreen ? "Exit fullscreen" : "Fullscreen"}
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

      {/* Fullscreen prompt — Mini App only, until entered or dismissed. */}
      {chat.canFullscreen && !chat.isFullscreen && !fsDismissed && (
        <div className="tg-banner">
          <span>Go fullscreen for the full experience.</span>
          <button
            type="button"
            className="tg-banner-cta"
            onClick={chat.toggleFullscreen}
          >
            Fullscreen
          </button>
          <button
            type="button"
            className="tg-banner-x"
            onClick={() => setFsDismissed(true)}
            aria-label="Dismiss"
          >
            <IconClose />
          </button>
        </div>
      )}

      <div className="tg-messages">
        <div
          ref={chat.scrollRef}
          onScroll={chat.onScroll}
          className="tg-messages-scroll tg-scroll"
        >
          <div className="tg-messages-inner">
            {state === null ? (
              <div className="tg-loading">Loading chat…</div>
            ) : (
              <>
                {state.welcome && (
                  <div className="tg-service-card">
                    {renderBody(state.welcome)}
                  </div>
                )}
                {state.messages.length === 0 && (
                  <div className="tg-action">No messages yet — say hello!</div>
                )}
                {groups.map((g) => (
                  <div key={g.key} className="tg-date-group">
                    <div className="tg-date is-sticky">{g.label}</div>
                    {g.runs.map((run) =>
                      run.map((m, i) => {
                        const own = Boolean(me && m.tgId === me.tid);
                        const first = i === 0;
                        const last = i === run.length - 1;
                        const peer = peerIdx(m.authorName);
                        return (
                          <MessageBubble
                            key={m.id}
                            own={own}
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
                            body={m.body ? renderBody(m.body) : undefined}
                            time={<LocalTime iso={m.createdAt} />}
                            ticks={own}
                            reactions={m.reactions}
                            onReact={(emoji) => void chat.react(m.id, emoji)}
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
                                        chat.reactOpen === m.id ? null : m.id,
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
                                      onClick={() => void chat.react(m.id, e)}
                                    >
                                      {e}
                                    </button>
                                  ))}
                                </div>
                              ) : undefined
                            }
                          />
                        );
                      }),
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="tg-composer-area">
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
          <div className="tg-composer">
            <div className="tg-input-wrap">
              <Appendix own={false} />
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
              <div className="tg-input-row">
                <textarea
                  className="tg-input"
                  value={chat.text}
                  onChange={(e) => chat.setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void chat.send();
                    }
                  }}
                  rows={1}
                  maxLength={2000}
                  placeholder="Message"
                  aria-label={`Message as ${me.name}`}
                />
              </div>
            </div>
            <button
              type="button"
              className="tg-send"
              onClick={() => void chat.send()}
              disabled={chat.sending || !chat.text.trim()}
              aria-label="Send message"
            >
              <IconSend />
            </button>
          </div>
        )}

        {state !== null && !me && (
          <div className="tg-composer-notice">
            {chat.inTelegram ? (
              <span>
                Sign-in didn&apos;t complete — close and reopen the mini app to
                try again.
              </span>
            ) : (
              <>
                <span>Join the conversation from the RefundGod mini app.</span>
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
