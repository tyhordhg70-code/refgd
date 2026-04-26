"use client";
import Link from "next/link";
import { useState } from "react";
import Logo from "./Logo";

const NAV_ITEMS = [
  { href: "/", label: "Home" },
  { href: "/store-list", label: "Store List" },
  { href: "/our-service", label: "Our Service" },
  { href: "/exclusive-mentorships", label: "Exclusive Mentorships" },
  { href: "/evade-cancelations", label: "Evade Cancelations" },
  { href: "/top-tier-methods", label: "Top-tier Methods" },
  { href: "https://t.me/refundlawfirm", label: "Group Chat", external: true },
  { href: "/vouches", label: "Vouches" },
];

const BUY_URL = "https://refundgod.bgng.io/";

export default function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 border-b border-white/5 bg-ink-950/85 backdrop-blur-xl">
      <div className="container-px flex h-16 items-center justify-between gap-4">
        <Link href="/" className="shrink-0" aria-label="RefundGod home">
          <Logo />
        </Link>
        <nav className="hidden lg:block" aria-label="Primary">
          <ul className="flex items-center gap-1 text-sm">
            {NAV_ITEMS.map((it) => (
              <li key={it.href}>
                <Link
                  href={it.href}
                  target={it.external ? "_blank" : undefined}
                  rel={it.external ? "noopener noreferrer" : undefined}
                  data-cursor="link"
                  data-cursor-label={it.label}
                  className="rounded-full px-3 py-2 text-white/75 transition hover:bg-white/5 hover:text-white"
                >
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <div className="flex items-center gap-2">
          <a href={BUY_URL} target="_blank" rel="noopener noreferrer" className="btn-primary !px-5 !py-2.5 text-sm">
            Buy Now
          </a>
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
            {NAV_ITEMS.map((it) => (
              <li key={it.href}>
                <Link
                  href={it.href}
                  target={it.external ? "_blank" : undefined}
                  rel={it.external ? "noopener noreferrer" : undefined}
                  onClick={() => setOpen(false)}
                  className="block rounded-lg px-4 py-3 text-white/85 transition hover:bg-white/5"
                >
                  {it.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </header>
  );
}
