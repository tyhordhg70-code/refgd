"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import {
  IconBack,
  IconBold,
  IconCheck,
  IconEyeCrossed,
  IconItalic,
  IconLink,
  IconMono,
  IconStrikethrough,
  IconUnderline,
} from "./TgIcons";

/**
 * Web A "TextFormatter" — the floating rich-text toolbar that appears when you
 * select text inside the composer input. The composer itself stays plain text;
 * each button wraps the current selection in a lightweight markdown-lite marker
 * (**bold**, __italic__, ++underline++, ~~strike~~, `mono`, ||spoiler||,
 * [text](url)) that renderBody turns back into styled spans on render. Visual
 * styling is inherited from the saved Web A stylesheet (.tg-body
 * .TextFormatter…); we only reuse those classnames and override positioning to
 * track the live selection.
 *
 * IMPORTANT: the toolbar must portal into `overlayEl` (a node OUTSIDE the
 * translated #MiddleColumn) — the column's transform makes it the containing
 * block for position:fixed, which anchored the toolbar off-viewport and made
 * it "never appear" when rendered inline.
 */
export default function TextFormatter({
  inputRef,
  overlayEl,
}: {
  inputRef: RefObject<HTMLDivElement | null>;
  /** Portal host outside the transformed #MiddleColumn (see CommunityChat). */
  overlayEl?: HTMLElement | null;
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
    // STATIC placement (owner request): capture the position once when the
    // toolbar first appears and keep it there — it must NOT chase the
    // selection while the user is still dragging/extending it. It only
    // re-anchors after being dismissed (collapse / outside pointer-down).
    setPos((prev) => prev ?? { left: rect.left + rect.width / 2, top: rect.top });
  }, [inputRef, linkMode]);

  useEffect(() => {
    document.addEventListener("selectionchange", update);
    // resize/scroll only re-validate the selection (hide when it collapses
    // or leaves the input) — the shown toolbar itself stays put.
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

  // Inline SVG icons — the vendored icon-font glyph rules are scoped under
  // .tg-body and never reach this .tg-overlay-root portal (same trap as the
  // portaled context menu; see TgIcons).
  const fmtBtn = (label: string, icon: React.ReactNode, onClick: () => void) => (
    <button
      type="button"
      className="Button default translucent"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
    >
      {icon}
    </button>
  );

  const node = (
    <div
      ref={rootRef}
      className={
        "TextFormatter opacity-transition fast open shown" +
        (linkMode ? " link-control-shown" : "")
      }
      style={
        {
          position: "fixed",
          left: pos.left,
          top: pos.top,
          opacity: 1,
          // Above the edit-composer modal backdrop (z 60) so the toolbar also
          // works for selections inside the modal's contentEditable.
          zIndex: 80,
          "--text-formatter-left": `${pos.left}px`,
        } as React.CSSProperties
      }
    >
      <div className="TextFormatter-buttons">
        {fmtBtn("Spoiler text", <IconEyeCrossed />, () => wrap("||"))}
        <div className="TextFormatter-divider" />
        {fmtBtn("Bold text", <IconBold />, () => wrap("**"))}
        {fmtBtn("Italic text", <IconItalic />, () => wrap("__"))}
        {fmtBtn("Underlined text", <IconUnderline />, () => wrap("++"))}
        {fmtBtn("Strikethrough text", <IconStrikethrough />, () => wrap("~~"))}
        {fmtBtn("Monospace text", <IconMono />, () => wrap("`"))}
        <div className="TextFormatter-divider" />
        {fmtBtn("Add Link", <IconLink />, openLink)}
      </div>
      {linkMode && (
        <div className="TextFormatter-link-control">
          <div className="TextFormatter-buttons">
            <button
              type="button"
              className="Button default translucent"
              aria-label="Cancel"
              title="Cancel"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setLinkMode(false);
                setLinkUrl("");
              }}
            >
              <IconBack />
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
                    setLinkMode(false);
                    setLinkUrl("");
                  }
                }}
              />
            </div>
            <div
              className={
                "TextFormatter-link-url-confirm" +
                (linkUrl.trim() ? " shown" : "")
              }
            >
              <div className="TextFormatter-divider" />
              <button
                type="button"
                className="Button default translucent color-primary"
                aria-label="Save"
                title="Save"
                onMouseDown={(e) => e.preventDefault()}
                onClick={confirmLink}
              >
                <IconCheck />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return overlayEl ? createPortal(node, overlayEl) : node;
}
