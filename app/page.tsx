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
  { href: "https://refundgod.bgng.io/", external: true, title: "Shop Methods", illustration: "spark" as const, accent: "orange" as const },
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

      {/* Act 3 — Trust strip / stats. Solid card backdrop so numbers
          read clean over the galaxy. */}
      <section className="relative isolate overflow-hidden py-28">
        <InteractiveParticles count={70} />
        <div className="container-px relative">
          <div className="mb-12 flex flex-col items-center gap-3 text-center">
            <p className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-amber-300">
              — by the numbers
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { v: 5,    s: "+",   l: "Years operating",  k: "encryption" as const, c: "amber"   as const },
              { v: 480,  s: "+",   l: "Curated stores",    k: "store"      as const, c: "violet"  as const },
              { v: 100,  s: "k+",  l: "Refunds delivered", k: "spark"      as const, c: "cyan"    as const },
              { v: 24,   s: "/7",  l: "Telegram support",  k: "globe"      as const, c: "fuchsia" as const },
            ].map((stat, i) => (
              <Reveal key={stat.l} delay={i * 0.1}>
                <div
                  className="group relative overflow-hidden rounded-3xl border border-white/15 p-7 transition hover:border-amber-300/50"
                  style={{
                    background:
                      "linear-gradient(160deg, rgba(15,10,30,0.85), rgba(8,6,18,0.92))",
                    backdropFilter: "blur(8px)",
                    WebkitBackdropFilter: "blur(8px)",
                    boxShadow: "0 30px 80px -30px rgba(0,0,0,0.7)",
                  }}
                >
                  {/* Illustration — clipped to a corner badge with low
                      opacity so it CANNOT cover the digits. */}
                  <div
                    className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 opacity-25 mix-blend-screen transition group-hover:opacity-50"
                    aria-hidden="true"
                  >
                    <ParallaxIllustration kind={stat.k} accent={stat.c} size={140} />
                  </div>
                  <div className="relative">
                    <div
                      className="heading-display text-6xl font-bold leading-none tracking-tight text-white sm:text-7xl"
                      style={{ textShadow: "0 4px 30px rgba(0,0,0,0.95)" }}
                    >
                      <StatCounter value={stat.v} suffix={stat.s} />
                    </div>
                    <div className="mt-4 text-xs font-semibold uppercase tracking-[0.3em] text-white/85">
                      {stat.l}
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Act 4 — Path picker. Solid backdrop card so the headline POPS
          even over the galaxy. */}
      <section className="relative pb-24 pt-12 sm:pt-20" id="paths">
        <div className="container-wide relative">
          <div
            className="mb-16 rounded-[2.5rem] border border-white/10 px-6 py-10 sm:mb-20 sm:px-12 sm:py-14"
            style={{
              background:
                "linear-gradient(160deg, rgba(15,10,30,0.85), rgba(8,6,18,0.92))",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              boxShadow: "0 40px 120px -40px rgba(0,0,0,0.8)",
            }}
          >
            <div className="grid items-end gap-8 sm:grid-cols-[1fr_auto]">
              <div>
                <p
                  className="heading-display text-xs font-semibold uppercase tracking-[0.45em] text-amber-300 sm:text-sm"
                  style={{ textShadow: "0 0 30px rgba(245,185,69,0.6)" }}
                >
                  — chapter 01 / paths
                </p>
                <KineticText
                  as="h2"
                  text="Choose your path to mastery."
                  className="editorial-display mt-5 text-balance text-white text-[clamp(2.25rem,7vw,6rem)] uppercase"
                  style={{ textShadow: "0 4px 40px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.95)" }}
                />
              </div>
              <p className="max-w-sm text-base leading-relaxed text-white/90">
                Four doors. Behind each, a craft refined by years of work
                under glass — chosen, not assigned.
              </p>
            </div>
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
                    <p
                      className="heading-display text-[10px] font-semibold uppercase tracking-[0.45em] text-amber-200 sm:text-xs"
                      style={{ textShadow: "0 0 18px rgba(245,185,69,0.55)" }}
                    >
                      — join the channel
                    </p>
                    <h2
                      className="editorial-display mt-3 max-w-2xl text-balance text-white text-3xl uppercase sm:text-5xl md:text-6xl"
                      style={{ textShadow: "0 4px 30px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.85)" }}
                    >
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
