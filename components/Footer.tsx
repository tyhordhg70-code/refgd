import Link from "next/link";
import Logo from "./Logo";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-ink-900">
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
            <li><Link href="/our-service" className="hover:text-white">Our Service</Link></li>
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
              <a href="https://t.me/+nwkW2Mw3959mZDc0" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                Group Chat (Telegram)
              </a>
            </li>
            <li>
              <a href="https://t.me/refundlawfirm" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                Refund Law Firm
              </a>
            </li>
            <li>
              <a href="https://refundgod.bgng.io/" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                Buy Now
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
