import HeroBackground from "@/components/HeroBackground";
import PathCard from "@/components/PathCard";
import SplashArt from "@/components/SplashArt";
import { getContentBlock } from "@/lib/content";

export const dynamic = "force-dynamic";

/**
 * Original 5 path boxes from refundgod.io (preserved order, original wording).
 * - Refund Store List   → /store-list
 * - Our Service         → /our-service
 * - Evade Cancelations  → /evade-cancelations
 * - Exclusive Mentorships → /exclusive-mentorships
 * - Buy Now             → external bgng.io
 *
 * No "Browse Store List"/"Buy Now" sub-buttons (removed per spec); the
 * card itself is the link.
 */
const PATHS = [
  {
    href: "/store-list",
    title: "Refund Store List",
    imageSrc: "/images/box-art.png",
    accent: "gold" as const,
  },
  {
    href: "/our-service",
    title: "Our Service",
    imageSrc: "/images/splash-1.png",
    accent: "fuchsia" as const,
  },
  {
    href: "/evade-cancelations",
    title: "Evade Cancelations",
    imageSrc: "/images/splash-2.png",
    accent: "cyan" as const,
  },
  {
    href: "/exclusive-mentorships",
    title: "Exclusive Mentorships",
    imageSrc: "/images/splash-3.png",
    accent: "violet" as const,
  },
  {
    href: "https://refundgod.bgng.io/",
    external: true,
    title: "Buy Now",
    imageSrc: "/images/box-art.png",
    accent: "orange" as const,
  },
];

export default async function HomePage() {
  const [kicker, title, ctaLabel, ctaUrl, telegramHeadline] = await Promise.all([
    getContentBlock("hero.kicker"),
    getContentBlock("hero.title"),
    getContentBlock("hero.cta.label"),
    getContentBlock("hero.cta.url"),
    getContentBlock("telegram.headline"),
  ]);

  return (
    <>
      {/* Hero — splash art + welcome text only. NO subtitle, NO CTA buttons. */}
      <section className="relative isolate overflow-hidden">
        <HeroBackground />
        <SplashArt src="/images/splash-1.png" alt="RefundGod" />
        <div className="container-px relative z-10 grid min-h-[68vh] place-items-end pb-8 pt-[42vh] sm:pt-[44vh]">
          <div className="text-center">
            <p className="heading-display text-base font-medium lowercase tracking-[0.4em] text-amber-200/85 sm:text-lg">
              {kicker}
            </p>
            <h1 className="heading-display mx-auto mt-3 max-w-4xl text-balance text-3xl font-bold uppercase leading-tight tracking-tight text-white sm:text-5xl md:text-6xl">
              <span className="bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-transparent">
                {title}
              </span>
            </h1>
          </div>
        </div>
      </section>

      {/* Original 5 path cards — full bleed on mobile, 5-up on wide */}
      <section className="container-px relative pb-20" id="paths">
        <div className="grid grid-cols-2 gap-4 sm:gap-5 md:grid-cols-3 lg:grid-cols-5">
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
            className="absolute -right-16 -top-16 h-72 w-72 animate-pulseGlow rounded-full bg-sky-400/30 blur-3xl"
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
