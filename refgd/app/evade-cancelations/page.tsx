/* v6.13.50 — Opt out of static prerendering — same fix as the other
   pages: admin Save writes DB, but if HTML was frozen at build time
   visitors never see the change. */
export const dynamic = "force-dynamic";

import ChipScroll from "@/components/ChipScroll";
import GlassCard from "@/components/GlassCard";
import PrismShard from "@/components/PrismShard";
import KineticText from "@/components/KineticText";
import ParallaxIllustration from "@/components/ParallaxIllustration";
import ParallaxChapter from "@/components/ParallaxChapter";
import { ReorderableContainer, ReorderableSection } from "@/components/ReorderableSection";
import EditableText from "@/components/EditableText";
import EditableLinkButton from "@/components/EditableLinkButton";
import YouTubeTheater from "@/components/YouTubeTheater";
import PixelRainCosmic from "@/components/PixelRainCosmic";
import EvadeIllustrationDivider from "@/components/EvadeIllustrationDivider";
import TrailerTitle3D from "@/components/TrailerTitle3D";
import ChapterHeader from "@/components/ChapterHeader";
import FloatingArt from "@/components/FloatingArt";
/* v6.13.15 — Pricing card thumbnails migrated to EditableImage so
   admin can swap them, apply animation templates, scale + adjust
   spacing from the popover. */
import EditableImage from "@/components/EditableImage";

export const metadata = {
  title: "Evade Cancelations — RefundGod",
  description:
    "Stop bans, rebills, fraud-detection cancelations. Stealth setups, anonymous identities, and step-by-step procedures for placing big orders without aging.",
};

const FEATURES = [
  {
    title: "Seamless transition",
    body:
      "It doesn't matter what happened to your previous account; be it suspended, blocked, banned, blacklisted, or anything else, you WILL learn how to crank out new accounts without ever getting detected or linked again.",
    tint: "cyan" as const,
    illo: "encryption" as const,
  },
  {
    title: "Precise, step-by-step procedures",
    body:
      "While creating numerous accounts may seem easy by simply using new information, the real value lies in maintaining their longevity without encountering bans or cancelations due to algorithm detections.",
    tint: "violet" as const,
    illo: "shield" as const,
  },
  {
    title: "Range of features",
    body:
      "Lifetime updates, anonymity techniques, account management strategies, anonymous credit cards, multi-account safety, automatic customers for selling items, and account-linking prevention.",
    tint: "amber" as const,
    illo: "globe" as const,
  },
  {
    title: "No filler, no BS",
    body:
      "After investing significant time and resources we offer only the most precise and actionable methods, with a lifetime support guarantee.",
    tint: "fuchsia" as const,
    illo: "spark" as const,
  },
];

const PRICING = [
  {
    title: "Stealth / OpSEC + Rebill Bypass",
    body:
      "Remain fully anonymous while surfing online, place orders under a forged identity, never face a rebill again — and much more.",
    url: "https://refundgod.bgng.io/product/stealth-opsec-guide-rebill-bypass-guide",
    tint: "cyan" as const,
    img: "/uploads/stealth-opsec.png",
  },
  {
    title: "Evasion Book — Level 1",
    body:
      "For those who want a serious long-term solution and to hit big ordering from multiple accounts at once before the store has a chance to detect and ban you. Stay under the radar, pass through account reviews and more. 45 pages with no filler content.",
    url: "https://refundgod.bgng.io/product/evade1",
    tint: "amber" as const,
    img: "/uploads/evasion-l1.webp",
  },
  {
    title: "Evasion Book — Level 2",
    body:
      "For those just starting out with limited experience. Quick and easy solutions with free and paid alternatives. 10+ pages with lifetime support.",
    url: "https://refundgod.bgng.io/product/evasion-book---level-2",
    tint: "violet" as const,
    img: "/uploads/evasion-l2.png",
  },
];

