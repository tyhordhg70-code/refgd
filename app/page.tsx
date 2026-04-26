import HeroBackground from "@/components/HeroBackground";
import Hero3D from "@/components/Hero3D";
import PathCard from "@/components/PathCard";
import Manifesto from "@/components/Manifesto";
import Marquee from "@/components/Marquee";
import StatCounter from "@/components/StatCounter";
import MagneticButton from "@/components/MagneticButton";
import KineticText from "@/components/KineticText";
import MusicPlayer from "@/components/MusicPlayer";
import InteractiveParticles from "@/components/InteractiveParticles";
import AnimatedTelegramBox from "@/components/AnimatedTelegramBox";
import ParallaxIllustration from "@/components/ParallaxIllustration";
import { Reveal } from "@/components/Reveal";
import { getContentBlock } from "@/lib/content";

export const dynamic = "force-dynamic";

const PATHS = [
  { href: "/store-list",            title: "Refund Store List",     illustration: "store"      as const, accent: "gold"    as const },
  { href: "/evade-cancelations",    title: "Evade Cancelations",    illustration: "shield"     as const, accent: "cyan"    as const },
  { href: "/exclusive-mentorships", title: "Exclusive Mentorships", illustration: "chess"      as const, accent: "violet"  as const },
  { href: "https://refundgod.bgng.io/", external: true, title: "Buy Now", illustration: "spark" as const, accent: "orange" as const },
];

const MARQUEE_WORDS = [
  "Refunds", "Replacements", "Mentorships", "Stealth", "Evasion",
  "Tailgating", "SE", "Anonymity", "BUY4U", "CASHOUTS",
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
      {/* Music — only on the home page, scoped to this route. */}
      <MusicPlayer />

      {/* Act 1 — Immersive scroll-driven 3D hero */}
      <Hero3D kicker={kicker} title={title} />

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

      {/* Act 3 — Trust strip / stats with INTERACTIVE PARTICLES backdrop
          (no text overlay behind, no heavy mesh-gradient canvas) */}
      <section className="relative isolate overflow-hidden py-28">
        <div aria-hidden="true" className="absolute inset-0">
          <div className="orb orb-1 absolute left-[5%] top-[10%] h-[55vh] w-[55vh] rounded-full" />
          <div className="orb orb-3 absolute right-[8%] bottom-[5%] h-[45vh] w-[45vh] rounded-full" />
        </div>
        <InteractiveParticles count={70} />
        <div className="container-px relative">
          <div className="mb-12 flex flex-col items-center gap-3 text-center">
            <p className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-amber-300/85">
              — by the numbers
            </p>
          </div>
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { v: 5,    s: "+",   l: "Years operating",  k: "encryption" as const },
              { v: 480,  s: "+",   l: "Curated stores",    k: "store"      as const },
              { v: 100,  s: "k+",  l: "Refunds delivered", k: "spark"      as const },
              { v: 24,   s: "/7",  l: "Telegram support",  k: "globe"      as const },
            ].map((stat, i) => (
              <Reveal key={stat.l} delay={i * 0.1}>
                <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-white/[0.03] p-6 backdrop-blur-md transition hover:border-white/15 hover:bg-white/[0.05]">
                  <div className="absolute -right-6 -top-6 opacity-25 transition group-hover:opacity-60">
                    <ParallaxIllustration kind={stat.k} accent={["amber","violet","cyan","fuchsia"][i] as any} size={140} />
                  </div>
                  <div className="relative">
                    <div className="heading-display text-aurora text-6xl font-bold leading-none tracking-tight sm:text-7xl">
                      <StatCounter value={stat.v} suffix={stat.s} />
                    </div>
                    <div className="mt-3 text-xs font-semibold uppercase tracking-[0.3em] text-white/65">
                      {stat.l}
                    </div>
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
          {/* Header — magazine style — wrapped in a backdrop-blur card so
              the headline is always readable over the cosmos */}
          <div className="mb-16 grid items-end gap-8 sm:grid-cols-[1fr_auto] sm:mb-20">
            <div
              className="rounded-[2rem] px-2 py-2"
              style={{
                background:
                  "linear-gradient(180deg, rgba(10,12,20,0.0), rgba(10,12,20,0.0))",
              }}
            >
              <p className="heading-display text-xs font-semibold uppercase tracking-[0.45em] text-amber-300 sm:text-sm drop-shadow-[0_0_20px_rgba(245,185,69,0.5)]">
                — chapter 01 / paths
              </p>
              <KineticText
                as="h2"
                text="Choose your path to mastery."
                className="editorial-display mt-5 text-balance bg-gradient-to-b from-white via-white to-amber-200 bg-clip-text text-transparent text-[clamp(2.25rem,7vw,6rem)] uppercase drop-shadow-[0_8px_40px_rgba(0,0,0,0.85)]"
              />
            </div>
            <p className="max-w-sm text-base leading-relaxed text-white/75">
              Five doors. Behind each, a craft refined by years of work
              under glass — chosen, not assigned.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
            {PATHS.map((p, i) => (
              <PathCard key={p.href} index={i} {...p} />
            ))}
          </div>
        </div>
      </section>

      {/* Act 5 — Telegram CTA, animated illustration replaces static image */}
      <section className="container-px pb-32">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-white/[0.10] pulse-glow-violet">
            <div className="relative aspect-[16/9] sm:aspect-[16/6]">
              <AnimatedTelegramBox />
              <div className="container-px absolute inset-0 grid items-center">
                <div className="grid items-center gap-10 sm:grid-cols-[1fr_auto]">
                  <div>
                    <p className="heading-display text-[10px] font-semibold uppercase tracking-[0.45em] text-amber-200/85 sm:text-xs">
                      — join the channel
                    </p>
                    <h2 className="editorial-display mt-3 max-w-2xl text-balance bg-gradient-to-b from-white to-white/70 bg-clip-text text-transparent text-3xl uppercase sm:text-5xl md:text-6xl drop-shadow-[0_8px_40px_rgba(0,0,0,0.85)]">
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
