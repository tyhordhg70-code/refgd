"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useEditContext } from "@/lib/edit-context";

type InfoModalProps = {
  open: boolean;
  onClose: () => void;
  /** Header shown at the top of the panel. */
  title?: string;
  /** Pre-sanitised HTML recreated from the linked source page. */
  html: string;
  /**
   * Logical content id (e.g. "hotels"). When provided AND the visitor is an
   * admin in edit mode, the popup body becomes editable. The edited HTML is
   * persisted to content_blocks under `info.<id>.html` and is served to every
   * visitor on the next render (the root layout seeds it via getAllContentMap).
   * When absent the popup is strictly read-only — public visitors never see
   * any editing affordance.
   */
  contentId?: string;
};

// Shared typographic classes for the recreated content. Used for BOTH the
// read-only render and the contentEditable surface so editing looks identical
// to viewing. `data-lenis-prevent` + `overscroll-contain` stop the site-wide
// Lenis smooth-scroller from swallowing the wheel/touch gesture inside the
// scroll box (the reason the popups "couldn't scroll" on mobile/desktop).
const BODY_CLS =
  "max-h-[75vh] overflow-y-auto overscroll-contain px-5 py-4 text-sm leading-relaxed text-white/85 [&_a]:break-words [&_a]:text-amber-300 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-amber-200 [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-amber-300/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-white/75 [&_em]:text-amber-100 [&_figcaption]:mt-1 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-white/50 [&_figure]:my-3 [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-white [&_h4]:mb-1.5 [&_h4]:mt-4 [&_h4]:font-bold [&_h4]:text-white [&_hr]:my-4 [&_hr]:border-white/10 [&_img]:my-3 [&_img]:w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-white/10 [&_li]:marker:text-amber-300/70 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:my-3 [&_strong]:font-semibold [&_strong]:text-white [&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5";

const CHROME_BTN =
  "rounded-lg border px-2.5 py-1 text-xs font-semibold transition disabled:opacity-50";

/**
 * Neutralise the obvious stored-XSS vectors before persisting admin-edited
 * HTML (it is later rendered with dangerouslySetInnerHTML for every visitor).
 * The authoritative trust boundary is the admin-only /api/admin/content route;
 * this pass additionally strips anything dangerous that an admin might paste in
 * from an untrusted source (script/style/iframe/etc. tags, on* handlers, inline
 * styles, and javascript:/data:/vbscript: URLs). DOM-based — far safer than
 * regex. Runs in the browser only.
 */
function sanitizeHtml(dirty: string): string {
  if (typeof document === "undefined") return dirty;
  const doc = new DOMParser().parseFromString(dirty, "text/html");
  doc
    .querySelectorAll(
      "script,style,iframe,object,embed,link,meta,noscript,template,svg,math,form,input,button,base",
    )
    .forEach((el) => el.remove());
  doc.querySelectorAll("*").forEach((el) => {
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      if (name.startsWith("on") || name === "style") {
        el.removeAttribute(attr.name);
        continue;
      }
      if (
        (name === "href" || name === "src" || name === "xlink:href") &&
        /^\s*(javascript|data|vbscript):/i.test(attr.value)
      ) {
        el.removeAttribute(attr.name);
      }
    }
  });
  return doc.body.innerHTML;
}

/**
 * A reading overlay that recreates an external page's content (text, images,
 * links) in-place so cards / headers can open it instead of redirecting away.
 *
 * Rendered through a portal to document.body so the grid's overflow / transform
 * never clips it. The overlay carries data-editor-chrome so the root layout's
 * admin edit-mode click guard (which preventDefaults every <a> on non-/admin
 * routes) does NOT swallow the links inside the recreated content.
 */
