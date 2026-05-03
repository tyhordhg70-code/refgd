import PathCard from "@/components/PathCard";
import MusicPlayer from "@/components/MusicPlayer";
import AnimatedTelegramBox from "@/components/AnimatedTelegramBox";
import ParallaxChapter from "@/components/ParallaxChapter";
import ParallaxIllustration from "@/components/ParallaxIllustration";
import MeshExpansionReveal from "@/components/MeshExpansionReveal";
import EditableText from "@/components/EditableText";
import HomeCTAButton from "@/components/HomeCTAButton";
import HomeBackground from "@/components/HomeBackground";
import CosmicJourney from "@/components/CosmicJourney";
import PathsHorizontalReveal from "@/components/PathsHorizontalReveal";
import ChapterCosmos from "@/components/ChapterCosmos";
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
            className="pb-6 pt-0 sm:pb-8"
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
                {/*
                  Compact mobile intro: tighter top margin (mb-6),
                  smaller headline (clamp 1.6rem floor), kicker
                  bumped down to text-[10px], and the long lead
                  paragraph hidden on phones. Combined these free
                  ~180-220 px of vertical space so that after the
                  welcome→paths snap the FULL carousel + pagination
                  dots + "Swipe to choose your door" caption all fit
                  in the viewport. Without this, the lead paragraph
                  pushed the swipe caption below the iOS Safari fold.
                */}
                <div className="paths-intro mb-4 px-2 sm:mb-8 sm:px-0">
                  <div className="grid items-end gap-4 sm:grid-cols-[1fr_auto] sm:gap-8">
                    <div>
                      <EditableText
                        id="home.paths.kicker"
                        defaultValue={pathsKicker || "— you have arrived"}
                        as="p"
                        className="heading-display text-[10px] font-semibold uppercase tracking-[0.4em] text-amber-300 sm:text-sm sm:tracking-[0.45em] [text-shadow:0_2px_18px_rgba(0,0,0,0.85),0_0_22px_rgba(255,237,180,0.35)]"
                      />
                      <EditableText
                        id="home.paths.title"
                        defaultValue={pathsTitle || "Choose your path to mastery."}
                        as="h2"
                        className="editorial-display mt-2 text-balance text-white text-[clamp(1.4rem,3vw,2.8rem)] uppercase leading-[1.05] sm:mt-4 [text-shadow:0_4px_40px_rgba(0,0,0,0.95),0_0_30px_rgba(167,139,250,0.35)]"
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
                      className="hidden max-w-sm text-base leading-relaxed text-white/90 sm:block [text-shadow:0_2px_14px_rgba(0,0,0,0.85)]"
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
            {/*
              Mobile snap target: with native CSS scroll-snap on the
              <html> element (see globals.css `@media (max-width:
              767px)` block), this section's `scroll-snap-align:
              start` makes the browser softly land scroll near the
              telegram block's top — fixing "scroll past cards skips
              telegram" without any JS scroll-jacking. Proximity (not
              mandatory) means the snap only triggers when the user
              naturally lands close, so it never hijacks scrolling
              away from where the user actually wants to go.

              `scroll-margin-top: 12vh` shifts the snap landing
              point so the headline appears below the page header
              with breathing room. Without it the section's top
              would snap right under the iOS status bar.
            */}
            <section
              id="telegram"
              data-telegram-snap
              className="container-px pb-10 sm:pb-14 [scroll-margin-top:12vh] [scroll-snap-align:start] [scroll-snap-stop:normal]"
            >
              {/* "Stay up to speed" CTA — the box is statically
                  positioned (always present, no fold-in entrance). The
                  distorted-mesh wireframe shockwave that detonates over
                  it is triggered ONLY when the user has SETTLED on the
                  box (≥ 50 % in view + scroll idle ≥ 400 ms) so the
                  user actually sees the cinematic burst rather than
                  having it fire while their eye is still tracking the
                  scroll past it. */}
              <MeshExpansionReveal borderRadius="2.5rem">
                {/* v6.13.16 — Removed `sm:pulse-glow-violet`. The user
                    reported "home page glows instead of black"; the
                    actual source was THIS Telegram CTA wrapper, not
                    the path cards. The pulse-glow-violet class threw
                    a continuous violet halo box-shadow around the
                    16:6 cinematic CTA box on every viewport ≥ sm,
                    which read as the dominant "glow" on the page.
                    Replaced with a neutral dark drop-shadow that
                    keeps the card visually grounded without colour
                    bleed. The animated mesh shockwave + the inner
                    AnimatedTelegramBox both still fire on view, so
                    the section keeps its kinetic energy without the
                    always-on accent halo. */}
                <div className="relative overflow-hidden rounded-[2.5rem] border border-white/[0.10] sm:shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)]">
                  {/*
                    v6.13.1: removed the mobile aspect-[4/5] lock.
                    The previous 4:5 aspect ratio + overflow:hidden
                    on the parent was clipping the bottom of the
                    telegram block on iOS — the headline + CTA
                    grid was taller than the box's computed height.
                    Mobile now sizes naturally to the content
                    (with min-h to keep visual presence + py for
                    breathing room). Desktop keeps the 16:6 cinematic
                    aspect ratio.
                  */}
                  <div className="relative min-h-[480px] py-12 sm:min-h-0 sm:py-0 sm:aspect-[16/6]">
                    <AnimatedTelegramBox />
                    <div className="container-px relative grid h-full items-center sm:absolute sm:inset-0">
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
            {/* v6.7 — REMOVED the decorative fade-to-footer gradient.
                The opaque rgb(10,12,20) bottom stop was rendering as a
                solid black bar across the bottom of the homepage on
                top of the global galaxy backdrop. The page now ends
                cleanly into the galaxy with no extra dark band. */}
          </ParallaxChapter>
        </ReorderableSection>
      </ReorderableContainer>
    </>
  );
}
