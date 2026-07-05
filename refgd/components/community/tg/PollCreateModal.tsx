"use client";

import { useEffect, useRef, useState } from "react";

const OPTIONS_MAX = 10;
const QUESTION_MAX = 255;
const OPTION_MAX = 100;

/**
 * "New Poll" dialog (attach menu → Poll), Web A styled. Caller renders it
 * inside the fixed-overlay portal root so desktop's transformed #MiddleColumn
 * cannot mis-anchor it.
 */
export default function PollCreateModal({
  open,
  busy,
  error,
  onCancel,
  onCreate,
}: {
  open: boolean;
  busy: boolean;
  error: string | null;
  onCancel: () => void;
  onCreate: (
    question: string,
    options: string[],
    multiple: boolean,
  ) => void;
}) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const questionRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) {
      setQuestion("");
      setOptions(["", ""]);
      setMultiple(false);
      // Focus after the overlay paints.
      window.setTimeout(() => questionRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const filled = options.map((o) => o.trim()).filter(Boolean);
  const valid = question.trim().length > 0 && filled.length >= 2;

  const setOption = (idx: number, value: string) => {
    setOptions((prev) => {
      const next = prev.slice();
      next[idx] = value;
      // Auto-append an empty row when the last one is used (up to the cap).
      if (
        idx === next.length - 1 &&
        value.trim() &&
        next.length < OPTIONS_MAX
      ) {
        next.push("");
      }
      return next;
    });
  };

  const removeOption = (idx: number) => {
    setOptions((prev) =>
      prev.length <= 2 ? prev : prev.filter((_, i) => i !== idx),
    );
  };

  return (
    <div
      className="tg-pollmodal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div
        className="tg-pollmodal"
        role="dialog"
        aria-modal="true"
        aria-label="New poll"
        data-lenis-prevent
      >
        <div className="tg-pollmodal-header">
          <span>New Poll</span>
          <button
            type="button"
            className="tg-pollmodal-x"
            onClick={onCancel}
            disabled={busy}
            aria-label="Cancel"
          >
            <i className="icon icon-close" aria-hidden />
          </button>
        </div>
        <div className="tg-pollmodal-body">
          <label className="tg-pollmodal-label">Question</label>
          <input
            ref={questionRef}
            type="text"
            className="tg-pollmodal-input"
            placeholder="Ask a question"
            maxLength={QUESTION_MAX}
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={busy}
          />
          <label className="tg-pollmodal-label">Options</label>
          {options.map((opt, idx) => (
            <div key={idx} className="tg-pollmodal-optrow">
              <input
                type="text"
                className="tg-pollmodal-input"
                placeholder={`Option ${idx + 1}`}
                maxLength={OPTION_MAX}
                value={opt}
                onChange={(e) => setOption(idx, e.target.value)}
                disabled={busy}
              />
              {options.length > 2 && (
                <button
                  type="button"
                  className="tg-pollmodal-x"
                  onClick={() => removeOption(idx)}
                  disabled={busy}
                  aria-label={`Remove option ${idx + 1}`}
                >
                  <i className="icon icon-close" aria-hidden />
                </button>
              )}
            </div>
          ))}
          <label className="tg-pollmodal-check">
            <input
              type="checkbox"
              checked={multiple}
              onChange={(e) => setMultiple(e.target.checked)}
              disabled={busy}
            />
            <span>Multiple answers</span>
          </label>
          {error && <div className="tg-pollmodal-error">{error}</div>}
        </div>
        <div className="tg-pollmodal-footer">
          <button
            type="button"
            className="tg-pollmodal-btn is-ghost"
            onClick={onCancel}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            type="button"
            className="tg-pollmodal-btn"
            disabled={!valid || busy}
            onClick={() =>
              onCreate(question.trim(), filled.slice(0, OPTIONS_MAX), multiple)
            }
          >
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}