export default function InfoModal({ open, onClose, title, html, contentId }: InfoModalProps) {
  const { isAdmin, editMode, getValue, saveBlock } = useEditContext();

  const htmlKey = contentId ? `info.${contentId}.html` : null;
  // Admin-saved override wins; the auto-generated mirror is the fallback.
  const effectiveHtml = htmlKey ? getValue(htmlKey, html) : html;
  const canEdit = isAdmin && editMode && !!htmlKey;

  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // While editing, Escape backs out of edit mode rather than closing the
      // whole panel (so an accidental keypress can't discard the open popup).
      if (editing) {
        setEditing(false);
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose, editing]);

  // Pause heavy full-viewport background work while this modal is open. The
  // modal lays a bg-black/80 + backdrop-blur sheet over the ENTIRE viewport;
  // on the store-list page a fixed <video> backdrop keeps playing behind it,
  // and re-blurring that moving video every frame pegs the compositor (the
  // "popup freezes up" report). We broadcast open/close so the video bg (and
  // any future heavy backdrop) can pause while it is invisible behind us.
  // Keyed ONLY on `open` so it fires exactly once per open, and the cleanup
  // also covers an unmount-while-open (e.g. route change).
  useEffect(() => {
    if (!open) return;
    window.dispatchEvent(new Event("refgd:overlay-open"));
    return () => window.dispatchEvent(new Event("refgd:overlay-close"));
  }, [open]);

  // Seed the contentEditable surface ONCE when edit mode turns on. We set
  // innerHTML imperatively (not through React) so React never reconciles — and
  // wipes — the admin's in-progress edits while they type.
  useEffect(() => {
    if (editing && bodyRef.current) {
      bodyRef.current.innerHTML = effectiveHtml;
    }
    // effectiveHtml intentionally excluded: re-seeding on every keystroke would
    // reset the caret. We only seed on the editing -> true transition.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing]);

  // Closing the panel (or losing edit rights) drops edit state so it reopens
  // clean next time.
  useEffect(() => {
    if ((!open || !canEdit) && editing) setEditing(false);
  }, [open, canEdit, editing]);

  if (!open || typeof document === "undefined") return null;

  const handleSave = async () => {
    if (!htmlKey || !bodyRef.current) return;
    setSaving(true);
    const ok = await saveBlock(htmlKey, sanitizeHtml(bodyRef.current.innerHTML));
    setSaving(false);
    if (ok) setEditing(false);
    else alert("Couldn't save — please try again.");
  };

  const handleReset = async () => {
    if (!htmlKey) return;
    if (!confirm("Reset this popup back to its original text? Your saved edits will be replaced.")) return;
    setSaving(true);
    const ok = await saveBlock(htmlKey, html);
    setSaving(false);
    if (ok) setEditing(false);
    else alert("Couldn't reset — please try again.");
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto overscroll-contain bg-black/80 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
      data-editor-chrome="true"
      data-lenis-prevent
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-amber-300/30 bg-ink-900 shadow-[0_40px_120px_-20px_rgba(0,0,0,0.85)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-white/10 bg-ink-900/95 px-5 py-3 backdrop-blur">
          <h3 className="heading-display min-w-0 truncate text-lg font-bold text-amber-100">
            {title || "Full Info"}
          </h3>
          <div className="flex shrink-0 items-center gap-2">
            {canEdit && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={`${CHROME_BTN} border-amber-300/40 bg-amber-400/15 text-amber-200 hover:bg-amber-400/30`}
              >
                Edit
              </button>
            )}
            {canEdit && editing && (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={`${CHROME_BTN} border-emerald-300/40 bg-emerald-400/15 text-emerald-200 hover:bg-emerald-400/30`}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  disabled={saving}
                  className={`${CHROME_BTN} border-white/15 bg-white/5 text-white/70 hover:bg-white/10`}
                >
                  Reset
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(false)}
                  disabled={saving}
                  className={`${CHROME_BTN} border-white/15 bg-white/5 text-white/70 hover:bg-white/10`}
                >
                  Cancel
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/5 text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M6 6l12 12M18 6 6 18" />
              </svg>
            </button>
          </div>
        </div>
        {editing ? (
          <div
            ref={bodyRef}
            contentEditable
            suppressContentEditableWarning
            data-lenis-prevent
            className={`${BODY_CLS} outline-none ring-1 ring-inset ring-amber-300/40 focus:ring-amber-300/70`}
          />
        ) : (
          <div
            data-lenis-prevent
            className={BODY_CLS}
            dangerouslySetInnerHTML={{ __html: effectiveHtml }}
          />
        )}
      </div>
    </div>,
    document.body,
  );
}