const TRUST = [
  { title: "Who we are", body: "We are an experienced team of cyber security developers, who initially established our presence on the dark web. During the summer of 2019 we had been solely relying on selling on Amazon, when a significant setback was encountered. Despite all attempts to address the issue with Amazon, only generic responses from OFM were received indicating policy non-compliance, leading to the suspension of not only my account but also those of close friends and family members.", illo: "globe" as const },
  { title: "The setback",  body: "This turn of events was deeply distressing, as Amazon constituted a substantial portion of our business at the time. Undeterred, we persevered through numerous trials and errors, eventually discovering a secure and effective method to regain access to Amazon and PayPal, enabling us to resume selling. Motivated by this experience, we decided to share the hard-earned knowledge with others — resulting in the creation of the highly sought-after guide, which became the go-to resource for navigating other stores' suspension protocols.", illo: "encryption" as const },
  { title: "The aftermath", body: "For the following six months — after getting our seller account up and running — we dedicated extensive time and effort to developing effective strategies for safely and easily creating multiple Amazon accounts without the risk of being linked and blocked, which soon led to research of other stores and how their algorithms work as well.", illo: "shield" as const },
];

/** ChapterHeader — extracted to `@/components/ChapterHeader.tsx` so
 *  other editorial pages (mentorships, store-list, etc.) can drop
 *  in the same look. Kept the doc here as a breadcrumb. (2026-04):
 *  – Animated gradient ring around the panel so it reads as a
 *    premium, elevated card instead of a flat box.
 *  – Inherits the same liquid-glass-3d / mobile mesh-breathe
 *    deformation as the GlassCard family, so it visibly deforms on
 *    touch devices without requiring a hover state.
 *  – Pulsing chapter pill (rounded badge with the accent colour
 *    glow) instead of plain text.
 *  – Larger / heavier title typography with a stronger drop-shadow
 *    so it punches over the page galaxy. */
/**
 * NOTE: Each major chapter section is wrapped in <ParallaxChapter> — the
 * background illustration drifts slower than the foreground content,
 * producing a layered 3D depth effect as the user scrolls.
 */
