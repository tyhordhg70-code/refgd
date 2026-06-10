
  /* v6.14.0 — Immersive redesign per user request: replace the
     repeating "ChapterHeader + grid of identical GlassCards" shape
     with 7 distinct section components that each have their own
     layout (editorial intro, diagonal-stack solutions, scroll-
     pinned features narrative, full-bleed shield moment, split-
     screen sticky trust, editorial vertical pricing). All admin
     edit ids preserved so every previously-editable field is still
     editable. */
  export const dynamic = "force-dynamic";

  import EvadeHeroPortal from "@/components/EvadeHeroPortal";
  import { ReorderableContainer, ReorderableSection } from "@/components/ReorderableSection";
  import YouTubeTheater from "@/components/YouTubeTheater";
  import PixelRainCosmic from "@/components/PixelRainCosmic";
  import TrailerTitle3D from "@/components/TrailerTitle3D";
  import CyberSubstrate from "@/components/evade/CyberSubstrate";

  import EvadeIntroEditorial from "@/components/evade/EvadeIntroEditorial";
  import EvadeSolutionsStack from "@/components/evade/EvadeSolutionsStack";
  import EvadeFeaturesPinned from "@/components/evade/EvadeFeaturesPinned";
  import EvadeShieldMoment from "@/components/evade/EvadeShieldMoment";
  import EvadeTrustSplit from "@/components/evade/EvadeTrustSplit";
  import EvadePricingShowcase from "@/components/evade/EvadePricingShowcase";

  export const metadata = {
    title: "Evade Cancelations — RefundGod",
    description:
      "Stop bans, rebills, fraud-detection cancelations. Stealth setups, anonymous identities, and step-by-step procedures for placing big orders without aging.",
  };

  /**
   * Evade-Cancelations — Immersive Redesign (v6.14.0)
   *
   * Section flow (each section deliberately has a DIFFERENT layout
   * shape — no two sections share "header + grid of identical cards"):
   *
   *   01 — Hero (ChipScroll cinematic scene)
   *   02 — Trailer (YouTubeTheater)
   *   03 — Pixel-rain transition
   *   04 — Chapter 01 EDITORIAL: oversized "01" + vault art + excerpt
   *        columns (EvadeIntroEditorial)
   *   05 — Chapter 02 DIAGONAL STACK: 3 z-rotated panels with depth
   *        (EvadeSolutionsStack)
   *   06 — Full-bleed SHIELD MOMENT: scroll-pinned scaling shield with
   *        editorial backdrop label (EvadeShieldMoment, replaces the
   *        small floating sec-shield divider)
   *   07 — Chapter 04 SCROLL-PINNED NARRATIVE: 4 features advance
   *        one-at-a-time through a sticky stage (EvadeFeaturesPinned)
   *   08 — Chapter 03 SPLIT-SCREEN STICKY: sticky panel with integrated
   *        trust-reviews backdrop on the left, scrolling editorial
   *        testimonial column on the right (EvadeTrustSplit, replaces
   *        the orphan trust-reviews divider AND the 3-card grid)
   *   09 — Chapter 05 EDITORIAL VERTICAL PRICING: vertical 3-tier grid
   *        with oversized backdrop numerals, structural panels and
   *        plinth shadows so each product image is anchored instead
   *        of floating (EvadePricingShowcase). NO horizontal scroll
   *        per user's explicit ask.
   *
   * The page-wide EvadeImmersiveBg + site-wide Cosmic3DShapes cube
   * stay mounted, so the cosmic atmosphere is preserved. No new
   * background particles were added.
   *
   * EVERY existing admin-editable field is preserved with the same
   * edit ids (see comment at top of each new component). The two
   * previously-orphan illustrations are now INTEGRATED:
   *   – sec-shield  → EvadeShieldMoment (full-bleed moment, still
   *                   editable under evade.divider.secShield)
   *   – trust-reviews → EvadeTrustSplit (panel backdrop, still
   *                   editable under evade.divider.trustReviews)
   *
   * Old illustrations still in repo and unused on this page (kept
   * in case other pages use them): EvadeIllustrationDivider,
   * the old ChapterHeader callsites, the 4 GlassCard grids in
   * this file. They're not removed from the components directory
   * — only from this page's import graph.
   */
  export default function EvadePage() {
    return (
      <ReorderableContainer pageId="evade-cancelations">
        <CyberSubstrate />

        <ReorderableSection sectionId="hero">
          <EvadeHeroPortal
            caption="Experience Online Freedom."
            subCaption="Say goodbye to order cancelations, bans, rebills, failed refunds due to fraud detections & more. Trusted by clients worldwide."
          />
        </ReorderableSection>

        <ReorderableSection sectionId="trailer">
          <section className="relative pt-6 pb-2">
            <div className="container-wide">
              <div className="mx-auto max-w-4xl">
                <TrailerTitle3D text="VIEW TRAILER VIDEO" />
                <YouTubeTheater
                  editId="evade.theater.videoId"
                  videoId="9ga4vZFpB6E"
                  title="RefundGod — Evade Cancelations Trailer"
                />
              </div>
            </div>
          </section>
        </ReorderableSection>

        <ReorderableSection sectionId="pixel-rain">
          <div className="pointer-events-none relative z-[1] -mt-[10vh] -mb-[8vh] sm:-mt-[14vh] sm:-mb-[12vh]">
            <PixelRainCosmic accent="#7dd3fc" className="h-[56vh] sm:h-[64vh]" />
          </div>
        </ReorderableSection>

        {/* CHAPTER 01 — editorial layout (oversized 01, vault art, excerpts) */}
        <ReorderableSection sectionId="intro">
          <EvadeIntroEditorial />
        </ReorderableSection>

        {/* CHAPTER 02 — diagonal z-stack solutions */}
        <ReorderableSection sectionId="solutions">
          <EvadeSolutionsStack />
        </ReorderableSection>

        {/* SHIELD MOMENT — full-bleed scroll-pinned shield */}
        <ReorderableSection sectionId="shield-moment">
          <EvadeShieldMoment />
        </ReorderableSection>

        {/* CHAPTER 04 — pinned-scroll feature narrative */}
        <ReorderableSection sectionId="features">
          <EvadeFeaturesPinned />
        </ReorderableSection>

        {/* CHAPTER 03 — split-screen sticky trust (integrates trust-reviews
            image as panel backdrop — no more orphan floating image) */}
        <ReorderableSection sectionId="trust">
          <EvadeTrustSplit />
        </ReorderableSection>

        {/* CHAPTER 05 — editorial vertical pricing (NO horizontal scroll) */}
        <ReorderableSection sectionId="pricing">
          <EvadePricingShowcase />
        </ReorderableSection>
      </ReorderableContainer>
    );
  }
  