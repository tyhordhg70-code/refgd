"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import Appendix from "./Appendix";
import { emojiSrc, initials, peerIdx } from "./format";

/** Autoplay a member's animated (mp4/webm) avatar reliably. React does not emit
 * the `muted` attribute during SSR, which can block autoplay until hydration; a
 * stable callback ref forces muted + play() on mount. */
function playAvatarVideo(el: HTMLVideoElement | null) {
  if (!el) return;
  el.muted = true;
  const p = el.play();
  if (p && typeof p.catch === "function") p.catch(() => {});
}

/**
 * A single Telegram Web A message row emitting the exact saved DOM:
 * .Message.message-list-item with grouping classes, the absolute-positioned
 * .Avatar in the gutter (incoming, last-in-group), .message-content-wrapper >
 * .message-content with .content-inner (title / reply / media / .text-content
 * with the floated .MessageMeta) and the verbatim .svg-appendix tail on
 * group-closing bubbles. Reaction pills keep the replica's tg-* chrome inside
 * the real structure; all message actions live in the context menu.
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
  onReplyClick,
  onOpenMenu,
  onOpenMedia,
  mid,
  edited,
  forward,
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
  reply?: { id?: string; authorName: string; body: string } | null;
  media?: string[];
  body?: ReactNode;
  time?: ReactNode;
  ticks?: boolean;
  reactions?: BubbleReaction[];
  onReact?: (emoji: string) => void;
  /** Jump to the quoted message when its reply preview is tapped. */
  onReplyClick?: (id: string) => void;
  /**
   * Opens the Web A message context menu at the given viewport point.
   * Wired to right-click on desktop and a ~450ms long-press on touch.
   */
  onOpenMenu?: (pos: { x: number; y: number }) => void;
  /** Opens the fullscreen media viewer for a clicked photo. */
  onOpenMedia?: (src: string) => void;
  mid?: string;
  /** Shows the Web A "edited" marker before the timestamp. */
  edited?: boolean;
  /**
   * When set, renders a Telegram Web A "Forwarded from <name>" title banner
   * (share icon + label + colored micro-avatar + origin name) above the body.
   */
  forward?: { name: string } | null;
}) {
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  // Set true when a long-press has opened the context menu, so the synthetic
  // click that follows touchend does not ALSO fire (e.g. open the photo).
  const menuFired = useRef(false);
  const clearPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  const mediaList = media ?? [];
  const hasBody = Boolean(body);
  const hasReactions = Boolean(reactions && reactions.length > 0);
  const mediaFlush = mediaList.length > 0 && !sender && !reply && !forward;
  const mediaOnly = mediaList.length > 0 && !hasBody && !hasReactions;
  const isFirst = first ?? Boolean(sender) ?? true;
  const isLast = last ?? hasAppendix;
  const showAvatar = !own && Boolean(showAvatarGutter) && Boolean(avatar);
  // Telegram animated profile photos are short MP4/WEBM clips; play them as
  // muted looping video so member avatars animate like the real client.
  // (GIF/APNG animate natively inside <img>, so they stay on the image path.)
  const avatarIsVideo =
    !!avatar?.photo && /\.(mp4|webm|mov|m4v)(\?|#|$)/i.test(avatar.photo);

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
        <span className="message-time">
          {edited && <span className="tg-edited">edited</span>}
          {time}
        </span>
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
    <div
      className={rootCls}
      data-mid={mid}
      onContextMenu={
        onOpenMenu
          ? (e) => {
              e.preventDefault();
              onOpenMenu({ x: e.clientX, y: e.clientY });
            }
          : undefined
      }
      onTouchStart={
        onOpenMenu
          ? (e) => {
              const t = e.touches[0];
              if (!t) return;
              const pos = { x: t.clientX, y: t.clientY };
              pressStart.current = pos;
              menuFired.current = false;
              clearPress();
              pressTimer.current = window.setTimeout(() => {
                menuFired.current = true;
                onOpenMenu(pos);
              }, 450);
            }
          : undefined
      }
      onTouchMove={
        onOpenMenu
          ? (e) => {
              const t = e.touches[0];
              const s = pressStart.current;
              // Only cancel the long-press on a real drag (>10px) so a tiny
              // finger wobble no longer eats the menu on others' messages.
              if (t && s && Math.hypot(t.clientX - s.x, t.clientY - s.y) > 10)
                clearPress();
            }
          : undefined
      }
      onTouchEnd={onOpenMenu ? clearPress : undefined}
      onTouchCancel={onOpenMenu ? clearPress : undefined}
    >
      {showAvatar && avatar && (
        <div
          className={`Avatar size-small no-photo tg-bg-peer-${avatar.peer}`}
          style={AVATAR_SIZE}
          aria-hidden
        >
          <div className="inner">
            {avatar.photo ? (
              avatarIsVideo ? (
                <video
                  ref={playAvatarVideo}
                  src={avatar.photo}
                  className="avatar-media"
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatar.photo}
                  className="avatar-media"
                  alt=""
                  loading="lazy"
                />
              )
            ) : (
              <span className="letters">{initials(avatar.name)}</span>
            )}
          </div>
        </div>
      )}

      <div className="message-content-wrapper can-select-text">
        <div className={contentCls} dir="auto">
          <div className="content-inner" dir="auto">
            {forward && (
              <div className="message-title tg-forward-title" dir="ltr">
                <span
                  className="message-title-name-container interactive"
                  dir="ltr"
                >
                  <span className="forward-title-container">
                    <i className="icon icon-share-filled" aria-hidden="true" />
                    <span className="forward-title">Forwarded from</span>
                  </span>
                  <span className="message-title-name">
                    <div
                      className={`Avatar forward-avatar size-micro no-photo tg-bg-peer-${peerIdx(
                        forward.name,
                      )}`}
                      aria-hidden
                    >
                      <div className="inner">
                        <span className="letters">
                          {initials(forward.name)}
                        </span>
                      </div>
                    </div>
                    <span
                      className={`sender-title tg-peer-${peerIdx(forward.name)}`}
                    >
                      {forward.name}
                    </span>
                  </span>
                </span>
                <div className="title-spacer" />
                <span className="message-title-meta" />
              </div>
            )}
            {sender && !own && !forward && (
              <div className="message-title" dir="ltr">
                <span className="message-title-name-container">
                  <span
                    className={`message-title-name interactive tg-peer-${sender.peer}`}
                  >
                    {sender.name}
                  </span>
                </span>
                {sender.admin && (
                  <span className="admin-title-badge" dir="auto">
                    Admin
                  </span>
                )}
              </div>
            )}

            {reply &&
              (reply.id && onReplyClick ? (
                <button
                  type="button"
                  className="tg-reply-embed"
                  onClick={() => onReplyClick(reply.id!)}
                >
                  <span className="tg-reply-sender">
                    {reply.authorName || "message"}
                  </span>
                  <span className="tg-reply-text">
                    {reply.body || "message"}
                  </span>
                </button>
              ) : (
                <span className="tg-reply-embed">
                  <span className="tg-reply-sender">
                    {reply.authorName || "message"}
                  </span>
                  <span className="tg-reply-text">
                    {reply.body || "message"}
                  </span>
                </span>
              ))}

            {mediaList.length > 0 && (
              <div className={`tg-media${mediaFlush ? "" : " is-inset"}`}>
                {mediaList.map((src) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={src}
                    src={src}
                    alt=""
                    loading="lazy"
                    className={onOpenMedia ? "tg-media-clickable" : undefined}
                    onClick={
                      onOpenMedia
                        ? () => {
                            // Long-press opened the menu → swallow the
                            // follow-up synthetic click so the lightbox does
                            // not also open on top of it.
                            if (menuFired.current) {
                              menuFired.current = false;
                              return;
                            }
                            onOpenMedia(src);
                          }
                        : undefined
                    }
                  />
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
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={emojiSrc(r.emoji)}
                      className="emoji emoji-small tg-reaction-emoji"
                      alt={r.emoji}
                      draggable={false}
                      loading="lazy"
                    />
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
    </div>
  );
}
