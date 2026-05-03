"use client";
import Link from "next/link";
import { useState } from "react";
import Logo from "./Logo";
import EditableLink from "./EditableLink";
import EditableText from "./EditableText";
import { useEditContext } from "@/lib/edit-context";

/**
 * v6.13.38 — Nav buttons (label + URL) are now ADMIN-EDITABLE.
 *
 * Each item is rendered through <EditableLink> so admins in edit mode
 * get the inline label contentEditable + a 🔗 URL editor popover, with
 * normal save / undo / discard piped through EditContext just like
 * every other inline edit on the site. The "Shop Methods" CTA on the
 * right is also editable (label + URL).
 *
 * Stable content-block ids:
 *   nav.item.{i}.label   → visible text
 *   nav.item.{i}.href    → href
 *   nav.cta.label        → "Shop Methods" button text
 *   nav.cta.url          → "Shop Methods" target URL
 *
 * The default values below are the current production strings, so a
 * brand-new install renders identically to before. Once the admin
 * saves an override the new value sticks in `content_blocks`.
 */
const NAV_ITEMS = [
  { href: "/", label: "Home", external: false },
  { href: "/store-list", label: "Store List", external: false },
  { href: "/exclusive-mentorships", label: "Exclusive Mentorships", external: false },
  { href: "/evade-cancelations", label: "Evade Cancelations", external: false },
  { href: "/top-tier-methods", label: "Top-tier Methods", external: false },
  { href: "https://t.me/refundlawfirm", label: "Group Chat", external: true },
  { href: "/vouches", label: "Vouches", external: false },
];

const BUY_URL = "https://refundgod.bgng.io/";
const BUY_LABEL = "Shop Methods";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const { isAdmin, editMode, getValue } = useEditContext();
  const adminEditing = isAdmin && editMode;

  // Resolve the admin-editable CTA label + URL up front so the
  // <a className="btn-primary"> stays a single element (we can't
  // wrap it in EditableLink without losing the button styling, so
  // we read the values directly and render a plain anchor).
  const ctaUrl = getValue("nav.cta.url", BUY_URL);
  const ctaLabel = getValue("nav.cta.label", BUY_LABEL);

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/85 backdrop-blur-xl">
      <div className="container-px flex h-16 items-center justify-between gap-4">
        <Link href="/" className="shrink-0" aria-label="RefundGod home">
          <Logo />
        </Link>
        <nav className="hidden lg:block" aria-label="Primary">
          <ul className="flex items-center gap-1 text-sm">
            {NAV_ITEMS.map((it, i) => (
              <li key={`nav-${i}`}>
                <EditableLink
                  idHref={`nav.item.${i}.href`}
                  defaultHref={it.href}
                  idLabel={`nav.item.${i}.label`}
                  defaultLabel={it.label}
                  external={it.external}
                  inlineLabel
                  className="rounded-full px-3 py-2 text-white/75 transition hover:bg-white/5 hover:text-white"
                  dataAttrs={{ "data-cursor": "link", "data-cursor-label": it.label }}
                />
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          {adminEditing ? (
            // Admin "Shop Methods" editor — bigger surface so editing
            // is easy. Renders a quick inline label + URL pair above
            // the actual button so the visual button keeps its styling.
            <div className="flex items-center gap-2">
              <div className="hidden flex-col gap-1 rounded-lg border border-amber-300/40 bg-amber-300/[0.06] px-2 py-1.5 sm:flex">
                <EditableText
                  id="nav.cta.label"
                  defaultValue={BUY_LABEL}
                  as="span"
                  className="text-[11px] font-semibold uppercase tracking-wider text-amber-200"
                />
                <EditableText
                  id="nav.cta.url"
                  defaultValue={BUY_URL}
                  as="span"
                  className="font-mono text-[10px] text-white/85"
                  placeholder="https://…"
                />
              </div>
              <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className="btn-primary !px-5 !py-2.5 text-sm">
                {ctaLabel}
              </a>
            </div>
          ) : (
            <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className="btn-primary !px-5 !py-2.5 text-sm">
              {ctaLabel}
            </a>
          )}
          <button
            type="button"
            aria-label="Toggle menu"
            aria-expanded={open}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/5 text-white lg:hidden"
            onClick={() => setOpen((o) => !o)}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? <path d="M6 6l12 12M18 6L6 18" /> : <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>}
            </svg>
          </button>
        </div>
      </div>
      {open && (
        <div className="border-t border-white/5 bg-ink-900 lg:hidden">
          <ul className="container-px flex flex-col py-2">
            {NAV_ITEMS.map((it, i) => (
              <li key={`mob-${i}`} onClick={() => setOpen(false)}>
                <EditableLink
                  idHref={`nav.item.${i}.href`}
                  defaultHref={it.href}
                  idLabel={`nav.item.${i}.label`}
                  defaultLabel={it.label}
                  external={it.external}
                  inlineLabel
                  className="block rounded-lg px-4 py-3 text-white/85 transition hover:bg-white/5"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