export default function EvadePage() {
  return (
    <ReorderableContainer pageId="evade-cancelations">
      {/* Page-wide deep blue → purple gradient overlay so the Evade page
          has its own distinct atmosphere, sitting above the global
          galaxy backdrop. Subtle radial accents reinforce a "vault"
          mood without overpowering text. */}
      {/* v6.9 — page-wide overlay used to start at rgba(8,8,32,0.65)
          at 0 % (top), which on first paint and after the splash
          fades stamped a hard dark band across the entire upper
          viewport (the user reported this as "the black screen
          upon loading is still there"). Now the top stop is fully
          transparent so the GalaxyBackground reads through, and
          the deep blue/violet only fades in from the middle of
          the page downward where it actually does scenic work. */}
      {/* v6.13.26 — REVERTED v6.13.24 z-[1] back to -z-[1].
          Pushing this overlay above the galaxy (z:1) also
          pushed it ABOVE all page content that doesn't use
          z-10 (ChipScroll, dividers, etc.) — visible to the
          user as "the whole opacity is much lower". The black
          bar is now solved at the body level instead (see
          layout.tsx body style: solid bg-ink-950 was replaced
          with a deep violet→ink gradient so anywhere the body
          shows through during scroll/galaxy-boot, it's
          atmospheric instead of black). */}
      {/* v6.13.30 — Black bar at the very bottom (above iOS home-
          bar) on iPhone Safari mid-scroll. Cause: `position:fixed;
          inset:0` on iOS Safari uses the SMALL viewport height
          while the URL bar is visible. When the URL bar collapses
          mid-scroll the viewport grows ~75-100px taller but this
          overlay does NOT — its bottom edge stays at the old small-
          viewport bottom, exposing the body's bg-ink-950 underneath
          as a sharp dark strip against the violet atmosphere of
          the overlay above it. The user reads that strip as "a
          black bar mid scrolling".

          Fix: extend the overlay 200px past every viewport edge
          via negative inset. The element is `pointer-events-none`
          so the overflow can't intercept clicks, and `-z-[1]`
          keeps it behind every content layer. Now even with the
          URL bar fully collapsed (or expanded, or rubber-banding)
          the gradient always reaches past the visible bottom — no
          gap can form on any iOS viewport state. */}
      <div
        aria-hidden
        className="pointer-events-none fixed -z-[1]"
        style={{
          top: "-200px",
          bottom: "-200px",
          left: "-200px",
          right: "-200px",
          background:
            "radial-gradient(ellipse 80% 60% at 20% 0%, rgba(30,18,90,0.32), transparent 60%), radial-gradient(ellipse 70% 60% at 80% 100%, rgba(82,28,140,0.55), transparent 60%), linear-gradient(180deg, rgba(8,8,32,0) 0%, rgba(18,8,40,0.55) 55%, rgba(10,4,32,0.78) 100%)",
        }}
      />

      {/* v6.13.52 — ANIMATED gradient backdrop for the evade page.
          The user asked for "gradient to evade page that is animated
          also background"; previously the page only had the static
          violet wash above plus PixelRainCosmic. This new layer adds
          a continuously-shifting cyan/violet/fuchsia colour field
          that slowly drifts and hue-rotates so the page feels alive
          all the way down — independent of scroll. Sits at -z-[2]
          (behind the static violet wash so the existing depth still
          reads), pointer-events-none, fixed-viewport. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-[2]"
        style={{
          background:
            "radial-gradient(ellipse 70% 55% at 22% 18%, rgba(34,211,238,0.22), transparent 62%), radial-gradient(ellipse 65% 55% at 80% 28%, rgba(124,58,237,0.32), transparent 60%), radial-gradient(ellipse 60% 60% at 30% 78%, rgba(244,114,182,0.22), transparent 65%), radial-gradient(ellipse 70% 55% at 78% 82%, rgba(34,211,238,0.18), transparent 60%), conic-gradient(from 30deg at 50% 50%, rgba(34,211,238,0.10), rgba(124,58,237,0.14), rgba(244,114,182,0.12), rgba(34,211,238,0.10))",
          animation: "evBgShift 24s ease-in-out infinite, evBgHue 30s linear infinite",
          willChange: "transform, filter",
        }}
      />
      <style>{`
        @keyframes evBgShift {
          0%, 100% { transform: translate3d(0, 0, 0) scale(1.06); }
          50%      { transform: translate3d(2.5%, -1.5%, 0) scale(1.14); }
        }
        @keyframes evBgHue {
          0%   { filter: hue-rotate(0deg) saturate(1.1); }
          50%  { filter: hue-rotate(35deg) saturate(1.25); }
          100% { filter: hue-rotate(0deg) saturate(1.1); }
        }
      `}</style>

      <ReorderableSection sectionId="hero">
        {/* Act 1 — Scroll-driven scene. The animation does NOT play on
            page-load — it advances only as the user scrolls past the
            runway, completing in one continuous scroll. The "Experience
            freedom" caption stays visible the entire time. */}
        <ChipScroll
          dir="/sequence/evade"
          /* v6.13.57 — was 48. The /public/sequence/evade/ frame
             folder doesn't exist in this repo, so all 48 preload
             requests 404'd on every page load (the user pasted
             the spam from devtools). ChipScroll already falls back
             to the procedural cinematic scene when frames are
             missing, so dropping the count to 0 skips the preload
             entirely and goes straight to the fallback — same
             visual as before, no console noise. */
          frameCount={0}
          // v6.7 — was "#05060a" (solid near-black). That painted the
          // entire scrollytelling runway as a black void on first
          // paint, before the user scrolled a single pixel — the
          // user reported this as "evade page shows a black screen
          // first then the animation vanishes". Transparent lets the
          // page galaxy + cosmic gradient show through, so the user
          // sees an atmospheric start state instead of a void.
          background="transparent"
          accent="#22d3ee"
          fallbackKind="shield"
          caption="Experience Online Freedom."
          subCaption="Say goodbye to order cancelations, bans, rebills, failed refunds due to fraud detections & more. Trusted by clients worldwide."
        />
      </ReorderableSection>

      {/* (vault-scene removed per spec) */}

      <ReorderableSection sectionId="trailer">
        {/* Trailer — auto-plays with sound when scrolled into view; the
            page lights dim around the player but the visitor can still
            scroll freely at any time (no scroll-lock).

            Layout v3 (2026-04): the old plain text eyebrow + the long
            "Lights dim automatically …" caption are replaced with a
            single 3D animated title (TrailerTitle3D) so the section
            feels cinematic instead of administrative. Bottom padding
            tightened so the player flows directly into the pixel-rain
            transition below — no awkward dead space. */}
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
        {/* Cosmic pixel-rain interlude — full-screen, fully transparent
            so the page's own galaxy shows through behind the rain.
            Completes in ONE scroll-pass and reverses if the visitor
            scrolls back up, giving a clean transition in either
            direction between the trailer and the editorial chapters. */}
        {/* v6.7 — scrollLength reduced 1.8 → 0.9 so the user doesn't
            have to scroll a full ~280svh through the rain runway
            before reaching the next section. With the autoscroll
            threshold also lowered to 0.55 the rain now feels like
            a snappy interlude rather than an endurance test. */}
        <PixelRainCosmic accent="#7dd3fc" scrollLength={0.9} />
      </ReorderableSection>

      <ReorderableSection sectionId="intro">
        {/* Act 2 — Editorial intro / chapter 01 — parallax depth. Card
            backgrounds intentionally clean (no image bleed); the
            chapter's hero artwork lives in the divider band BELOW the
            cards, where it's actually visible. */}
        <ParallaxChapter
          intensity={0.5}
          className="z-10 py-16"
          bgClassName="absolute -right-[6%] top-1/2 hidden -translate-y-1/2 lg:block"
          bg={<ParallaxIllustration kind="shield" accent="cyan" size={420} />}
        >
          <div className="container-wide relative">
            <ChapterHeader
              chapterEditId="evade.ch1.eyebrow"
              chapterDefault="chapter 01 / evade"
              titleEditId="evade.ch1.title"
              titleDefault="Evade like a PRO."
              accent="cyan"
            />
            {/* v6.13.35 — Floating lock now lives INSIDE the chapter's
                box-cards row on desktop (lg+) per user request: "on
                desktop add the floating lock inside evade like a pro
                box". The lock becomes the middle column of a
                1fr / 240px / 1fr grid, visually wedged BETWEEN the
                two intro cards as if the cards form one extended
                "box" and the lock sits inside it.
                On md (tablet) the cards stay side-by-side (2 cols)
                with the lock spanning both columns above them.
                On mobile (<md) everything stacks vertically with
                the lock first. `items-center` keeps the lock
                vertically centered against the two cards on lg. */}
            <div className="mt-6 grid items-center gap-6 md:grid-cols-2 lg:grid-cols-[1fr_240px_1fr]">
              <GlassCard tint="cyan" index={1} className="pulse-glow-cyan">
                <div className="relative p-8">
                  <EditableText
                    id="evade.intro.body1"
                    defaultValue="Dive into a comprehensive overview of each store's anti-fraud system and their ability to detect suspicious user behaviour. Stores invest hundreds of thousands each year to fight against refunders and are equipped with advanced machine learning algorithms to identify potential fraud — even if you are not banned."
                    as="p"
                    multiline
                    className="relative text-base leading-relaxed text-white/95 sm:text-lg"
                  />
                </div>
              </GlassCard>
              {/* On <md the lock is rendered first (stacked above the
                  cards). On md it spans both columns and shows
                  ABOVE the row. On lg it slots in as the middle
                  grid column between the two cards. */}
              <div className="order-first flex justify-center md:col-span-2 lg:order-none lg:col-span-1">
                <FloatingArt
                  editId="evade.art.vault"
                  src="/uploads/evade-vault.webp"
                  alt="Stealth-vault — the gateway to your anonymous setup."
                  size={260}
                  bobAmplitude={10}
                />
              </div>
              <GlassCard tint="violet" delay={0.1} index={4}>
                <div className="relative p-8">
                  <EditableText
                    id="evade.intro.body2"
                    defaultValue="During the checkout process, you are assigned a fraud score, and if it reaches a certain threshold, your current and future orders may be cancelled."
                    as="p"
                    multiline
                    className="relative text-base leading-relaxed text-white/95 sm:text-lg"
                  />
                </div>
              </GlassCard>
            </div>
          </div>
        </ParallaxChapter>

        {/* Between-section illustration band — replaced the previous
            vault-only image with a richer security-infrastructure
            illustration (servers + shield + key + monitor) that fills
            the divider band. The vault lock PNG was relocated INSIDE
            the "Evade like a PRO" section above, where it visually
            belongs with the chapter copy. */}
        <EvadeIllustrationDivider
          editId="evade.divider.secShield"
          src="/uploads/sec-shield.webp"
          /* v6.13.6 — height tightened 520 → 360 and `compact` set so
             the section uses py-0 instead of py-1 sm:py-2. Combined
             with the surrounding ParallaxChapter padding this still
             leaves comfortable breathing room above + below the image
             but kills the "huge empty band" the user reported between
             the cancelled-orders chapter and the comprehensive-
             solutions chapter. */
          alt="Anti-fraud security infrastructure — servers, shields, encrypted keys."
          align="center"
          glow="cyan"
          height={360}
          transparent
          compact
        />

        {/* Act 3 — Solutions / chapter 02 — parallax depth */}
        <ParallaxChapter
          intensity={0.55}
          className="py-24"
          bgClassName="absolute left-[2%] top-[10%] hidden lg:block"
          bg={<ParallaxIllustration kind="encryption" accent="violet" size={360} />}
        >
          <div className="container-wide relative">
            <ChapterHeader
              chapterEditId="evade.ch2.eyebrow"
              chapterDefault="chapter 02 / solutions"
              titleEditId="evade.ch2.title"
              titleDefault="Our comprehensive solutions."
              accent="violet"
            />
            {/* Solutions floating illustration — transparent man+shield
                +locks artwork sits inside this chapter, animated with
                bob + scroll parallax for visual energy.
                v6.9 — vertical spacing tightened (was mt-10 mb-4 + a
                second mt-8 below for ~88 px of empty band between
                image and cards). User reported "huge space gap
                between image and the words". Now mt-2 mb-0 + mt-3
                grid for a tight magazine-style stack. */}
            <div className="mt-2 mb-0 flex justify-center">
              <FloatingArt
                editId="evade.art.solLocks"
                src="/uploads/sol-locks.webp"
                alt="Comprehensive security solutions — checklist, shields, locks."
                size={360}
                bobAmplitude={10}
                /* v6.13.19 — spin override removed; FloatingArt now
                   defaults to spin=0 (no rotate) to kill the
                   "distorted illustration" report on this page. */
              />
            </div>
            <div className="mt-3 grid gap-5 lg:grid-cols-3">
              {[
                { id: "evade.solution.0", body: "Avoid account bans and cancellations by learning how to properly and efficiently place large orders without account aging.", tint: "amber" as const,  illo: "spark"      as const, glow: "pulse-glow"        },
                { id: "evade.solution.1", body: "Gain insights into avoiding rebills or winning against an existing rebill, plus understanding anti-fraud systems, user behaviour analysis, order fraud scores, and the latest algorithms used by online stores.", tint: "cyan"  as const, illo: "encryption" as const, glow: "pulse-glow-cyan"   },
                { id: "evade.solution.2", body: "Remain completely anonymous while surfing the internet and placing your orders under a forged identity with credit lines up to $10,000.", tint: "violet" as const, illo: "globe"      as const, glow: "pulse-glow-violet" },
              ].map((c, i) => (
                <GlassCard key={i} tint={c.tint} delay={i * 0.1} index={i} className={`${c.glow} float-card${i === 1 ? " float-card-2" : ""}`}>
                  <div className="relative overflow-hidden p-7">
                    <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 opacity-25 mix-blend-screen" aria-hidden="true">
                      <ParallaxIllustration kind={c.illo} accent={c.tint} size={130} />
                    </div>
                    <EditableText
                      id={c.id}
                      defaultValue={c.body}
                      as="p"
                      multiline
                      className="relative text-base leading-relaxed text-white/95"
                    />
                  </div>
                </GlassCard>
              ))}
            </div>

            {/* v6.9 — the money-phone divider with caption
                "— credit lines, fully anonymous" was removed at
                user request (redundant with the credit-lines copy
                already in the third solution card, and was
                creating a visible empty band below the cards). */}
          </div>
        </ParallaxChapter>
      </ReorderableSection>

      <ReorderableSection sectionId="features">
        {/* Act 4 — Features 2x2 — parallax depth. Each card has the
            shared liquid-glass-3d elastic-mesh hover (default true on
            GlassCard), so they all "deform" instead of one standalone
            mesh demo doing it. */}
        <ParallaxChapter
          intensity={0.4}
          className="py-16"
          bgClassName="absolute inset-0 grid place-items-center opacity-25"
          bg={<ParallaxIllustration kind="globe" accent="amber" size={620} />}
        >
          <div className="container-wide relative grid gap-5 md:grid-cols-2">
            {FEATURES.map((f, i) => (
              // v6.7 — was MeshEntrance (same as StoreList rules
              // cards). Per user request the Evade page and StoreList
              // page now use DISTINCT entrance animations so the two
              // pages don't feel templated. PrismShard sweeps each
              // card open from a tilted shard with a chromatic-split
              // settle — visually unrelated to MeshEntrance's
              // SVG-displacement warp.
              <PrismShard
                key={f.title}
                delay={i * 0.09}
                duration={1100}
              >
                <GlassCard tint={f.tint} index={i + 2} reveal={false} className={i % 2 === 0 ? "float-card" : "float-card float-card-2"}>
                  <div className="relative overflow-hidden p-8">
                    <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 opacity-25 mix-blend-screen" aria-hidden="true">
                      <ParallaxIllustration kind={f.illo} accent={f.tint} size={140} />
                    </div>
                    <EditableText
                      id={`evade.feature.${i}.title`}
                      defaultValue={f.title}
                      as="h3"
                      className="relative heading-display text-2xl font-bold uppercase tracking-tight text-white"
                      style={{ textShadow: "0 2px 16px rgba(0,0,0,0.8)" }}
                    />
                    <EditableText
                      id={`evade.feature.${i}.body`}
                      defaultValue={f.body}
                      as="p"
                      multiline
                      className="relative mt-4 text-base leading-relaxed text-white/95"
                    />
                  </div>
                </GlassCard>
              </PrismShard>
            ))}
          </div>
        </ParallaxChapter>
      </ReorderableSection>

      {/* (deforming-mesh standalone removed per spec — every GlassCard on
          the page already inherits liquid-glass-3d elastic mesh hover.) */}

      {/* Between-section illustration band — credit-cash hero now lives
          as its own divider rather than washing out behind the
          features cards.

          Wrapped in <ReorderableSection> so the ReorderableContainer
          places it BETWEEN features and trust in the rendered output.
          Without the wrapper it would be appended after every
          ReorderableSection (i.e. after pricing) — that's why the
          band was previously appearing in the wrong place. */}
      <ReorderableSection sectionId="stake-divider">
        {/* v6.9 — caption "— what's at stake · what we protect"
            removed; the chapter 03 title (now "Our reputation at
            stake") carries the message on its own. */}
        <EvadeIllustrationDivider
          editId="evade.divider.creditCash"
          src="/uploads/credit-cash.png"
          alt="Credit and cash flow — what's at stake when accounts get banned."
          align="center"
          glow="amber"
          height={300}
        />
      </ReorderableSection>

      <ReorderableSection sectionId="trust">
        {/* Act 5 — Trust / chapter 03 — parallax depth */}
        <ParallaxChapter
          intensity={0.5}
          /* User request: reduce vertical space between Trust section
             end and the trust-reviews divider. Was py-24 (96px each
             side); now keep top padding for breathing room above and
             collapse bottom to pb-6 so the next divider follows
             immediately after "and how their algorithms work as well." */
          className="pt-24 pb-6"
          bgClassName="absolute right-[2%] top-[8%] hidden lg:block"
          bg={<ParallaxIllustration kind="globe" accent="amber" size={380} />}
        >
          <div className="container-wide relative">
            <ChapterHeader
              chapterEditId="evade.ch3.eyebrow"
              chapterDefault="chapter 03 / reputation"
              titleEditId="evade.ch3.title"
              titleDefault="Our reputation at stake."
              accent="amber"
            />
            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {TRUST.map((c, i) => (
                <GlassCard key={c.title} tint={["cyan","violet","amber"][i] as any} delay={i * 0.1} index={i + 1} className="float-card">
                  <div className="relative overflow-hidden p-7">
                    <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 opacity-25 mix-blend-screen" aria-hidden="true">
                      <ParallaxIllustration kind={c.illo} accent={["cyan","violet","amber"][i] as any} size={120} />
                    </div>
                    <EditableText
                      id={`evade.trust.${i}.title`}
                      defaultValue={c.title}
                      as="h3"
                      className="relative heading-display text-xl font-bold uppercase tracking-tight text-white"
                      style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
                    />
                    <EditableText
                      id={`evade.trust.${i}.body`}
                      defaultValue={c.body}
                      as="p"
                      multiline
                      className="relative mt-3 text-base leading-relaxed text-white/95"
                    />
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </ParallaxChapter>
      </ReorderableSection>

      <ReorderableSection sectionId="trust-divider">
        {/* Trust illustration divider — transparent reviews image floats
            with parallax between the trust cards and the pricing section,
            giving a visual break and reinforcing credibility. */}
        <EvadeIllustrationDivider
          src="/uploads/trust-reviews.webp"
          alt="Star reviews — clients trust RefundGod."
          align="center"
          glow="violet"
          /* v6.13.6 — height 460 → 320 + compact. Same fix as the
             sec-shield divider above: removes the dark band the user
             saw immediately above "Get Started Today" while keeping
             the reviews illustration as a visual beat. */
          height={320}
          transparent
          compact
        />
      </ReorderableSection>

      <ReorderableSection sectionId="pricing">
        {/* Act 6 — Pricing / chapter 04 — parallax depth.
            Each pricing card now lays out as: image → title → body →
            CTA. The image is fitted INSIDE the box (object-contain)
            and sits ABOVE the text — no more low-opacity background
            wash. The CTA URL is admin-editable through
            EditableLinkButton (Save / Discard / Undo all just work). */}
        <ParallaxChapter
          intensity={0.45}
          className="py-24"
          bgClassName="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
          bg={<ParallaxIllustration kind="spark" accent="amber" size={520} />}
        >
          <div className="container-wide relative" id="Learn">
            {/* v6.13.25 — eyebrow/title swap per request:
                eyebrow was "chapter 04 / pricing" → now "Get started, today"
                title   was "Get started, today."   → now "Our pricing — select your plan:"
                The standalone <EditableText evade.pricing.lead> below
                (which previously read "Our pricing — select your plan:"
                as a sub-paragraph outside the cards) was deleted —
                user reported it was "the pricing text on bottom that's
                not in the box". */}
            <ChapterHeader
              chapterEditId="evade.ch4.eyebrow"
              chapterDefault="Get started, today"
              titleEditId="evade.ch4.title"
              titleDefault="Our pricing — select your plan:"
              accent="amber"
            />
            {/* v6.9 — was mt-12 + mb-6 inside each card image, which
                left a visible empty band between the lead copy and
                the card contents. Tightened to mt-5 / mb-3 and the
                image now bobs gently (pricing-img-bob keyframe in
                globals.css) so it reads as a living illustration
                instead of a static thumbnail. */}
            <div className="mt-5 grid gap-6 md:grid-cols-3">
              {PRICING.map((p, i) => (
                <GlassCard key={p.title} tint={p.tint} delay={i * 0.1} index={i + 3} className="pulse-glow float-card">
                  <div className="relative flex h-full flex-col p-8">
                    <div className="relative mx-auto mb-3 flex h-44 w-full items-center justify-center">
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-0"
                        style={{
                          background:
                            "radial-gradient(ellipse 60% 60% at 50% 50%, rgba(255,255,255,0.10), transparent 70%)",
                          filter: "blur(12px)",
                        }}
                      />
                      {/* v6.13.15 — was a plain <img>; now <EditableImage>
                          so admin can swap the thumbnail, apply an
                          animation template (the popover sets the same
                          atpl-* class onto the img), scale, or adjust
                          spacing below. The `pricing-img-bob` class is
                          kept by default for the existing gentle bob
                          and the per-card stagger via animationDelay. */}
                      <EditableImage
                        id={`evade.pricing.${i}.img`}
                        defaultSrc={p.img}
                        alt={p.title}
                        wrapperClassName="relative block h-full"
                        wrapperStyle={{ animationDelay: `${i * 0.6}s` }}
                        className="pricing-img-bob relative h-full w-auto max-w-full object-contain drop-shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
                      />
                    </div>

                    <EditableText
                      id={`evade.pricing.${i}.title`}
                      defaultValue={p.title}
                      as="h3"
                      className="relative heading-display text-2xl font-bold uppercase tracking-tight text-white"
                      style={{ textShadow: "0 2px 14px rgba(0,0,0,0.8)" }}
                    />
                    <EditableText
                      id={`evade.pricing.${i}.body`}
                      defaultValue={p.body}
                      as="p"
                      multiline
                      className="relative mt-4 flex-1 text-base leading-relaxed text-white/95"
                    />
                    <div className="relative mt-7">
                      <EditableLinkButton
                        id={`evade.pricing.${i}.url`}
                        defaultUrl={p.url}
                        external
                        variant="primary"
                        className="w-full"
                      >
                        Shop Methods
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                          <path d="m12 5 7 7-7 7" /><path d="M5 12h14" />
                        </svg>
                      </EditableLinkButton>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </ParallaxChapter>
      </ReorderableSection>
    </ReorderableContainer>
  );
}
