"use client";
import { useEffect } from "react";
import { createPortal } from "react-dom";

type InfoModalProps = {
  open: boolean;
  onClose: () => void;
  /** Header shown at the top of the panel. */
  title?: string;
  /** Pre-sanitised HTML recreated from the linked source page. */
  html: string;
};

/**
 * A reading overlay that recreates an external page's content (text, images,
 * links) in-place so cards / headers can open it instead of redirecting away.
 *
 * Rendered through a portal to document.body so the grid's overflow / transform
 * never clips it. The overlay carries data-editor-chrome so the root layout's
 * admin edit-mode click guard (which preventDefaults every <a> on non-/admin
 * routes) does NOT swallow the links inside the recreated content.
 */
export default function InfoModal({ open, onClose, title, html }: InfoModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center overflow-y-auto bg-black/80 p-4 backdrop-blur-sm sm:p-8"
      onClick={onClose}
      data-editor-chrome="true"
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
        <div
          className="max-h-[75vh] overflow-y-auto px-5 py-4 text-sm leading-relaxed text-white/85 [&_a]:break-words [&_a]:text-amber-300 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-amber-200 [&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-amber-300/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-white/75 [&_em]:text-amber-100 [&_figcaption]:mt-1 [&_figcaption]:text-center [&_figcaption]:text-xs [&_figcaption]:text-white/50 [&_figure]:my-3 [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-white [&_h4]:mb-1.5 [&_h4]:mt-4 [&_h4]:font-bold [&_h4]:text-white [&_hr]:my-4 [&_hr]:border-white/10 [&_img]:my-3 [&_img]:w-full [&_img]:rounded-xl [&_img]:border [&_img]:border-white/10 [&_li]:marker:text-amber-300/70 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:space-y-1 [&_ol]:pl-5 [&_p]:my-3 [&_strong]:font-semibold [&_strong]:text-white [&_ul]:my-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>,
    document.body,
  );
}
