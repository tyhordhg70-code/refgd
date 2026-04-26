import HeroBackground from "@/components/HeroBackground";
import Hero3D from "@/components/Hero3D";
import PathCard from "@/components/PathCard";
import Manifesto from "@/components/Manifesto";
import Marquee from "@/components/Marquee";
import StatCounter from "@/components/StatCounter";
import GlassCard from "@/components/GlassCard";
import MagneticButton from "@/components/MagneticButton";
import KineticText from "@/components/KineticText";
import { Reveal } from "@/components/Reveal";
import Image from "next/image";
import { getContentBlock } from "@/lib/content";

export const dynamic = "force-dynamic";

const PATHS = [
  { href: "/store-list",            title: "Refund Store List",  imageSrc: "/images/path-store-list.png", accent: "gold"    as const },
  { href: "/store-list#service",    title: "Our Service",        imageSrc: "/images/path-service.png",    accent: "fuchsia" as const },
  { href: "/evade-cancelations",    title: "Evade Cancelations", imageSrc: "/images/path-evade.png",      accent: "cyan"    as const },
  { href: "/exclusive-mentorships", title: "Exclusive Mentorships", imageSrc: "/images/path-mentorship.png", accent: "violet" as const },
  { href: "https://refundgod.bgng.io/", external: true, title: "Buy Now", imageSrc: "/images/path-buy.png", accent: "orange" as const },
];

const MARQUEE_WORDS = [
  "Refunds", "Replacements", "Mentorships", "Stealth", "Evasion",
  "Tailgating", "SE", "Anonymity", "Fraud Score", "Resells",
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
      {/* Act 1 — Cinematic 3D hero with kinetic edge-to-edge typography. */}
      <Hero3D
        src="/images/hero-main.png"
        alt="RefundGod"
        kicker={kicker}
        title={title}
      />

      {/* Marquee ribbon — DeSo editorial */}
      <section className="relative -mt-24 border-y border-white/[0.06] bg-ink-950/80 py-8 backdrop-blur-xl sm:py-10">
        <Marquee speed={70}>
          {MARQUEE_WORDS.map((w, i) => (
            <span
              key={i}
              className="heading-display flex items-center gap-12 text-[clamp(2rem,5vw,4rem)] font-bold uppercase leading-none tracking-tight"
            >
              <span className={i % 2 === 0 ? "text-white" : "text-aurora"}>{w}</span>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-amber-300/60">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3" />
              </svg>
            </span>
          ))}
        </Marquee>
      </section>

      {/* Act 2 — Manifesto: scroll-pinned oversized typography */}
      <Manifesto
        caption="welcome — what we do"
        words={["Refunds.", "Replacements.", "Mentorships.", "Mastery."]}
      />

      {/* Act 3 — Trust strip / stats */}
      <section className="relative py-24">
        <HeroBackground />
        <div className="container-px relative">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { v: 5,    s: "+",   l: "Years operating" },
              { v: 480,  s: "+",   l: "Curated stores" },
              { v: 100,  s: "k+",  l: "Refunds delivered" },
              { v: 24,   s: "/7",  l: "Telegram support" },
            ].map((stat, i) => (
              <Reveal key={stat.l} delay={i * 0.1}>
                <div className="border-l border-white/10 pl-6">
                  <div className="heading-display text-aurora text-6xl font-bold leading-none tracking-tight sm:text-7xl">
                    <StatCounter value={stat.v} suffix={stat.s} />
                  </div>
                  <div className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/55">
                    {stat.l}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Act 4 — Path picker (asymmetric magazine layout) */}
      <section className="relative pb-24 pt-12 sm:pt-20" id="paths">
        <HeroBackground />
        <div className="container-wide relative">
          {/* Header — magazine style */}
          <div className="mb-16 grid items-end gap-8 sm:grid-cols-[1fr_auto] sm:mb-20">
            <div>
              <p className="heading-display text-xs font-semibold uppercase tracking-[0.45em] text-amber-300/85 sm:text-sm">
                — chapter 01 / paths
              </p>
              <KineticText
                as="h2"
                text="Choose your path to mastery."
                className="editorial-display mt-5 text-balance bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent text-[clamp(2.5rem,7vw,6rem)] uppercase"
              />
            </div>
            <p className="max-w-sm text-base leading-relaxed text-white/55">
              Five doors. Behind each, a craft refined by years of work
              under glass — chosen, not assigned.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-5 sm:gap-6 md:grid-cols-3 lg:grid-cols-5">
            {PATHS.map((p, i) => (
              <PathCard key={p.href} index={i} {...p} />
            ))}
          </div>
        </div>
      </section>

      {/* Act 5 — Telegram CTA, glass-ribbon over cinematic image */}
      <section className="container-px pb-32">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/[0.08]">
            <div className="relative aspect-[16/9] sm:aspect-[16/6]">
              <Image
                src="/images/telegram-cta-bg.png"
                alt=""
                fill
                sizes="100vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-ink-950/90 via-ink-950/55 to-ink-950/90" />
              <div className="container-px absolute inset-0 grid items-center">
                <div className="grid items-center gap-10 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="heading-display text-[10px] font-semibold uppercase tracking-[0.45em] text-amber-200/80 sm:text-xs">
                      — join the channel
                    </p>
                    <h2 className="editorial-display mt-3 max-w-2xl text-balance bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent text-3xl uppercase sm:text-5xl md:text-6xl">
                      {telegramHeadline}
                    </h2>
                  </div>
                  <MagneticButton href={ctaUrl} external variant="primary" pull={0.5}>
                    {ctaLabel}
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="m12 19 7-7-7-7" /><path d="M5 12h14" />
                    </svg>
                  </MagneticButton>
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
