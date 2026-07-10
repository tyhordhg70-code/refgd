"use client";

import { useRef, useState, type CSSProperties, type ReactNode } from "react";
import Appendix from "./Appendix";
import { emojiSrc, initials } from "./format";
import { fmtDuration } from "./VideoPlayer";

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
  /** true → the reserved bot member (Rose); renders a "bot" tag by the name. */
  bot?: boolean;
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
  mediaSize,
  mediaSizes,
  mediaMeta,
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
  plain,
  onDoubleTap,
  onSwipeReply,
  selectMode,
  selected,
  onToggleSelect,
  appearCls,
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
  /**
   * Intrinsic pixel size of the (single) attached photo — lets the bubble
   * reserve the final layout box before the image bytes arrive, so the text
   * and the image "load at once" instead of the image popping in later.
   */
  mediaSize?: { w: number; h: number };
  /** Per-image intrinsic sizes aligned with `media`; overrides mediaSize. */
  mediaSizes?: ({ w: number; h: number } | null)[];
  /**
   * Per-media kind info aligned with `media`; entries with kind "video"
   * render as a poster frame + play badge (the mp4 itself is only fetched
   * when the viewer opens) instead of a plain photo.
   */
  mediaMeta?: ({
    kind: "photo" | "video";
    /** Poster frame URL shown in the bubble. */
    poster?: string;
    /** Clip length in seconds for the duration badge. */
    duration?: number | null;
  } | null)[];
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
  /** Opens the fullscreen media viewer for a clicked photo or video. */
  onOpenMedia?: (
    src: string,
    meta?: { video?: boolean; poster?: string; duration?: number | null },
  ) => void;
  mid?: string;
  /** Shows the Web A "edited" marker before the timestamp. */
  edited?: boolean;
  /**
   * When set, renders a Telegram Web A "Forwarded from <name>" title banner
   * (share icon + label + colored micro-avatar + origin name) above the body.
   */
  forward?: { name: string } | null;
  /**
   * Renders the bubble without the solid background/shadow chrome — used for
   * the jumbo single-custom-emoji "sticker" presentation.
   */
  plain?: boolean;
  /** Double-click / double-tap quick reaction (Web A ❤️ parity). */
  onDoubleTap?: () => void;
  /** Swipe-right-to-reply on touch devices. */
  onSwipeReply?: () => void;
  /** Multi-select mode: taps toggle selection instead of normal actions. */
  selectMode?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
  /**
   * One-shot entrance animation class (tg-msg-new-own / tg-msg-new-in) for
   * messages appended after the initial load. Kept on the node afterwards —
   * the CSS animation only runs on insertion.
   */
  appearCls?: string;
}) {
  const pressTimer = useRef<number | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  // Set true when a long-press has opened the context menu, so the synthetic
  // click that follows touchend does not ALSO fire (e.g. open the photo).
  const menuFired = useRef(false);
  // Swipe-to-reply drag offset (touch only); the bubble follows the finger up
  // to 72px and releases into a reply past the 56px threshold.
  const [dragX, setDragX] = useState(0);
  const dragXRef = useRef(0);
  const swiping = useRef(false);
  // Timestamp of the previous touchend for double-tap detection.
  const lastTap = useRef(0);
  const clearPress = () => {
    if (pressTimer.current !== null) {
      window.clearTimeout(pressTimer.current);
      pressTimer.current = null;
    }
  };
  const setDrag = (v: number) => {
    dragXRef.current = v;
    setDragX(v);
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
    selectMode ? "is-select-mode" : "",
    selectMode && selected ? "is-selected" : "",
    appearCls ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  const contentCls = [
    "message-content",
    "peer-color-count-2",
    // Web A sizes the "Forwarded from" icon/title via .is-forwarded rules.
    forward ? "is-forwarded" : "",
    hasBody || hasReactions ? "text" : "",
    plain ? "" : "has-shadow",
    plain ? "" : "has-solid-background",
    plain ? "tg-plain-content" : "",
    plain && hasAppendix ? "" : hasAppendix ? "has-appendix" : "",
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
      onClickCapture={
        selectMode && onToggleSelect
          ? (e) => {
              e.preventDefault();
              e.stopPropagation();
              onToggleSelect();
            }
          : undefined
      }
      onDoubleClick={
        !selectMode && onDoubleTap ? () => onDoubleTap() : undefined
      }
      onContextMenu={
        onOpenMenu
          ? (e) => {
              e.preventDefault();
              if (selectMode) return;
              onOpenMenu({ x: e.clientX, y: e.clientY });
            }
          : undefined
      }
      onTouchStart={
        onOpenMenu || onSwipeReply || onDoubleTap
          ? (e) => {
              const t = e.touches[0];
              if (!t) return;
              const pos = { x: t.clientX, y: t.clientY };
              pressStart.current = pos;
              menuFired.current = false;
              swiping.current = false;
              clearPress();
              if (onOpenMenu && !selectMode) {
                pressTimer.current = window.setTimeout(() => {
                  menuFired.current = true;
                  onOpenMenu(pos);
                }, 450);
              }
            }
          : undefined
      }
      onTouchMove={
        onOpenMenu || onSwipeReply
          ? (e) => {
              const t = e.touches[0];
              const s = pressStart.current;
              if (!t || !s) return;
              const dx = t.clientX - s.x;
              const dy = t.clientY - s.y;
              // Only cancel the long-press on a real drag (>10px) so a tiny
              // finger wobble no longer eats the menu on others' messages.
              if (Math.hypot(dx, dy) > 10) clearPress();
              if (!onSwipeReply || selectMode || menuFired.current) return;
              // Touches starting at the left screen edge belong to the
              // swipe-back-to-topic-list gesture (TelegramApp); don't turn
              // them into a swipe-to-reply.
              if (s.x < 28) return;
              // Horizontal rightward drag becomes a swipe-to-reply; the
              // bubble follows the finger up to 72px.
              if (!swiping.current && dx > 12 && Math.abs(dy) < 30)
                swiping.current = true;
              if (swiping.current)
                setDrag(Math.max(0, Math.min(72, dx - 12)));
            }
          : undefined
      }
      onTouchEnd={
        onOpenMenu || onSwipeReply || onDoubleTap
          ? () => {
              clearPress();
              if (swiping.current) {
                if (dragXRef.current > 56 && onSwipeReply) onSwipeReply();
                swiping.current = false;
                setDrag(0);
                lastTap.current = 0;
                return;
              }
              if (
                onDoubleTap &&
                !selectMode &&
                !menuFired.current
              ) {
                const now = Date.now();
                if (now - lastTap.current < 300) {
                  lastTap.current = 0;
                  onDoubleTap();
                } else {
                  lastTap.current = now;
                }
              }
            }
          : undefined
      }
      onTouchCancel={
        onOpenMenu || onSwipeReply
          ? () => {
              clearPress();
              swiping.current = false;
              setDrag(0);
            }
          : undefined
      }
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

      {selectMode && (
        <div className="message-select-control" aria-hidden>
          {selected && (
            <i className="icon icon-select message-select-control-icon" />
          )}
        </div>
      )}
      <div
        className="message-content-wrapper can-select-text"
        style={
          dragX > 0
            ? {
                transform: `translateX(${dragX}px)`,
                transition: swiping.current ? "none" : "transform 0.15s ease",
              }
            : undefined
        }
      >
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
                    {/* No avatar: Web A only shows the tiny circle when a real
                        photo exists — the letter-avatar fallback painted the
                        origin's first char (often "@") as a stray glyph.
                        Leading @ is stripped (usernames never shown in UI). */}
                    <span className="sender-title">
                      {forward.name.replace(/^@+\s*/, "") || forward.name}
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
                {sender.bot && (
                  <span className="bot-title-badge" dir="auto">
                    bot
                  </span>
                )}
                {sender.admin && !sender.bot && (
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
                {mediaList.map((src, mi) => {
                  const meta = mediaMeta?.[mi];
                  const size = mediaSizes?.[mi] ?? mediaSize;
                  if (meta && meta.kind === "video") {
                    // Video: poster frame + centered play badge + duration
                    // pill. The clip's bytes are only requested once the
                    // viewer opens — scrolling past costs a thumbnail.
                    return (
                      <div
                        key={src}
                        className={`tg-media-video${
                          onOpenMedia ? " tg-media-clickable" : ""
                        }`}
                        role={onOpenMedia ? "button" : undefined}
                        onClick={
                          onOpenMedia
                            ? () => {
                                if (menuFired.current) {
                                  menuFired.current = false;
                                  return;
                                }
                                onOpenMedia(src, {
                                  video: true,
                                  poster: meta.poster,
                                  duration: meta.duration,
                                });
                              }
                            : undefined
                        }
                      >
                        {meta.poster ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={meta.poster}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            width={size?.w}
                            height={size?.h}
                          />
                        ) : (
                          <span
                            className="tg-media-video-blank"
                            style={
                              size
                                ? { aspectRatio: `${size.w} / ${size.h}` }
                                : undefined
                            }
                          />
                        )}
                        <span className="tg-media-video-play" aria-hidden>
                          <i className="icon icon-play" />
                        </span>
                        <span className="tg-media-video-duration">
                          {fmtDuration(meta.duration)}
                        </span>
                      </div>
                    );
                  }
                  return (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      key={src}
                      src={src}
                      alt=""
                      loading="lazy"
                      decoding="async"
                      width={size?.w}
                      height={size?.h}
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
                  );
                })}
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
