import Link from "next/link";
import HeroBackground from "@/components/HeroBackground";
import PathCard from "@/components/PathCard";
import { getContentBlock } from "@/lib/content";

export const dynamic = "force-dynamic";

const PATHS = [
  {
    href: "/store-list",
    title: "Refund Store List",
    subtitle: "200+ stores across USA, Canada, EU and UK with full limits & timeframes.",
    accent: "gold" as const,
    iconPath: "M3 9l1-5h16l1 5M3 9v11a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V9M3 9h18M9 14h6",
  },
  {
    href: "/our-service",
    title: "Our Service",
    subtitle: "How the refund pipeline works — encrypted, isolated, and fast.",
    accent: "fuchsia" as const,
    iconPath: "M12 2v6m0 8v6m-9-9h6m4 0h6M5 5l4 4m6 6 4 4M5 19l4-4m6-6 4-4",
  },
  {
    href: "/evade-cancelations",
    title: "Evade Cancelations",
    subtitle: "Stop bans, rebills, fraud-score flags. Place big orders without aging.",
    accent: "cyan" as const,
    iconPath: "M12 22s8-4 8-12V5l-8-3-8 3v5c0 8 8 12 8 12z M9 12l2 2 4-4",
  },
  {
    href: "/exclusive-mentorships",
    title: "Exclusive Mentorships",
    subtitle: "1:1 refund & social engineering training. Build your own empire.",
    accent: "violet" as const,
    iconPath: "M3 7l9-4 9 4-9 4-9-4z M3 7v6l9 4 9-4V7 M12 21v-8",
  },
  {
    href: "https://refundgod.bgng.io/",
    external: true,
    title: "Buy Now",
    subtitle: "Stealth/OpSec guides, evasion books, methods & more.",
    accent: "orange" as const,
    iconPath: "M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z M3 6h18 M16 10a4 4 0 0 1-8 0",
  },
];

export default async function HomePage() {
  const [kicker, title, subtitle, ctaLabel, ctaUrl, telegramHeadline] = await Promise.all([
    getContentBlock("hero.kicker"),
    getContentBlock("hero.title"),
    getContentBlock("hero.subtitle"),
    getContentBlock("hero.cta.label"),
    getContentBlock("hero.cta.url"),
    getContentBlock("telegram.headline"),
  ]);

  return (
    <>
      <section className="relative isolate overflow-hidden">
        <HeroBackground />
        <div className="container-px relative z-10 grid min-h-[78vh] place-items-center py-16 md:py-24">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/85 sm:text-sm">
              {kicker}
            </p>
            <h1 className="heading-display mx-auto mt-4 max-w-4xl text-balance text-4xl font-bold leading-tight tracking-tight text-white sm:text-6xl md:text-7xl">
              <span className="bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent">
                {title}
              </span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-balance text-base text-white/65 sm:text-lg">
              {subtitle}
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link href="/store-list" className="btn-primary">
                Browse Store List
              </Link>
              <a href="https://refundgod.bgng.io/" target="_blank" rel="noopener noreferrer" className="btn-ghost">
                Buy Now →
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 5 path cards */}
      <section className="container-px relative -mt-16 pb-24" id="paths">
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PATHS.map((p, i) => (
            <PathCard key={p.href} index={i} {...p} />
          ))}
        </div>
      </section>

      {/* Telegram CTA */}
      <section className="container-px pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-r from-sky-600/30 via-violet-600/25 to-fuchsia-600/30 p-8 sm:p-12">
          <div
            aria-hidden="true"
            className="absolute -right-16 -top-16 h-72 w-72 rounded-full bg-sky-400/30 blur-3xl"
          />
          <div className="relative grid items-center gap-6 sm:grid-cols-[1fr_auto]">
            <h2 className="heading-display max-w-xl text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {telegramHeadline}
            </h2>
            <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
              {ctaLabel}
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
