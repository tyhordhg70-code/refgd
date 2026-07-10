"use client";

import { useMemo } from "react";
import MessageBubble, { type BubbleReaction } from "./MessageBubble";
import type { VouchView } from "./types";
import {
  LocalTime,
  dateKey,
  dateKeyLocal,
  dateLabel,
  renderBody,
  useLocalDates,
} from "./format";

/**
 * Read-only vouch history (Client Testimonials, BUY4U Vouches, Announcements)
 * rendered as Telegram Web A date groups: sticky date pills per
 * .message-date-group and author runs in .sender-group-container (sender name
 * on the first bubble, avatar + appendix tail on the last). Rendered ABOVE the
 * live message feed inside CommunityChat, so members can post beneath the
 * migrated history exactly like the real group.
 */

interface DateGroup {
  key: string;
  label: string;
  runs: VouchView[][];
}

function buildGroups(vouches: VouchView[], localDates: boolean): DateGroup[] {
  const sorted = [...vouches].sort((a, b) => {
    const ta = a.originDate ?? a.createdAt;
    const tb = b.originDate ?? b.createdAt;
    if (ta !== tb) return ta < tb ? -1 : 1;
    return Number(a.id) - Number(b.id);
  });
  const todayYear = localDates
    ? new Date().getFullYear()
    : new Date().getUTCFullYear();
  const groups: DateGroup[] = [];
  for (const v of sorted) {
    const key = (localDates ? dateKeyLocal : dateKey)(
      v.originDate ?? v.createdAt,
    );
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: dateLabel(key, todayYear), runs: [] };
      groups.push(group);
    }
    const run = group.runs[group.runs.length - 1];
    if (run && run[run.length - 1].authorName === v.authorName) {
      run.push(v);
    } else {
      group.runs.push([v]);
    }
  }
  return groups;
}

export default function VouchHistory({
  vouches,
  onOpenMenu,
  onOpenMedia,
  reactionsFor,
  onReact,
  hideDates,
}: {
  vouches: VouchView[];
  /** Opens the reduced (Edit / Pin / Copy Text / Forward) context menu for a vouch. */
  onOpenMenu?: (
    pos: { x: number; y: number },
    payload: {
      id: string;
      text: string;
      pinned: boolean;
      media?: string[];
    },
  ) => void;
  /** Opens the fullscreen media viewer for a clicked photo or video. */
  onOpenMedia?: (
    src: string,
    meta?: { video?: boolean; poster?: string; duration?: number | null },
  ) => void;
  /**
   * Hide the per-day date pills entirely (no sticky date while scrolling) —
   * used for BUY4U Vouches, where every import lands on the same forward day
   * and a floating date adds nothing.
   */
  hideDates?: boolean;
  /** Live reaction chips for a vouch bubble (key `v<id>`). */
  reactionsFor?: (id: string) => BubbleReaction[];
  /** Toggle the viewer's reaction on a vouch bubble (key `v<id>`). */
  onReact?: (id: string, emoji: string) => void;
}) {
  const localDates = useLocalDates();
  const groups = useMemo(
    () => buildGroups(vouches, localDates),
    [vouches, localDates],
  );

  return (
    <>
      {groups.map((g, gi) => (
        <div
          key={g.key}
          className={`message-date-group${
            gi === 0 ? " first-message-date-group" : ""
          }`}
        >
          {!hideDates && (
            <div className="sticky-date interactive">
              <span dir="auto">{g.label}</span>
            </div>
          )}
          {g.runs.map((run) => (
            <div key={run[0].id} className="sender-group-container sKXqbu2I">
              {run.map((v, i) => {
                const first = i === 0;
                const last = i === run.length - 1;
                return (
                  <MessageBubble
                    key={v.id}
                    own
                    first={first}
                    last={last}
                    hasAppendix={last}
                    mid={`v${v.id}`}
                    pinned={v.pinned}
                    media={v.mediaIds.map(
                      (id) => `/api/community/media/${id}`,
                    )}
                    mediaSizes={v.mediaDims}
                    mediaMeta={v.mediaMeta?.map((m) =>
                      m && m.kind === "video"
                        ? {
                            kind: "video" as const,
                            poster: m.posterId
                              ? `/api/community/media/${m.posterId}`
                              : undefined,
                            duration: m.duration,
                          }
                        : null,
                    )}
                    body={v.body ? renderBody(v.body) : undefined}
                    time={<LocalTime iso={v.originDate ?? v.createdAt} />}
                    reactions={reactionsFor?.(`v${v.id}`)}
                    onReact={
                      onReact ? (e) => onReact(`v${v.id}`, e) : undefined
                    }
                    onOpenMenu={
                      onOpenMenu
                        ? (pos) =>
                            onOpenMenu(pos, {
                              id: v.id,
                              text: v.body ?? "",
                              pinned: v.pinned,
                              media: v.mediaIds,
                            })
                        : undefined
                    }
                    onOpenMedia={onOpenMedia}
                  />
                );
              })}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}
