"use client";

import type { ReactNode } from "react";
import Appendix from "./Appendix";
import { IconChecks } from "./TgIcons";
import { initials } from "./format";

/**
 * A single Telegram Web A message row: optional avatar gutter (incoming,
 * last-in-group), the bubble (sender name, reply embed, media, text, floated
 * time meta, reactions) and the exact appendix tail on group-closing bubbles.
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

export default function MessageBubble({
  own,
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

  const meta = time !== undefined && (
    <span className="tg-meta">
      {pinned && (
        <span className="tg-pin-flag" aria-label="Pinned">
          📌
        </span>
      )}
      {time}
      {ticks && (
        <span className="tg-ticks" aria-label="Delivered">
          <IconChecks />
        </span>
      )}
    </span>
  );

  return (
    <div
      className={`tg-msg${own ? " own" : ""}${
        actionsOpen ? " is-actions-open" : ""
      }`}
    >
      {!own && showAvatarGutter && (
        <div
          className={
            avatar
              ? `tg-msg-avatar tg-bg-peer-${avatar.peer}`
              : "tg-msg-avatar is-spacer"
          }
          aria-hidden
        >
          {avatar &&
            (avatar.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar.photo} alt="" loading="lazy" />
            ) : (
              initials(avatar.name)
            ))}
        </div>
      )}

      <div
        className={`tg-bubble${hasAppendix ? " has-appendix" : ""}${
          mediaOnly ? " is-media-only" : ""
        }`}
      >
        {hasAppendix && <Appendix own={own} />}

        {sender && !own && (
          <span className={`tg-sender tg-peer-${sender.peer}`}>
            {sender.name}
            {sender.admin && <span className="tg-admin-tag">admin</span>}
          </span>
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
          <div className="tg-text">
            {body}
            {!hasReactions && meta}
          </div>
        )}

        {!hasBody && !hasReactions && meta && (
          <div className="tg-meta-row">{meta}</div>
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

      {actions && <div className="tg-msg-actions">{actions}</div>}
      {picker}
    </div>
  );
}
