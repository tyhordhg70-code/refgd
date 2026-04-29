import PathCard from "@/components/PathCard";
import MusicPlayer from "@/components/MusicPlayer";
import AnimatedTelegramBox from "@/components/AnimatedTelegramBox";
import ParallaxChapter from "@/components/ParallaxChapter";
import ParallaxIllustration from "@/components/ParallaxIllustration";
import EditableText from "@/components/EditableText";
import HomeCTAButton from "@/components/HomeCTAButton";
import HomeBackground from "@/components/HomeBackground";
import CosmicJourney from "@/components/CosmicJourney";
import PathsHorizontalReveal from "@/components/PathsHorizontalReveal";
import ChapterCosmos from "@/components/ChapterCosmos";
import MeshExpansionReveal from "@/components/MeshExpansionReveal";
import { getContentBlock } from "@/lib/content";
import { ReorderableContainer, ReorderableSection } from "@/components/ReorderableSection";

export const dynamic = "force-dynamic";

const PATHS = [
  { href: "/store-list",            title: "Refund Store List",     illustration: "store"   as const, accent: "gold"    as const },
  { href: "/evade-cancelations",    title: "Evade Cancelations",    illustration: "shield"  as const, accent: "cyan"    as const },
  { href: "/exclusive-mentorships", title: "Exclusive Mentorships", illustration: "mastery" as const, accent: "violet"  as const },
  { href: "https://refundgod.bgng.io/", external: true, title: "Shop Methods", illustration: "spark" as const, accent: "orange" as const },
  { href: "https://t.me/refundlawfirm", external: true, title: "BUY 4 YOU",    illustration: "buy4you" as const, accent: "fuchsia" as const },
];

