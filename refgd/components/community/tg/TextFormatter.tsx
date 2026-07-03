"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";

/**
 * Web A "TextFormatter" — the floating rich-text toolbar that appears when you
 * select text inside the composer input. The composer itself stays plain text;
 * each button wraps the current selection in a lightweight markdown-lite marker
 * (**bold**, __italic__, ~~strike~~, `mono`, ||spoiler||, [text](url)) that
 * renderBody turns back into styled spans on render. Visual styling is
 * inherited from the saved Web A stylesheet (.tg-body .TextFormatter…); we only
 * reuse those classnames and override positioning to track the live selection.
 */
export default function TextFormatter({
  inputRef,
}: {
  inputRef: RefObject<HTMLDivElement | null>;
}) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const [linkMode, setLinkMode] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  // While the URL input has focus the composer selection is parked here so the
  // link can still wrap the originally-selected text.
  const savedRange = useRef<Range | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  const update = useCallback(() => {
    // In link mode the selection intentionally moves to the URL input; keep the
    // toolbar where it is instead of recomputing/hiding from that focus change.
    if (linkMode) return;
    const el = inputRef.current;
    const sel = window.getSelection();
    if (
      !el ||
      !sel ||
      sel.rangeCount === 0 ||
      sel.isCollapsed ||
      !el.contains(sel.getRangeAt(0).commonAncestorContainer)
    ) {
      setPos(null);
      return;
    }
    const rect = sel.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) {
      setPos(null);
      return;
    }
    setPos({ left: rect.left + rect.width / 2, top: rect.top });
  }, [inputRef, linkMode]);

  useEffect(() => {
    document.addEventListener("selectionchange", update);
    // the fixed-position toolbar must track the selection when the input
    // scroller or the (mobile) keyboard viewport shifts.
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      document.removeEventListener("selectionchange", update);
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [update]);

  // Dismiss on any pointer-down outside the toolbar (also exits link mode).
  useEffect(() => {
    if (!pos) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current?.contains(e.target as Node)) return;
      setPos(null);
      setLinkMode(false);
      setLinkUrl("");
      savedRange.current = null;
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [pos]);

  const reset = () => {
    setPos(null);
    setLinkMode(false);
    setLinkUrl("");
    savedRange.current = null;
  };

  const insert = (text: string) => {
    const el = inputRef.current;
    if (!el) return;
    el.focus();
    // execCommand fires a native input event → composer onInput syncs chat.text
    // (same mechanism the composer already relies on for pasted text).
    document.execCommand("insertText", false, text);
    reset();
  };

  const wrap = (marker: string) => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    insert(`${marker}${sel.toString()}${marker}`);
  };

  const openLink = () => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    savedRange.current = sel.getRangeAt(0).cloneRange();
    setLinkMode(true);
  };

  const confirmLink = () => {
    const el = inputRef.current;
    const range = savedRange.current;
    const url = linkUrl.trim();
    if (!el || !range || !url) return;
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const text = range.toString();
    el.focus();
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(range);
    insert(`[${text}](${href})`);
  };

  if (!pos) return null;

  const fmtBtn = (label: string, icon: string, onClick: () => void) => (
    <button
      type="button"
      className="Button default translucent"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      <i className={`icon icon-${icon}`} aria-hidden />
    </button>
  );

  return (
    <div
      ref={rootRef}
      className="TextFormatter opacity-transition fast open shown"
      style={{
        position: "fixed",
        left: pos.left,
        top: pos.top,
        opacity: 1,
        zIndex: 30,
      }}
    >
      {linkMode ? (
        <div
          className="TextFormatter-link-control"
          style={{ position: "static", opacity: 1, pointerEvents: "auto" }}
        >
          <div className="TextFormatter-buttons">
            <button
              type="button"
              className="Button default translucent"
              aria-label="Cancel"
              title="Cancel"
              onMouseDown={(e) => e.preventDefault()}
              onClick={reset}
            >
              <i className="icon icon-arrow-left" aria-hidden />
            </button>
            <div className="TextFormatter-divider" />
            <div className="TextFormatter-link-url-input-wrapper">
              <input
                className="TextFormatter-link-url-input"
                type="text"
                placeholder="Enter URL..."
                autoComplete="off"
                autoFocus
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    confirmLink();
                  } else if (e.key === "Escape") {
                    e.preventDefault();
                    reset();
                  }
                }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="TextFormatter-buttons">
          {fmtBtn("Spoiler text", "eye-crossed", () => wrap("||"))}
          <div className="TextFormatter-divider" />
          {fmtBtn("Bold text", "bold", () => wrap("**"))}
          {fmtBtn("Italic text", "italic", () => wrap("__"))}
          {fmtBtn("Strikethrough text", "strikethrough", () => wrap("~~"))}
          {fmtBtn("Monospace text", "monospace", () => wrap("`"))}
          <div className="TextFormatter-divider" />
          {fmtBtn("Add Link", "link", openLink)}
        </div>
      )}
    </div>
  );
}
