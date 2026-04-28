import PathCard from "@/components/PathCard";
import MusicPlayer from "@/components/MusicPlayer";
import AnimatedTelegramBox from "@/components/AnimatedTelegramBox";
import ParallaxChapter from "@/components/ParallaxChapter";
import ParallaxIllustration from "@/components/ParallaxIllustration";
import EditableText from "@/components/EditableText";
import HomeCTAButton from "@/components/HomeCTAButton";
import HomeBackground from "@/components/HomeBackground";
import CosmicJourney from "@/components/CosmicJourney";
import PathCardCameraFly from "@/components/PathCardCameraFly";
import PathsHorizontalReveal from "@/components/PathsHorizontalReveal";
import ScrollRain from "@/components/ScrollRain";
import ChapterCosmos from "@/components/ChapterCosmos";
import PathsReveal from "@/components/PathsReveal";
import { Reveal } from "@/components/Reveal";
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
      {/* Music — only on the home page, scoped to this route. */}
      <MusicPlayer />

      {/* Page-wide animated cosmos — keeps the WELCOME backdrop alive
          across every chapter. Sits above the global galaxy field but
          below the page content. */}
      <HomeBackground />

      {/* Scroll-driven streak shower — cosmic light "rains" past the
          camera and intensifies with scroll velocity. Pure CSS streaks
          driven by a single scroll listener so it stays cheap. */}
      <ScrollRain />

      <ReorderableContainer pageId="home">
        <ReorderableSection sectionId="hero">
          {/* Act 1 — sustained 3D storytelling cosmic journey. The whole
              hero + warp arc is a single scene so the story extends from
              the very first scroll all the way into chapter 01. */}
          <CosmicJourney kicker={kicker} />
        </ReorderableSection>

        <ReorderableSection sectionId="paths" className="relative z-10">
          {/* Act 2 — Chapter 01 / Path picker. The CosmicJourney above is
              now a single-viewport (100svh) auto-playing scene, so we no
              longer need a 55–60vh negative margin to stitch the two
              acts together — the warp resolves and this section flows
              cleanly underneath it. */}
          <ParallaxChapter
            intensity={0.5}
            className="pb-20 pt-0"
          >
            <section id="paths" className="relative">
              {/* Cosmic accent that continues the journey vibe behind
                  the chapter intro. */}
              <ChapterCosmos />
              <PathsReveal>
                <div className="container-wide relative">
                  {/* The headline is rendered "in space" — no opaque
                      glass card, no border, no backdrop blur. This is
                      what makes the section read as a continuation of
                      the warp instead of a separate page with a white
                      overlay sitting on top. */}
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
                  {/* 5 cards.
                      • Desktop / tablet (≥ 768px): 1 / 2 / 3 / 5 grid
                        with each card wrapped in a 3D camera fly-by
                        (diagonal zoom + sideways motion from its own
                        anchor) so the row reveals like a coordinated
                        camera move.
                      • Mobile (< 768px): the row pins inside a tall
                        scroll runway and translates HORIZONTALLY as
                        the user scrolls vertically — a cinematic
                        sideways camera track that exposes one card
                        at a time. After the last card the runway ends
                        and vertical scroll resumes for the next
                        section. See PathsHorizontalReveal. */}
                  <PathsHorizontalReveal
                    cards={PATHS.map((p, i) => (
                      <PathCard key={p.href} index={i} {...p} />
                    ))}
                    desktopFallback={
                      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3 xl:grid-cols-5">
                        {PATHS.map((p, i) => (
                          <PathCardCameraFly key={p.href} index={i}>
                            <PathCard index={i} {...p} />
                          </PathCardCameraFly>
                        ))}
                      </div>
                    }
                  />
                </div>
              </PathsReveal>
            </section>
          </ParallaxChapter>
        </ReorderableSection>

        <ReorderableSection sectionId="telegram">
          {/* Act 3 — Telegram CTA, animated illustration.
              No bottom padding + a smooth dark fade-out so the
              section bleeds straight into the footer with NO visible
              "bright strip" of cosmic background between them. */}
          <ParallaxChapter
            intensity={0.4}
            className="relative pb-0 sm:pb-0"
            bgClassName="absolute inset-0 grid place-items-center opacity-25"
            bg={<ParallaxIllustration kind="spark" accent="violet" size={620} />}
          >
            <section className="container-px pb-10 sm:pb-14">
              <Reveal>
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
                        {/* CTA URL + label flow through the EditContext too so an
                            admin can edit them inline; the magnetic hover
                            effect is preserved by HomeCTAButton. */}
                        <HomeCTAButton defaultUrl={ctaUrl} defaultLabel={ctaLabel} />
                      </div>
                    </div>
                  </div>
                </div>
              </Reveal>
            </section>
            {/* Seamless dark fade into the footer — kills the
                "bright cosmic strip" that previously appeared between
                the Telegram CTA and the dark footer. The gradient
                eases the page-wide galaxy background down to the
                footer's solid color so the transition is invisible. */}
            <div
              aria-hidden="true"
              className="pointer-events-none relative h-24 w-full sm:h-32"
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
