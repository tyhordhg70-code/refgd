"use client";

import { useMemo } from "react";
import MessageBubble, { type BubbleReaction } from "./MessageBubble";
import VoiceMessage from "./VoiceMessage";
import type { VouchView } from "./types";
import {
  LocalTime,
  dateKey,
  dateKeyLocal,
  dateLabel,
  renderBody,
  timelineOrder,
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
  orderAt: string;
  showDate: boolean;
}

function buildGroups(
  vouches: VouchView[],
  localDates: boolean,
  splitRuns: boolean,
): DateGroup[] {
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
      group = {
        key,
        label: dateLabel(key, todayYear),
        runs: [],
        orderAt: v.originDate ?? v.createdAt,
        showDate: true,
      };
      groups.push(group);
    }
    const run = group.runs[group.runs.length - 1];
    if (run && run[run.length - 1].authorName === v.authorName) {
      run.push(v);
    } else {
      group.runs.push([v]);
    }
  }
  if (!splitRuns) return groups;
  return groups.flatMap((group) =>
    group.runs.map((run, i) => ({
      key: `${group.key}:${run[0].id}`,
      label: group.label,
      runs: [run],
      orderAt: run[0].originDate ?? run[0].createdAt,
      showDate: i === 0,
    })),
  );
}

export default function VouchHistory({
  vouches,
  onOpenMenu,
  onOpenMedia,
  reactionsFor,
  onReact,
  hideDates,
  chronological = false,
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
  /** Merge these runs chronologically with sibling live-message runs. */
  chronological?: boolean;
}) {
  const localDates = useLocalDates();
  const groups = useMemo(
    () => buildGroups(vouches, localDates, chronological),
    [vouches, localDates, chronological],
  );

  return (
    <>
      {groups.map((g, gi) => (
        <div
          key={g.key}
          className={`message-date-group${
            gi === 0 ? " first-message-date-group" : ""
          }`}
          style={
            chronological ? { order: timelineOrder(g.orderAt) } : undefined
          }
        >
          {!hideDates && g.showDate && (
            <div className="sticky-date interactive">
              <span dir="auto">{g.label}</span>
            </div>
          )}
          {g.runs.map((run) => (
            <div key={run[0].id} className="sender-group-container sKXqbu2I">
              {run.map((v, i) => {
                const first = i === 0;
                const last = i === run.length - 1;
                // A voice note is the bubble's BODY (player + waveform), not
                // a media tile — so it is pulled out of the media list and
                // the remaining attachments keep their aligned dims/meta.
                const voiceIdx =
                  v.mediaMeta?.findIndex((m) => m?.kind === "voice") ?? -1;
                const voice =
                  voiceIdx >= 0
                    ? {
                        id: v.mediaIds[voiceIdx],
                        duration: v.mediaMeta?.[voiceIdx]?.duration ?? 0,
                      }
                    : null;
                const tiles = v.mediaIds
                  .map((id, mi) => ({ id, mi }))
                  .filter(({ mi }) => mi !== voiceIdx);
                const caption = v.body ? renderBody(v.body) : null;
                return (
                  <MessageBubble
                    key={v.id}
                    own
                    first={first}
                    last={last}
                    hasAppendix={last}
                    mid={`v${v.id}`}
                    pinned={v.pinned}
                    media={tiles.map(
                      ({ id }) => `/api/community/media/${id}`,
                    )}
                    mediaSizes={tiles.map(
                      ({ mi }) => v.mediaDims?.[mi] ?? null,
                    )}
                    mediaMeta={tiles.map(({ mi }) => {
                      const m = v.mediaMeta?.[mi];
                      if (m?.kind === "video") {
                        return {
                          kind: "video" as const,
                          poster: m.posterId
                            ? `/api/community/media/${m.posterId}`
                            : undefined,
                          duration: m.duration,
                        };
                      }
                      if (m?.kind === "file") {
                        return {
                          kind: "file" as const,
                          name: m.name ?? null,
                          size: m.size ?? null,
                        };
                      }
                      return null;
                    })}
                    body={
                      voice ? (
                        <>
                          <VoiceMessage
                            src={`/api/community/media/${voice.id}`}
                            duration={voice.duration ?? 0}
                            waveform=""
                            own
                          />
                          {caption}
                        </>
                      ) : (
                        caption ?? undefined
                      )
                    }
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
