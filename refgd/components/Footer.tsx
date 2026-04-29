"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "./Logo";

/**
 * Site-wide footer.
 *
 * Hidden on the home page (`/`).
 *
 * The home page is a curated cinematic landing experience: warp
 * intro → path cards → telegram CTA. A standard "Site / More /
 * Connect" link footer beneath that breaks the storytelling rhythm
 * — the user explicitly asked for it to be removed there. Every
 * other page (store-list, mentorships, etc.) still gets the
 * footer for navigation/SEO. We use `usePathname` so the
 * conditional happens at render time on the client, which keeps
 * the layout server component a static include.
 */
export default function Footer() {
  const pathname = usePathname();
  if (pathname === "/") return null;

  return (
    <footer className="relative z-[2] border-t border-white/5 bg-ink-900">
      <div className="container-px grid gap-10 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <Logo className="h-10 w-auto" />
          <p className="mt-3 max-w-xs text-sm text-white/55">
            Refunds, replacements & exclusive mentorships. Encrypted process,
            global reach, 5+ years experience.
          </p>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">Site</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-white/75">
            <li><Link href="/" className="hover:text-white">Home</Link></li>
            <li><Link href="/store-list" className="hover:text-white">Store List</Link></li>
            <li><Link href="/exclusive-mentorships" className="hover:text-white">Mentorships</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">More</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-white/75">
            <li><Link href="/evade-cancelations" className="hover:text-white">Evade Cancelations</Link></li>
            <li><Link href="/top-tier-methods" className="hover:text-white">Top-tier Methods</Link></li>
            <li><Link href="/vouches" className="hover:text-white">Vouches</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-white/40">Connect</h3>
          <ul className="mt-3 space-y-1.5 text-sm text-white/75">
            <li>
              <a href="https://t.me/refundlawfirm" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                Group Chat (Telegram)
              </a>
            </li>
            <li>
              <a href="https://refundgod.bgng.io/" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                Shop Methods
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t border-white/5">
        <div className="container-px flex flex-col items-center justify-between gap-2 py-4 text-xs text-white/40 sm:flex-row">
          <p>© {new Date().getFullYear()} RefundGod. All rights reserved.</p>
          <p>Self-hosted build · v1.0</p>
        </div>
      </div>
    </footer>
  );
}
