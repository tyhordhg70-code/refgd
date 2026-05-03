"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";
import EditableLink from "./EditableLink";
import EditableText from "./EditableText";

/**
 * Site-wide footer.
 *
 * Hidden on the home page (`/`).
 *
 * v6.13.38 — Every label, URL, column heading, the tagline and the
 * copyright text are now ADMIN-EDITABLE through the standard
 * EditContext pipeline. Stable ids are namespaced under `footer.*`
 * so they're easy to spot in the content-blocks table.
 */
const COL1_LINKS = [
  { id: 0, href: "/", label: "Home" },
  { id: 1, href: "/store-list", label: "Store List" },
  { id: 2, href: "/exclusive-mentorships", label: "Mentorships" },
];
const COL2_LINKS = [
  { id: 0, href: "/evade-cancelations", label: "Evade Cancelations" },
  { id: 1, href: "/top-tier-methods", label: "Top-tier Methods" },
  { id: 2, href: "/vouches", label: "Vouches" },
];
const COL3_LINKS = [
  { id: 0, href: "https://t.me/refundlawfirm", label: "Group Chat (Telegram)", external: true },
  { id: 1, href: "https://refundgod.bgng.io/", label: "Shop Methods", external: true },
];

export default function Footer() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <footer className="relative z-[2] bg-transparent">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 -top-24 h-24"
        style={{
          background:
            "linear-gradient(to bottom, transparent 0%, rgba(5,6,10,0.55) 60%, rgba(5,6,10,0.85) 100%)",
        }}
      />
      <div className="container-px grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo className="h-10 w-auto" />
          <EditableText
            id="footer.tagline"
            defaultValue="Refunds, replacements & exclusive mentorships. Encrypted process, global reach, 5+ years experience."
            as="p"
            className="mt-3 max-w-xs text-sm text-white/70"
            multiline
          />
        </div>
        <div>
          <EditableText
            id="footer.col1.title"
            defaultValue="Site"
            as="h3"
            className="text-xs font-semibold uppercase tracking-widest text-white/60"
          />
          <ul className="mt-3 space-y-1.5 text-sm text-white/75">
            {COL1_LINKS.map((l) => (
              <li key={l.id}>
                <EditableLink
                  idHref={`footer.col1.${l.id}.href`}
                  defaultHref={l.href}
                  idLabel={`footer.col1.${l.id}.label`}
                  defaultLabel={l.label}
                  className="hover:text-white"
                />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <EditableText
            id="footer.col2.title"
            defaultValue="More"
            as="h3"
            className="text-xs font-semibold uppercase tracking-widest text-white/60"
          />
          <ul className="mt-3 space-y-1.5 text-sm text-white/75">
            {COL2_LINKS.map((l) => (
              <li key={l.id}>
                <EditableLink
                  idHref={`footer.col2.${l.id}.href`}
                  defaultHref={l.href}
                  idLabel={`footer.col2.${l.id}.label`}
                  defaultLabel={l.label}
                  className="hover:text-white"
                />
              </li>
            ))}
          </ul>
        </div>
        <div>
          <EditableText
            id="footer.col3.title"
            defaultValue="Connect"
            as="h3"
            className="text-xs font-semibold uppercase tracking-widest text-white/60"
          />
          <ul className="mt-3 space-y-1.5 text-sm text-white/75">
            {COL3_LINKS.map((l) => (
              <li key={l.id}>
                <EditableLink
                  idHref={`footer.col3.${l.id}.href`}
                  defaultHref={l.href}
                  idLabel={`footer.col3.${l.id}.label`}
                  defaultLabel={l.label}
                  external={l.external}
                  className="hover:text-white"
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="border-t border-white/[0.04]">
        <div className="container-px flex flex-col items-center justify-between gap-2 py-4 text-xs text-white/60 sm:flex-row">
          <EditableText
            id="footer.copyright"
            defaultValue={`© ${new Date().getFullYear()} RefundGod. All rights reserved.`}
            as="p"
          />
          <EditableText
            id="footer.build"
            defaultValue="Self-hosted build · v1.0"
            as="p"
          />
        </div>
      </div>
    </footer>
  );
}