export default async function HomePage() {
  // Server-render the resolved values once so the page looks correct
  // even before React hydrates and the EditContext takes over.
  const [kicker, ctaLabel, ctaUrl, telegramHeadline, pathsKicker, pathsTitle, pathsLead] =
    await Promise.all([
      getContentBlock("hero.kicker"),
      getContentBlock("hero.cta.label"),
      getContentBlock("hero.cta.url"),
      getContentBlock("telegram.headline"),
      getContentBlock("home.paths.kicker"),
      getContentBlock("home.paths.title"),
      getContentBlock("home.paths.lead"),
    ]);

  return (
    <>
      <MusicPlayer />
      <HomeBackground />

      <ReorderableContainer pageId="home">
        <ReorderableSection sectionId="hero">
          {/* Act 1 — load-once welcome scene. Plays a self-contained
              ~2.8s warp animation on mount, then the very first scroll
              attempt smooth-scrolls the page directly to the paths
              section below while the welcome flies away in 3D. The
              fly-away is REVERSIBLE: scroll back up and the welcome
              re-appears. */}
          <CosmicJourney kicker={kicker} />
        </ReorderableSection>

        <ReorderableSection sectionId="paths" className="relative z-10">
          {/*
            Mobile note: paths section uses a tighter pb-8 on phones
            because the carousel + pagination dots already supply
            ample bottom padding. The previous pb-20 stacked with the
            telegram aspect-[4/5] box height (~447 px) and the bottom
            gradient bar (h-24) to make the page feel ~300 px longer
            than the user expected, with a noticeable empty void
            between the path cards and the "Stay up to speed" CTA.
            Desktop keeps pb-20 for comfortable rhythm at wider sizes.
          */}
          <ParallaxChapter
            intensity={0.5}
            className="pb-8 pt-0 sm:pb-20"
          >
            {/*
             * The paths section. There is NO PathsReveal wrapper here
             * any more — that wrapper had `initial: { opacity: 0 }`
             * which (a) made the entire section invisible until its
             * own in-view trigger fired, leaving the user staring at
             * empty space when they smooth-scrolled into it, and (b)
             * applied a translateY(50px) initial transform that
             * shifted the bbox of every descendant, throwing off
             * smooth-scroll target calculations and clipping the
             * headline above the viewport.
             *
             * Now the headline sits at its natural position from the
             * very first paint, and each card animates IN on its
             * own via FlyInCard (3D fly-in, viewport: { once: false }
             * so it REPLAYS on scroll up + scroll down).
             */}
            <section id="paths" className="relative">
              <ChapterCosmos />
              <div className="container-wide relative">
                <div className="paths-intro mb-14 px-2 sm:mb-16 sm:px-0">
                  <div className="grid items-end gap-8 sm:grid-cols-[1fr_auto]">
                    <div>
                      <EditableText
                        id="home.paths.kicker"
                        defaultValue={pathsKicker || "— you have arrived"}
                        as="p"
                        className="heading-display text-xs font-semibold uppercase tracking-[0.45em] text-amber-300 sm:text-sm [text-shadow:0_2px_18px_rgba(0,0,0,0.85),0_0_22px_rgba(255,237,180,0.35)]"
                      />
                      <EditableText
                        id="home.paths.title"
                        defaultValue={pathsTitle || "Choose your path to mastery."}
                        as="h2"
                        className="editorial-display mt-5 text-balance text-white text-[clamp(2.25rem,7vw,6rem)] uppercase [text-shadow:0_4px_40px_rgba(0,0,0,0.95),0_0_30px_rgba(167,139,250,0.35)]"
                      />
                    </div>
                    <EditableText
                      id="home.paths.lead"
                      defaultValue={
                        pathsLead ||
                        "Four doors. Behind each, a craft refined by years of work under glass — chosen, not assigned."
                      }
                      as="p"
                      multiline
                      className="max-w-sm text-base leading-relaxed text-white/90 [text-shadow:0_2px_14px_rgba(0,0,0,0.85)]"
                    />
                  </div>
                </div>
                {/*
                 * PathsHorizontalReveal:
                 *   • desktop / tablet ≥ 768px → responsive grid
                 *     (2 → 3 → 5 cols), each card flies in with the
                 *     cinematic 3D entrance (FlyInCard).
                 *   • mobile < 768px → native CSS scroll-snap
                 *     horizontal carousel (no scroll-jacking, no
                 *     sticky pin); each card gets the same fly-in.
                 *
                 * NOTE: we deliberately do NOT pass `desktopFallback`
                 * any more — the previous fallback rendered cards
                 * WITHOUT the FlyInCard wrapper, which is why the
                 * desktop cards weren't flying in. The component's
                 * built-in mapping wraps every card in FlyInCard.
                 */}
                <PathsHorizontalReveal
                  cards={PATHS.map((p, i) => (
                    <PathCard key={p.href} index={i} {...p} />
                  ))}
                />
              </div>
            </section>
          </ParallaxChapter>
        </ReorderableSection>

        <ReorderableSection sectionId="telegram">
          <ParallaxChapter
            intensity={0.4}
            className="relative pb-0 sm:pb-0"
            bgClassName="absolute inset-0 grid place-items-center opacity-25"
            bg={<ParallaxIllustration kind="spark" accent="violet" size={620} />}
          >
            <section className="container-px pb-10 sm:pb-14">
              {/* "Stay up to speed" CTA — wrapped in a 3D distorted-mesh
                  expansion entrance: the box folds out of depth while a
                  wireframe grid detonates outward from its centre,
                  ripples through a turbulence filter and fades away.
                  Replays every time the section re-enters view. */}
              <MeshExpansionReveal borderRadius="2.5rem">
                <div className="relative overflow-hidden rounded-[2.5rem] border border-white/[0.10] pulse-glow-violet">
                  <div className="relative aspect-[4/5] sm:aspect-[16/6]">
                    <AnimatedTelegramBox />
                    <div className="container-px absolute inset-0 grid items-center">
                      <div className="grid items-center gap-10 sm:grid-cols-[1fr_auto]">
                        <div>
                          <EditableText
                            id="telegram.kicker"
                            defaultValue="— join the channel"
                            as="p"
                            className="heading-display text-[10px] font-semibold uppercase tracking-[0.45em] text-amber-200 sm:text-xs"
                          />
                          <EditableText
                            id="telegram.headline"
                            defaultValue={telegramHeadline}
                            as="h2"
                            multiline
                            className="editorial-display mt-3 max-w-2xl text-balance text-white text-3xl uppercase sm:text-5xl md:text-6xl"
                          />
                        </div>
                        <HomeCTAButton defaultUrl={ctaUrl} defaultLabel={ctaLabel} />
                      </div>
                    </div>
                  </div>
                </div>
              </MeshExpansionReveal>
            </section>
            {/* Decorative fade-to-footer gradient. On mobile h-12
                (was h-24) — the gradient itself is decorative, and a
                tall version of it on mobile contributed visible empty
                vertical space below the telegram CTA, making the page
                feel longer than necessary. Desktop keeps h-32. */}
            <div
              aria-hidden="true"
              className="pointer-events-none relative h-12 w-full sm:h-32"
              style={{
                background:
                  "linear-gradient(to bottom, rgba(5,6,10,0) 0%, rgba(5,6,10,0.6) 45%, rgb(10,12,20) 100%)",
              }}
            />
          </ParallaxChapter>
        </ReorderableSection>
      </ReorderableContainer>
    </>
  );
}
