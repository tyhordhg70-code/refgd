"use client";

/**
 * Inline-editable text node.
 *
 * Default mode: renders the resolved string as plain text inside an
 * element of the caller's choosing (default `<span>`).
 *
 * Edit mode (admin + editMode on): outlines the element, makes it
 * `contentEditable`, and pushes every blur into the EditContext as a
 * pending change. The element gets a small "✎ <id>" hover badge so the
 * editor can see which content key they're touching.
 *
 * For multi-line copy (paragraphs) pass `multiline`. Linebreaks become
 * `\n` on save and are rendered with `whitespace-pre-line`.
 *
 * IMPORTANT: this component is intentionally minimal so it can be dropped
 * inside complex animated wrappers (motion.div, KineticText, etc.) without
 * disturbing the layout. It never adds extra padding/margin in default mode.
 */

import { useEffect, useRef, type ElementType, type CSSProperties } from "react";
import { useEditContext } from "@/lib/edit-context";

type Props = {
  /** Stable content-block id, e.g. "hero.title". */
  id: string;
  /** Default value used when nothing is in DB and nothing is queued. */
  defaultValue: string;
  /** Element tag to render. Default `<span>`. */
  as?: ElementType;
  className?: string;
  /** Optional inline style forwarded onto the rendered element. Useful
   *  for textShadow / paddingX / etc that callers like KineticText apply
   *  on the underlying tag. */
  style?: CSSProperties;
  /** Allow line breaks (Enter inserts newline instead of committing). */
  multiline?: boolean;
  /** Optional placeholder shown if value is empty in edit mode. */
  placeholder?: string;
  /** Optional test id to forward to the rendered element. */
  "data-testid"?: string;
};

export default function EditableText({
  id,
  defaultValue,
  as: Tag = "span",
  className = "",
  style,
  multiline = false,
  placeholder = "Click to edit…",
  "data-testid": testId,
}: Props) {
  const { isAdmin, editMode, getValue, setValue } = useEditContext();
  const value = getValue(id, defaultValue);
  const editing = isAdmin && editMode;
  const ref = useRef<HTMLElement | null>(null);

  // Keep the DOM in sync when value changes externally (undo / discard /
  // remote save). We only write the DOM when the user is NOT currently
  // focused inside the element, otherwise we'd kill their caret.
  // For multiline text we render newline characters as <br> so the
  // visual layout matches what the user typed (otherwise textContent
  // would put everything on one line).
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (document.activeElement === el) return;
    if (multiline) {
      // Convert "\n" → <br>. Escape HTML to keep it safe.
      const escaped = value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\n/g, "<br>");
      if (el.innerHTML !== escaped) el.innerHTML = escaped;
    } else {
      if (el.textContent !== value) el.textContent = value;
    }
  }, [value, multiline]);

  // Suppress hydration warning on first paint: server renders the saved
  // value, client may briefly show the same value but with contentEditable
  // attributes, which React would otherwise complain about.
  const baseClass = editing
    ? `relative cursor-text outline-none rounded-sm ring-1 ring-amber-300/0 hover:ring-amber-300/60 focus:ring-amber-300/90 transition-shadow ${className}`
    : className;
  // Multiline text MUST keep its `\n` characters visible in BOTH edit
  // and view modes — otherwise an admin who adds a line break in
  // preview will see the text revert to a single line after saving
  // (because the default `white-space: normal` collapses `\n` to a
  // single space on the next render). `whitespace-pre-line` preserves
  // newlines while still allowing soft-wrapping at word boundaries.
  const wrapClass = multiline ? `${baseClass} whitespace-pre-line` : baseClass;

  const onBlur = (e: React.FocusEvent<HTMLElement>) => {
    let next: string;
    if (multiline) {
      // Read the editable HTML and turn <br> / <div> into newlines so
      // that text the user wrapped onto multiple lines actually persists
      // as multi-line content (textContent alone strips them).
      const html = (e.currentTarget.innerHTML ?? "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(div|p)>/gi, "\n")
        .replace(/<[^>]+>/g, "");
      // Decode the basic HTML entities we previously escaped.
      const tmp = document.createElement("textarea");
      tmp.innerHTML = html;
      next = tmp.value.replace(/\u00A0/g, " ");
      // Trim trailing newline introduced by closing-tag conversion.
      next = next.replace(/\n+$/, "");
    } else {
      next = (e.currentTarget.textContent ?? "").replace(/\u00A0/g, " ");
    }
    if (next !== value) setValue(id, next);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    // Enter without shift commits in single-line mode.
    if (!multiline && e.key === "Enter") {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
    // Esc cancels: restore textContent to the saved value, then blur.
    if (e.key === "Escape") {
      e.preventDefault();
      if (ref.current) ref.current.textContent = value;
      (e.currentTarget as HTMLElement).blur();
    }
  };

  // Stop accidental link navigation during edit.
  const onClick = (e: React.MouseEvent<HTMLElement>) => {
    if (!editing) return;
    const link = (e.target as HTMLElement).closest("a");
    if (link) e.preventDefault();
  };

  const Component = Tag as ElementType;
  return (
    <Component
      ref={ref as React.RefObject<HTMLElement>}
      className={wrapClass}
      style={style}
      contentEditable={editing}
      suppressContentEditableWarning
      // EditableText is frequently nested inside framer-motion wrappers
      // (ParallaxChapter, Reveal, KineticText) whose own `initial` /
      // motion-value-driven styles produce SSR/CSR `style` deltas that
      // React's reconciler blames on the nearest leaf — i.e. us. The
      // surrounding animations are intentional and benign, so we
      // suppress the warning at the leaf to keep the console clean
      // for visitors. We do NOT add this on the editable root itself
      // because contentEditable already handles its own warning.
      suppressHydrationWarning
      spellCheck={editing}
      data-editable-id={id}
      data-testid={testId}
      data-placeholder={placeholder}
      onBlur={editing ? onBlur : undefined}
      onKeyDown={editing ? onKeyDown : undefined}
      onClick={onClick}
    >
      {value}
    </Component>
  );
}
