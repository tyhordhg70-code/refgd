"use client";

import { useMemo } from "react";
import MiddleHeader from "./MiddleHeader";
import MessageBubble from "./MessageBubble";
import type { VouchView } from "./types";
import { LocalTime, dateKey, dateLabel, peerIdx, renderBody } from "./format";

/**
 * Read-only forum topic fed by vouches (Client Testimonials, BUY4U Vouches,
 * Announcements). Messages render chronologically as incoming Telegram
 * bubbles, grouped under sticky date pills; consecutive posts by the same
 * author collapse into a bubble group (sender name on the first, avatar +
 * appendix tail on the last), exactly like Telegram Web A.
 */

interface DateGroup {
  key: string;
  label: string;
  runs: VouchView[][];
}

function buildGroups(vouches: VouchView[]): DateGroup[] {
  const sorted = [...vouches].sort((a, b) => {
    const ta = a.originDate ?? a.createdAt;
    const tb = b.originDate ?? b.createdAt;
    if (ta !== tb) return ta < tb ? -1 : 1;
    return Number(a.id) - Number(b.id);
  });
  const todayYear = new Date().getUTCFullYear();
  const groups: DateGroup[] = [];
  for (const v of sorted) {
    const key = dateKey(v.originDate ?? v.createdAt);
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

export default function VouchTopic({
  title,
  vouches,
  notice,
  onBack,
}: {
  title: string;
  vouches: VouchView[];
  notice: string;
  onBack: () => void;
}) {
  const groups = useMemo(() => buildGroups(vouches), [vouches]);

  return (
    <>
      <MiddleHeader
        title={title}
        subtitle={`${vouches.length} message${vouches.length === 1 ? "" : "s"}`}
        onBack={onBack}
      />
      <div className="tg-messages">
        <div className="tg-messages-scroll tg-scroll">
          <div className="tg-messages-inner">
            {groups.length === 0 && (
              <div className="tg-action">No messages here yet.</div>
            )}
            {groups.map((g) => (
              <div key={g.key} className="tg-date-group">
                <div className="tg-date is-sticky">{g.label}</div>
                {g.runs.map((run) =>
                  run.map((v, i) => {
                    const first = i === 0;
                    const last = i === run.length - 1;
                    return (
                      <MessageBubble
                        key={v.id}
                        own={false}
                        showAvatarGutter
                        sender={
                          first
                            ? { name: v.authorName, peer: peerIdx(v.authorName) }
                            : null
                        }
                        avatar={
                          last
                            ? {
                                name: v.authorName,
                                photo: null,
                                peer: peerIdx(v.authorName),
                              }
                            : null
                        }
                        hasAppendix={last}
                        pinned={v.pinned}
                        media={v.mediaIds.map(
                          (id) => `/api/community/media/${id}`,
                        )}
                        body={v.body ? renderBody(v.body) : undefined}
                        time={<LocalTime iso={v.createdAt} />}
                      />
                    );
                  }),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="tg-composer-area">
        <div className="tg-composer-notice">{notice}</div>
      </div>
    </>
  );
}
