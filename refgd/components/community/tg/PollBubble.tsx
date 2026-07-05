"use client";

import { useState } from "react";
import type { PollData } from "@/lib/community";

/**
 * Telegram Web A-style poll bubble body. Before voting (and while open) the
 * options are tappable — single-choice votes immediately, multiple-answers
 * collects checkboxes behind a Vote button. After voting (or when closed)
 * the options become percentage result bars with a check on the caller's
 * pick. Footer shows the distinct-voter count, a Retract vote action while
 * open, and Close voting for the creator/admin.
 */
export default function PollBubble({
  poll,
  canClose,
  onVote,
  onClose,
}: {
  /** undefined while the batch fetch is in flight → skeleton. */
  poll: PollData | undefined;
  /** Poll creator or chat admin — may close voting. */
  canClose: boolean;
  /** Cast/replace vote ([] retracts). Resolves server ok. */
  onVote: (optionIdxs: number[]) => Promise<boolean>;
  onClose: () => Promise<boolean>;
}) {
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);

  if (!poll) {
    return (
      <div className="tg-poll is-loading" aria-busy="true">
        <div className="tg-poll-question">&nbsp;</div>
        <div className="tg-poll-type">Loading poll…</div>
      </div>
    );
  }

  const voted = poll.options.some((o) => o.mine);
  const showResults = voted || poll.closed;
  const totalVotes = poll.options.reduce((acc, o) => acc + o.votes, 0);

  const cast = async (idxs: number[]) => {
    if (busy) return;
    setBusy(true);
    await onVote(idxs);
    setBusy(false);
    setPicked([]);
  };

  const tapOption = (idx: number) => {
    if (busy || showResults) return;
    if (poll.multiple) {
      setPicked((prev) =>
        prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
      );
    } else {
      void cast([idx]);
    }
  };

  return (
    <div className="tg-poll">
      <div className="tg-poll-question">{poll.question}</div>
      <div className="tg-poll-type">
        {poll.closed
          ? "Final results"
          : poll.multiple
            ? "Select one or more answers"
            : "Anonymous Poll"}
      </div>
      <div className="tg-poll-options">
        {poll.options.map((o, idx) => {
          const pct =
            totalVotes > 0 ? Math.round((o.votes / totalVotes) * 100) : 0;
          if (showResults) {
            return (
              <div
                key={idx}
                className={`tg-poll-result${o.mine ? " is-mine" : ""}`}
              >
                <span className="tg-poll-pct">{pct}%</span>
                <div className="tg-poll-result-main">
                  <div className="tg-poll-result-label">
                    {o.mine && (
                      <i className="icon icon-check" aria-hidden />
                    )}
                    <span>{o.text}</span>
                  </div>
                  <div className="tg-poll-track">
                    <div
                      className="tg-poll-fill"
                      style={{ width: `${Math.max(pct, o.votes > 0 ? 3 : 0)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          }
          const selected = picked.includes(idx);
          return (
            <button
              key={idx}
              type="button"
              className={`tg-poll-option${selected ? " is-selected" : ""}`}
              disabled={busy}
              onClick={() => tapOption(idx)}
            >
              <span
                className={`tg-poll-radio${poll.multiple ? " is-check" : ""}${
                  selected ? " is-on" : ""
                }`}
                aria-hidden
              />
              <span className="tg-poll-option-text">{o.text}</span>
            </button>
          );
        })}
      </div>
      {poll.multiple && !showResults && (
        <button
          type="button"
          className="tg-poll-vote-btn"
          disabled={busy || picked.length === 0}
          onClick={() => void cast(picked)}
        >
          Vote
        </button>
      )}
      <div className="tg-poll-footer">
        <span className="tg-poll-count">
          {poll.totalVoters === 0
            ? "No votes"
            : `${poll.totalVoters} ${poll.totalVoters === 1 ? "vote" : "votes"}`}
          {poll.closed ? " · Closed" : ""}
        </span>
        {voted && !poll.closed && (
          <button
            type="button"
            className="tg-poll-action"
            disabled={busy}
            onClick={() => void cast([])}
          >
            Retract vote
          </button>
        )}
        {canClose && !poll.closed && (
          <button
            type="button"
            className="tg-poll-action"
            disabled={busy}
            onClick={() => {
              if (busy) return;
              setBusy(true);
              void onClose().finally(() => setBusy(false));
            }}
          >
            Close voting
          </button>
        )}
      </div>
    </div>
  );
}
