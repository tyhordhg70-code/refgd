"use client";

import type { CSSProperties, ReactNode } from "react";
import Appendix from "./Appendix";
import { initials } from "./format";

/**
 * A single Telegram Web A message row emitting the exact saved DOM:
 * .Message.message-list-item with grouping classes, the absolute-positioned
 * .Avatar in the gutter (incoming, last-in-group), .message-content-wrapper >
 * .message-content with .content-inner (title / reply / media / .text-content
 * with the floated .MessageMeta) and the verbatim .svg-appendix tail on
 * group-closing bubbles. Reactions, hover actions and the picker keep the
 * replica's tg-* chrome inside the real structure.
 */

export interface BubbleReaction {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface BubbleSender {
  name: string;
  peer: number;
  admin?: boolean;
}

const AVATAR_SIZE = { "--_size": "2.125rem" } as CSSProperties;

export default function MessageBubble({
  own,
  first,
  last,
  sender,
  avatar,
  showAvatarGutter,
  hasAppendix,
  pinned,
  reply,
  media,
  body,
  time,
  ticks,
  reactions,
  onReact,
  actions,
  picker,
  actionsOpen,
}: {
  own: boolean;
  /** First message of its author run (adds first-in-group). */
  first?: boolean;
  /** Last message of its author run (adds last-in-group). */
  last?: boolean;
  /** Shown inside the bubble on the first message of an incoming group. */
  sender?: BubbleSender | null;
  /** Shown in the gutter on the last message of an incoming group. */
  avatar?: { name: string; photo: string | null; peer: number } | null;
  /** Whether the row reserves an avatar gutter at all (incoming groups). */
  showAvatarGutter?: boolean;
  hasAppendix: boolean;
  pinned?: boolean;
  reply?: { authorName: string; body: string } | null;
  media?: string[];
  body?: ReactNode;
  time?: ReactNode;
  ticks?: boolean;
  reactions?: BubbleReaction[];
  onReact?: (emoji: string) => void;
  /** Hover action buttons (reply / add reaction / moderation). */
  actions?: ReactNode;
  /** Reaction picker popover, rendered when open. */
  picker?: ReactNode;
  actionsOpen?: boolean;
}) {
  const mediaList = media ?? [];
  const hasBody = Boolean(body);
  const hasReactions = Boolean(reactions && reactions.length > 0);
  const mediaFlush = mediaList.length > 0 && !sender && !reply;
  const mediaOnly = mediaList.length > 0 && !hasBody && !hasReactions;
  const isFirst = first ?? Boolean(sender) ?? true;
  const isLast = last ?? hasAppendix;
  const showAvatar = !own && Boolean(showAvatarGutter) && Boolean(avatar);

  const rootCls = [
    "Message",
    "message-list-item",
    isFirst ? "first-in-group" : "",
    "allow-selection",
    isLast ? "last-in-group" : "",
    own ? "own" : "",
    showAvatar ? "has-avatar" : "",
    "shown",
    "open",
    actionsOpen ? "is-actions-open" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const contentCls = [
    "message-content",
    "peer-color-count-2",
    hasBody || hasReactions ? "text" : "",
    "has-shadow",
    "has-solid-background",
    hasAppendix ? "has-appendix" : "",
    hasBody ? "has-footer" : "",
    mediaOnly ? "is-media-only" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const meta =
    time !== undefined ? (
      <span className="MessageMeta" dir="ltr">
        {pinned && (
          <i
            className="icon icon-pinned-message message-pinned"
            aria-label="Pinned"
          />
        )}
        <span className="message-time">{time}</span>
        {own && ticks && (
          <div className="MessageOutgoingStatus">
            <div className="Transition">
              <div className="Transition_slide Transition_slide-active">
                <i className="icon icon-message-succeeded" aria-hidden />
              </div>
            </div>
          </div>
        )}
      </span>
    ) : null;

  return (
    <div className={rootCls}>
      {showAvatar && avatar && (
        <div
          className={`Avatar size-small no-photo tg-bg-peer-${avatar.peer}`}
          style={AVATAR_SIZE}
          aria-hidden
        >
          <div className="inner">
            {avatar.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={avatar.photo}
                className="avatar-media"
                alt=""
                loading="lazy"
              />
            ) : (
              <span className="letters">{initials(avatar.name)}</span>
            )}
          </div>
        </div>
      )}

      <div className="message-content-wrapper can-select-text">
        <div className={contentCls} dir="auto">
          <div className="content-inner" dir="auto">
            {sender && !own && (
              <div className="message-title" dir="ltr">
                <span className="message-title-name-container">
                  <span
                    className={`message-title-name interactive tg-peer-${sender.peer}`}
                  >
                    {sender.name}
                  </span>
                  {sender.admin && (
                    <span className="admin-title" dir="auto">
                      admin
                    </span>
                  )}
                </span>
              </div>
            )}

            {reply && (
              <span className="tg-reply-embed">
                <span className="tg-reply-sender">
                  {reply.authorName || "message"}
                </span>
                <span className="tg-reply-text">{reply.body || "message"}</span>
              </span>
            )}

            {mediaList.length > 0 && (
              <div className={`tg-media${mediaFlush ? "" : " is-inset"}`}>
                {mediaList.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={src} src={src} alt="" loading="lazy" />
                ))}
              </div>
            )}

            {hasBody && (
              <div
                className={`text-content clearfix with-meta${
                  own ? " with-outgoing-icon" : ""
                }`}
                dir="auto"
              >
                {body}
                {!hasReactions && meta}
              </div>
            )}

            {!hasBody && !hasReactions && meta && (
              <div className="text-content clearfix with-meta" dir="auto">
                {meta}
              </div>
            )}

            {hasReactions && (
              <div className="tg-reactions">
                {(reactions ?? []).map((r) => (
                  <button
                    key={r.emoji}
                    type="button"
                    className={`tg-reaction${r.mine ? " is-chosen" : ""}`}
                    onClick={onReact ? () => onReact(r.emoji) : undefined}
                  >
                    <span>{r.emoji}</span>
                    <span>{r.count}</span>
                  </button>
                ))}
                {meta}
              </div>
            )}
          </div>
          {hasAppendix && <Appendix own={own} />}
        </div>
      </div>

      {actions && <div className="tg-msg-actions">{actions}</div>}
      {picker}
    </div>
  );
}
