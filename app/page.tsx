import Hero3D from "@/components/Hero3D";
import PathCard from "@/components/PathCard";
import MagneticButton from "@/components/MagneticButton";
import MusicPlayer from "@/components/MusicPlayer";
import AnimatedTelegramBox from "@/components/AnimatedTelegramBox";
import ParallaxChapter from "@/components/ParallaxChapter";
import ParallaxIllustration from "@/components/ParallaxIllustration";
import { Reveal } from "@/components/Reveal";
import { getContentBlock } from "@/lib/content";

export const dynamic = "force-dynamic";

/**
 * Home page composition (post-redesign):
 *   1. Immersive 3D hero — only the kicker ("WELCOME") is displayed,
 *      huge and centered. The "Choose your path" headline lives in
 *      the path-picker section just below, so it appears exactly once.
 *   2. Chapter 01 — Path picker (4 animated cards).
 *   3. Telegram CTA box (animated background).
 *
 * The Marquee, Manifesto and Stats sections were intentionally removed
 * per the design brief — the home page now flows directly from hero
 * into the path picker.
 */
const PATHS = [
  { href: "/store-list",            title: "Refund Store List",     illustration: "store"   as const, accent: "gold"    as const },
  { href: "/evade-cancelations",    title: "Evade Cancelations",    illustration: "shield"  as const, accent: "cyan"    as const },
  { href: "/exclusive-mentorships", title: "Exclusive Mentorships", illustration: "mastery" as const, accent: "violet"  as const },
  { href: "https://refundgod.bgng.io/", external: true, title: "Shop Methods", illustration: "spark" as const, accent: "orange" as const },
];

export default async function HomePage() {
  const [kicker, ctaLabel, ctaUrl, telegramHeadline] = await Promise.all([
    getContentBlock("hero.kicker"),
    getContentBlock("hero.cta.label"),
    getContentBlock("hero.cta.url"),
    getContentBlock("telegram.headline"),
  ]);

  return (
    <>
      {/* Music — only on the home page, scoped to this route. */}
      <MusicPlayer />

      {/* Act 1 — Immersive 3D hero (kicker only — large, centered) */}
      <Hero3D kicker={kicker} />

      {/* Act 2 — Chapter 01 / Path picker, wrapped in PARALLAX so the
          background illustration drifts slower than the cards as you
          scroll past — adds the depth promised after the welcome. */}
      <ParallaxChapter
        intensity={0.5}
        className="pb-24 pt-20 sm:pt-28"
        bgClassName="absolute inset-0 grid place-items-center opacity-30"
        bg={<ParallaxIllustration kind="store" accent="amber" size={760} />}
      >
        <section id="paths" className="relative">
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
                  <h2
                    className="editorial-display mt-5 text-balance text-white text-[clamp(2.25rem,7vw,6rem)] uppercase"
                    style={{ textShadow: "0 4px 40px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.95)", lineHeight: 1.02 }}
                  >
                    Choose your path to mastery.
                  </h2>
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
      </ParallaxChapter>

      {/* Act 3 — Telegram CTA, animated illustration. Also parallaxed so
          the depth journey continues all the way to the bottom. */}
      <ParallaxChapter
        intensity={0.4}
        className="pb-32"
        bgClassName="absolute inset-0 grid place-items-center opacity-25"
        bg={<ParallaxIllustration kind="spark" accent="violet" size={620} />}
      >
        <section className="container-px">
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
                        style={{ textShadow: "0 4px 30px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.85)", lineHeight: 1.02 }}
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
      </ParallaxChapter>
    </>
  );
}
