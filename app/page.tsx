import HeroBackground from "@/components/HeroBackground";
import Hero3D from "@/components/Hero3D";
import PathCard from "@/components/PathCard";
import { ScrollFloatImage } from "@/components/ScrollReveal3D";
import Image from "next/image";
import { getContentBlock } from "@/lib/content";

export const dynamic = "force-dynamic";

/**
 * Original 5 path boxes from refundgod.io — preserved order, original wording,
 * now with on-brand AI-generated dark/cinematic visuals (one per accent).
 */
const PATHS = [
  { href: "/store-list",            title: "Refund Store List",  imageSrc: "/images/path-store-list.png", accent: "gold"    as const },
  { href: "/our-service",           title: "Our Service",        imageSrc: "/images/path-service.png",    accent: "fuchsia" as const },
  { href: "/evade-cancelations",    title: "Evade Cancelations", imageSrc: "/images/path-evade.png",      accent: "cyan"    as const },
  { href: "/exclusive-mentorships", title: "Exclusive Mentorships", imageSrc: "/images/path-mentorship.png", accent: "violet" as const },
  { href: "https://refundgod.bgng.io/", external: true, title: "Buy Now", imageSrc: "/images/path-buy.png", accent: "orange" as const },
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
      {/* Cinematic 3D hero — full viewport, mouse + scroll parallax. */}
      <Hero3D
        src="/images/hero-main.png"
        alt="RefundGod"
        kicker={kicker}
        title={title}
      />

      {/* Path picker — drifting 3D-tilt cards on a backdrop of soft glows. */}
      <section className="relative pb-24 pt-12 sm:pt-20" id="paths">
        <HeroBackground />
        <div className="container-px relative">
          <div className="mb-12 text-center sm:mb-16">
            <p className="heading-display text-xs font-semibold uppercase tracking-[0.45em] text-amber-300/85 sm:text-sm">
              Choose your path to mastery
            </p>
            <p className="mt-3 max-w-xl mx-auto text-sm text-white/60 sm:text-base">
              Five doors. Behind each, a craft refined by years of work.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-5">
            {PATHS.map((p, i) => (
              <PathCard key={p.href} index={i} {...p} />
            ))}
          </div>
        </div>
      </section>

      {/* Telegram CTA — full-bleed liquid neon background with floating image. */}
      <section className="container-px pb-24">
        <div className="relative overflow-hidden rounded-3xl border border-white/10">
          <div className="relative aspect-[16/7] sm:aspect-[16/5]">
            <Image
              src="/images/telegram-cta-bg.png"
              alt=""
              fill
              sizes="100vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-ink-950/85 via-ink-950/55 to-ink-950/85" />
            <div className="container-px absolute inset-0 grid items-center">
              <ScrollFloatImage amount={20}>
                <div className="grid items-center gap-6 sm:grid-cols-[1fr_auto]">
                  <h2 className="heading-display max-w-xl text-2xl font-bold tracking-tight text-white sm:text-4xl">
                    {telegramHeadline}
                  </h2>
                  <a href={ctaUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">
                    {ctaLabel}
                  </a>
                </div>
              </ScrollFloatImage>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
