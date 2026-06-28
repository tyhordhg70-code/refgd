"use client";

import { useState, type MouseEvent } from "react";

/**
 * CopyLinkButton — copies a shareable in-page deep link to the clipboard and
 * updates the address bar via history.replaceState (no scroll jump, no
 * back-button clutter). Used for the owner-requested Travel section and the
 * CRYPTO REFUNDS store card on /store-list. A <button> (not an <a>) is used so
 * the root layout's admin edit-mode anchor-click guard never swallows the tap.
 */
export default function CopyLinkButton({
  anchorId,
  label,
  title = "Copy a direct link",
  className,
}: {
  /** Fragment id WITHOUT the leading '#', e.g. "cat-travel" / "store-crypto-refunds". */
  anchorId: string;
  /** Optional visible text shown beside the icon (flips to "Copied!" on click). */
  label?: string;
  title?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  const onClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const url =
      typeof window === "undefined"
        ? ""
        : `${window.location.origin}${window.location.pathname}#${anchorId}`;
    try {
      window.history.replaceState(null, "", `#${anchorId}`);
    } catch {
      /* replaceState can throw in some sandboxed iframes; the copy still works. */
    }
    const flash = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    };
    if (url && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(flash).catch(flash);
    } else {
      flash();
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      className={className}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M10 13a5 5 0 0 0 7.07 0l3-3a5 5 0 0 0-7.07-7.07l-1.5 1.5" />
        <path d="M14 11a5 5 0 0 0-7.07 0l-3 3a5 5 0 0 0 7.07 7.07l1.5-1.5" />
      </svg>
      {label && <span>{copied ? "Copied!" : label}</span>}
      {!label && copied && <span className="sr-only">Copied</span>}
    </button>
  );
}
