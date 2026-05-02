import { Reveal } from "@/components/Reveal";
import ChapterPill from "@/components/ChapterPill";
import MentorshipHero from "@/components/MentorshipHero";
import KineticText from "@/components/KineticText";
import MagneticButton from "@/components/MagneticButton";
import FactoryIllustration from "@/components/FactoryIllustration";
import ScrollImage from "@/components/ScrollImage";
import TextReveal from "@/components/TextReveal";
import BounceList from "@/components/BounceList";
import ImpactHeadline from "@/components/ImpactHeadline";
import CubicParallax from "@/components/CubicParallax";
import CosmicBackground from "@/components/CosmicBackground";
import LiquidParticles from "@/components/LiquidParticles";
import EmotionChips from "@/components/EmotionChips";
import EditableText from "@/components/EditableText";
import GlassCard from "@/components/GlassCard";
import VanishWrapper from "@/components/VanishWrapper";
import ExplodeText from "@/components/ExplodeText";

export const metadata = {
  title: "Exclusive Mentorships — RefundGod",
  description:
    "1:1 refunding and Social Engineering mentorships. Learn the fundamentals, advanced methods, tailgating attacks, insider techniques and warranty SE. Lifetime support, top-tier methods.",
};

const REFUND_FEATURES = [
  "Avoid the loss-prevention team from catching on, protect your identity, dodge police reports",
  "Avoid submitting evidence of damages or recycled items",
  "Succeed even if you signed for your order, save failed refunds & denied claims",
  "Cancel carrier investigations, discover private stores by reading TOS & Privacy Policy",
  "Sell your items AUTOMATICALLY by finding a customer for them",
  "Monopolize accounts and refund 5 accounts at once per store, simultaneously",
  "Refund your favourite stores — build empires, all WORLDWIDE",
  "Even experienced refunders walk away with new methods — we learn something new every day",
];

const SE_FEATURES = [
  "In-depth A-to-Z guide of how SE works, with high-quality private methods & private stores",
  "Easily find / generate PRIVATE serials, invoices and product images",
  "SE products worth OVER $1,500 — without upfront payment",
  "Lifetime Support",
  "Photoshop handwriting onto products, SE companies that don't offer advance replacement",
  "Avoid boxing, getting billed, sending product back and more",
  "Multi-task: SE multiple companies at once via phone + live chat",
  "Double- and triple-dip every successful SE, SE expensive products, learn how to obtain drops",
];

const ADDONS = [
  "Live SE'ing on call / TeamViewer / screenshare. Live tips on what to say & do in any situation, personal mentorship through your SE, and help gathering documents and proof when needed.",
  "International reshipping to any country with customs prepaid.",
  "VERY detailed document of how every SE method works, all SE terms explained, with private-company application notes.",
  "Private Methods, 1:1 Stealth Setup, Scripts (when they get released) & more.",
];

const EMOTIONS = ["Fear", "Excitement", "Curiosity", "Anger", "Guilt", "Sadness"];

/**
 * Exclusive Mentorships — long-form scrollytelling.
 *
 * Animation rules:
 *  – All entrance animations are one-shot whileInView (no scroll-linked
 *    per-frame transforms). They complete in 0.4–0.7s after entering
 *    the viewport so they cannot freeze mid-scroll.
 *  – Background: a single page-scoped CosmicBackground (color-cycling
 *    pulsating gradient + drifting dust) plus a small LiquidParticles
 *    layer of abstract floating orbs. No bubble swarm.
 *  – TextReveal variants are intentionally diversified per section
 *    (wordWave / charBounce / lineMask / wordBlur / charGlitch) so
 *    no two consecutive sections share the same flavour.
 *
 * Editability:
 *  – Every KineticText / TextReveal / BounceList accepts an `editId`.
 *    When the admin enters edit mode (✏️ Edit page button), animated
 *    blocks swap to plain `<EditableText>` so they can be edited
 *    in-place. Saved values are stored in the `content` table and
 *    picked up server-side on the next render.
 */
export default function MentorshipsPage() {
  return (
    <div className="relative">
      {/* Page-scoped cosmic backdrop + abstract liquid bubbles */}
      <CosmicBackground />
      <LiquidParticles count={14} />

      {/* Act 1 — Bespoke parallax illustration hero (replaces the
          generic chess fallback). Layers move at different depths
          on both mouse + scroll for a rich 3D feel. */}
      <MentorshipHero
        caption="Refund & SE Mentorship."
        subCaption="Stop paying for other BS mentorships that have 0 value and ghost you after purchasing. Be your own refunder."
        accent="#a78bfa"
      />

      {/* Inline CTA */}
      <section className="relative z-10 pb-8 pt-12 text-center">
        <Reveal>
          <MagneticButton href="https://refundgod.bgng.io/" external variant="primary">
            Buy Now
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="m12 5 7 7-7 7" /><path d="M5 12h14" />
            </svg>
          </MagneticButton>
        </Reveal>
      </section>

      {/* ─── Act 2a — Refunding chapter 01 ────────────────────────── */}
      <section className="relative py-20 sm:py-28">
        <div className="container-wide">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5">
              <ScrollImage
                src="/illustrations/team-chart.png"
                alt=""
                side="left"
                glow="violet"
                inline
                width="w-full max-w-[440px]"
                height="h-[280px] sm:h-[360px] lg:h-[440px]"
                tilt={6}
              />
            </div>
            <div className="lg:col-span-7">
              <Reveal>
                <ChapterPill
                  editId="ment.refund.eyebrow"
                  defaultValue="chapter 01 / refund"
                  accent="violet"
                  size="sm"
                />
                <KineticText
                  as="h2"
                  text="What is this Refunding Mentorship about?"
                  editId="ment.refund.title"
                  className="editorial-display mt-4 text-white text-[clamp(1.7rem,4.5vw,4rem)] uppercase sm:mt-5"
                  style={{ textShadow: "0 4px 30px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.95)" }}
                />
              </Reveal>

              <div className="mt-8 space-y-6 text-base leading-relaxed text-white/85 sm:text-lg">
                <TextReveal variant="wordBlur" editId="ment.refund.p1">
                  Refunding is a manipulation technique that exploits human
                  error and finds loopholes in company policies — deceiving
                  the company into processing a full refund for your item,
                  with various methods, while you keep it.
                </TextReveal>
                <TextReveal variant="wordSlide" editId="ment.refund.p2">
                  Refunding centres around your use of persuasion and
                  confidence. When exposed to these tactics, company agents
                  are far more likely to take actions they otherwise
                  wouldn&apos;t.
                </TextReveal>
                <TextReveal variant="wordWave" editId="ment.refund.p3">
                  Among many methods, you target specific emotions —
                  emotional manipulation gives you the upper hand in any
                  interaction. The agent is far more likely to take
                  irrational or risky actions when in an enhanced emotional
                  state.
                </TextReveal>

                <Reveal>
                  <EmotionChips emotions={EMOTIONS} />
                </Reveal>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Act 2b — COVID / oversaturation, with cubic 3D parallax ─ */}
      <CubicParallax axis="x" amount={60} className="relative py-16 sm:py-20">
        <div className="container-wide">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:order-2 lg:col-span-5">
              <ScrollImage
                src="/illustrations/climb-steps.png"
                alt=""
                side="right"
                glow="violet"
                inline
                width="w-full max-w-[420px]"
                height="h-[260px] sm:h-[340px] lg:h-[400px]"
                tilt={10}
              />
            </div>
            <div className="lg:order-1 lg:col-span-7">
              <div className="space-y-6 text-base leading-relaxed text-white/85 sm:text-lg">
                <TextReveal variant="wordBlur" editId="ment.covid.p1">
                  Nowadays, stores are vigilantly aware of &ldquo;refunders&rdquo;,
                  and as each day goes on, all existing methods become
                  outdated as they get oversaturated. Companies must
                  continually invest in research so they can protect against
                  situations like Refunders or SE&rsquo;ers.
                </TextReveal>
                <TextReveal variant="lineMask" editId="ment.covid.p2">
                  By learning how to play on human emotion and decipher long,
                  tedious company policies, you can develop your own unique
                  methods to exploit company vulnerabilities, capitalise on
                  crises to launch opportunistic attacks, distribute
                  infrastructures and more.
                </TextReveal>
                <TextReveal variant="charBounce" editId="ment.covid.p3">
                  Sure enough, as soon as the World Health Organization named
                  the global health emergency &ldquo;COVID-19&rdquo;, Refunders
                  and SE&rsquo;ers started actively deploying opportunistic
                  campaigns, taking advantage of local events and news.
                </TextReveal>
              </div>
            </div>
          </div>
        </div>
      </CubicParallax>

      {/* ─── Act 3 — Tailgating + Insider ─────────────────────────── */}
      {/* The whole left column is wrapped in CubicParallax so the heading
          + paragraphs enter with a 3D drift / depth shift — i.e. a
          "creative 3D text animation to the entire paragraph" rather
          than just per-word fades. */}
      <section className="relative py-20 sm:py-24">
        <div className="container-wide">
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-14">
            <CubicParallax
              axis="y"
              amount={140}
              rotate={12}
              depth={220}
              className="lg:col-span-7"
            >
              <Reveal>
                <EditableText
                  id="ment.insider.eyebrow"
                  defaultValue="— interlude / become the insider"
                  as="p"
                  className="heading-display text-[10px] font-semibold uppercase tracking-[0.4em] text-cyan-300 sm:text-xs sm:tracking-[0.5em]"
                />
                <KineticText
                  as="h3"
                  text="Access tailgating attacks."
                  editId="ment.insider.title"
                  className="editorial-display mt-4 text-white text-[clamp(1.6rem,4.2vw,3.4rem)] uppercase sm:mt-5"
                  style={{ textShadow: "0 4px 30px rgba(0,0,0,0.9)" }}
                />
              </Reveal>
              <div className="mt-8 space-y-6 text-base leading-relaxed text-white/85 sm:text-lg">
                <TextReveal variant="wordWave" editId="ment.insider.p1">
                  Aside from refunding — as an add-on — we also teach you how
                  to deceive the company by properly studying it, gathering
                  background information, and eventually infiltrating the
                  company to become an &ldquo;insider&rdquo;.
                </TextReveal>
                <TextReveal variant="charBounce" editId="ment.insider.p2">
                  As you may know, most companies outsource their customer
                  service jobs to overseas countries, saving significantly on
                  employee salary. This is where Access Tailgating Attacks
                  come in.
                </TextReveal>
                <TextReveal variant="wordBlur" editId="ment.insider.p3">
                  Tailgating, or piggybacking, is the act of trailing an
                  authorised staff member into a restricted-access area.
                  Attackers may play on social courtesy to get you to hold
                  the door for them, or convince you that they are also
                  authorised to be in the area. Pretexting can play a role
                  here too.
                </TextReveal>
                <TextReveal variant="charGlitch" editId="ment.insider.p4">
                  Tailgating attacks rely on social engineering because they
                  use an understanding of psychology to manipulate people
                  into specific actions — typically, attackers exploit
                  kindness or complacency to follow authorised users into
                  restricted areas.
                </TextReveal>
              </div>
            </CubicParallax>

            {/* "Become the insider" — wrapped in GlassCard with elastic
                 deformation mesh so the box stretches like a 3D liquid
                 panel on hover (the user-requested "deformed mesh
                 expansion 3D animation"). */}
            <div className="lg:col-span-5 lg:pt-6">
              <Reveal delay={0.15}>
                <GlassCard
                  tint="amber"
                  reveal={false}
                  elastic
                  className="p-7 sm:p-8"
                >
                  <EditableText
                    id="ment.insider.addon.kicker"
                    defaultValue="— private add-on"
                    as="p"
                    className="heading-display text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-200 sm:text-xs sm:tracking-[0.4em]"
                  />
                  <EditableText
                    id="ment.insider.addon.title"
                    defaultValue="Become your own private insider"
                    as="h4"
                    className="editorial-display mt-3 text-xl font-bold uppercase tracking-tight text-amber-50 sm:text-2xl"
                  />
                  <div className="mt-5 space-y-4 text-base leading-relaxed text-white/90">
                    <TextReveal variant="wordFade" editId="ment.insider.addon.p1">
                      Be fully anonymous, apply with stealth overseas
                      information online, pass through job interviews, learn
                      each customer service tier&apos;s refunding limits and
                      abilities, and how to get promoted to higher status to
                      increase those abilities.
                    </TextReveal>
                    <TextReveal variant="wordSlide" editId="ment.insider.addon.p2">
                      Push your own orders through while being fully
                      masqueraded and disguised as a persona that you will
                      submerge yourself into.
                    </TextReveal>
                  </div>
                  <EditableText
                    id="ment.insider.addon.note"
                    defaultValue="Please note: this is not included in the regular mentorship — it is a separate add-on."
                    as="p"
                    multiline
                    className="mt-6 text-xs italic text-amber-100/80"
                  />
                </GlassCard>

                {/* Pulled the illustration much closer to the add-on box
                    (mt-5 instead of mt-10) so there's no big visible gap. */}
                <div className="mt-5 flex justify-center">
                  <ScrollImage
                    src="/illustrations/safe-folder.png"
                    alt=""
                    side="right"
                    glow="amber"
                    inline
                    width="w-[260px] sm:w-[320px] lg:w-[360px]"
                    height="h-[260px] sm:h-[320px] lg:h-[360px]"
                    tilt={8}
                  />
                </div>
              </Reveal>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Act 4 — Pull quote / value statement ──────────────────── */}
      {/* Pulled UP against the previous section: pt-2 / pb-12 instead of
          py-24 / py-28 (was ~7rem of empty space at the top). Replaced
          KineticText with ExplodeText — the previous KineticText word
          wrappers used `inline-block overflow-hidden` plus a heavy
          textShadow which produced visible dark rectangles ("black
          squares") around italic glyphs at the end of each word. The
          ExplodeText path renders raw glyphs without overflow:hidden
          wrappers and adds a true 3D scatter assemble for that
          "creative 3D text animation" the user asked for. */}
      <section className="relative pt-2 pb-12 sm:pt-4 sm:pb-16">
        <div className="container-wide">
          <div className="mx-auto max-w-5xl text-center">
            {/* The original ExplodeText scattered each glyph with
                per-letter inline-blocks — that combined with the
                editorial-display -0.045em letter-spacing AND italic
                ascenders made adjacent letters visually clip each
                other, so the line read as missing letters and was
                hard to parse.  ImpactHeadline renders the line as
                one flowing block with font-black + WebKit text-stroke
                outline + heavy double drop-shadow so it stays
                punchy without losing legibility. */}
            <ImpactHeadline
              as="h2"
              text="Stop paying for other BS mentorships that have 0 value and ghost you after purchasing. Be your own refunder."
              italic
              className="editorial-display text-white text-[clamp(1.5rem,4vw,3.4rem)] uppercase"
            />
            {/* Body wrapped in CubicParallax so the supporting paragraph
                also enters with a 3D depth shift, completing the
                "creative 3D text animation to this entire section" ask. */}
            <CubicParallax
              axis="y"
              amount={130}
              rotate={10}
              depth={200}
              className="mt-10 space-y-6 text-left text-base leading-relaxed text-white/85 sm:text-lg"
            >
              <TextReveal variant="wordBlur" editId="ment.pullquote.body">
                This mentorship covers all the fundamentals of
                refunding or social engineering (depending on your
                choice). It includes all the knowledge and the
                most up-to-date methods that top-tier refunders use,
                and covers literally EVERYTHING there is to refunding
                or social engineering — not the BS methods like
                boxing, DNA or FTID. We provide top-tier quality and
                personal 1:1 support.
              </TextReveal>
            </CubicParallax>
          </div>
        </div>
      </section>

      {/* ─── Act 5 — What's included (Refund) — bounce list ───────── */}
      <section className="relative py-20 sm:py-24">
        <div className="container-wide">
          <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5 lg:sticky lg:top-24 lg:self-start lg:pt-2">
              {/* This image lives on the left rail and is sticky so it
                  always sits visually between the bounce-list cards
                  during scroll. The page no longer needs an inline
                  in-list version (which mis-aligned). */}
              <div className="hidden lg:block">
                <ScrollImage
                  src="/illustrations/learning-screen.png"
                  alt=""
                  side="left"
                  glow="violet"
                  inline
                  width="w-full max-w-[440px]"
                  height="h-[440px]"
                  tilt={6}
                />
              </div>
              <div className="lg:hidden">
                <ScrollImage
                  src="/illustrations/learning-screen.png"
                  alt=""
                  side="left"
                  glow="violet"
                  inline
                  width="w-full max-w-[440px]"
                  height="h-[280px] sm:h-[360px]"
                  tilt={6}
                />
              </div>
            </div>
            <div className="lg:col-span-7">
              <Reveal>
                {/* "what's included" eyebrow uses an animated cyan→violet
                    gradient text — punchy and visible without going
                    plain white. */}
                <EditableText
                  id="ment.refund.included.eyebrow"
                  defaultValue="— what's included"
                  as="p"
                  className="heading-display gradient-eyebrow text-[10px] font-semibold uppercase tracking-[0.4em] sm:text-xs sm:tracking-[0.5em]"
                  data-testid="whats-included-eyebrow"
                />
                <KineticText
                  as="h3"
                  text="Refunding Mentorship."
                  editId="ment.refund.included.title"
                  className="editorial-display mt-4 text-white text-[clamp(1.7rem,4.5vw,3.8rem)] uppercase sm:mt-5"
                  style={{ textShadow: "0 4px 30px rgba(0,0,0,0.9)" }}
                />
              </Reveal>

              <VanishWrapper drift={50} minScale={0.92}>
              <BounceList
                items={REFUND_FEATURES}
                detailsEditIdPrefix="ment.refund.feature.detail"
                accent="violet"
                editIdPrefix="ment.refund.feature"
                details={{
                  0: "Identity scrubbing, persona handling and the right paper trail so loss-prevention never builds a case worth opening.",
                  1: "Why submitted evidence backfires more often than it helps — and the playbook that wins without it.",
                  2: "Signed-for orders, denied claims, refused replacements: the exact escalation script that overturns them.",
                  3: "How to read terms of service for openings most refunders never spot, and how to weaponise carrier policy.",
                  4: "Auto-buyer pipelines that move stock without you ever touching it — drop-off, reship, paid out.",
                  5: "Multi-account orchestration: 5 accounts per store, properly isolated, all refunding in parallel.",
                  6: "Region-by-region playbooks for the highest-yield, lowest-friction stores worldwide.",
                  7: "Lifetime updates and a private chat where the meta is rewritten every week.",
                }}
              />
              </VanishWrapper>

              <div className="mt-10 space-y-6 text-base leading-relaxed text-white/85 sm:text-lg">
                <TextReveal variant="wordSlide" editId="ment.refund.guarantee">
                  It&apos;s all very, very detailed explanation — and we can
                  guarantee that you&apos;ll be making AT LEAST $2,000/week
                  within 2 weeks of starting if you follow everything
                  correctly. By refunding one order alone, you already
                  profit. You also get access to a community of students
                  discussing strategies to push these methods even further.
                </TextReveal>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Act 6 — Factory of methods — design-illustration style    */}
      {/* A wide, horizontal hand-drawn factory: sawtooth roofs, smoke    */}
      {/* puffs, conveyor belts, gears and floating icons — all in the   */}
      {/* same flat editorial style as puppet-brain / refund-engine.     */}
      {/* Fully transparent: the page's cosmic backdrop shows through.   */}
      <section className="relative z-10 overflow-hidden py-12">
        <div className="container-wide text-center">
          <Reveal>
            <EditableText
              id="ment.factory.eyebrow"
              defaultValue="— live · in motion · always running"
              as="p"
              className="heading-display text-[10px] font-semibold uppercase tracking-[0.4em] text-white/60 sm:text-xs sm:tracking-[0.5em]"
            />
            <KineticText
              as="h2"
              text="A factory of methods."
              editId="ment.factory.title"
              className="editorial-display mt-5 text-white text-[clamp(2rem,6vw,5rem)] uppercase"
              style={{ textShadow: "0 6px 40px rgba(0,0,0,0.95)" }}
            />
          </Reveal>
        </div>
        {/* Horizontal illustration — fluid width, fixed-aspect height */}
        <div className="relative mx-auto mt-10 w-full max-w-7xl px-4 sm:mt-14 sm:px-6">
          <FactoryIllustration
            height={420}
            className="hidden sm:block"
          />
          {/* Mobile: shorter to keep the page tight */}
          <FactoryIllustration
            height={280}
            className="block sm:hidden"
          />
        </div>
      </section>

      {/* ─── Act 7 — SE chapter 02 ─────────────────────────────────── */}
      {/* Layout was previously a 2-column grid (puppet-brain image on
          the left, copy on the right). Per request the puppet-brain
          illustration is now placed AFTER the copy block — directly
          following the "That is the main difference between SE and
          Refunding" sentence — so it acts as the punctuation-image
          for the SE definition. */}
      <section className="relative py-20 sm:py-28">
        <div className="container-wide">
          <div className="mx-auto max-w-4xl">
            <div>
              <Reveal>
                <ChapterPill
                  editId="ment.se.eyebrow"
                  defaultValue="chapter 02 / SE"
                  accent="cyan"
                  size="sm"
                />
                <KineticText
                  as="h2"
                  text="Social Engineering Mentorship."
                  editId="ment.se.title"
                  className="editorial-display mt-4 text-white text-[clamp(1.7rem,4.5vw,4rem)] uppercase sm:mt-5"
                  stagger={0.05}
                  style={{ textShadow: "0 4px 30px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.95)", letterSpacing: "-0.025em" }}
                />
              </Reveal>

              <div className="mt-8 space-y-6 text-base leading-relaxed text-white/85 sm:text-lg">
                <TextReveal variant="wordBlur" editId="ment.se.p1">
                  So what exactly is Social Engineering? When you hit a
                  Google search with &ldquo;social engineering&rdquo; as the
                  keywords, you&apos;ll find countless pages defining it as
                  obtaining confidential information — usernames &amp;
                  passwords, bank account details, infecting computers with
                  malware to gain remote access, and so on.
                </TextReveal>
                <TextReveal variant="wordSlide" editId="ment.se.p2">
                  All that relates to the boring old-school SEing — which is
                  NOT what this mentorship is about.
                </TextReveal>
                <TextReveal variant="wordWave" editId="ment.se.p3">
                  Our focus is a more modern approach which takes advantage
                  of companies&apos; warranty policy, allowing you to obtain
                  warranty replacement products directly from the company,
                  without an initial purchase like refunding. This saves the
                  anxiety of failure, and does not cut into your budget
                  while waiting for a result.
                </TextReveal>
                <TextReveal variant="charBounce" editId="ment.se.p4">
                  We introduce you to methodologies on how to manipulate any
                  company into issuing an &ldquo;advanced replacement&rdquo;
                  or refund — by using a calculated approach for why sending
                  back the item for repair cannot be personally accepted, and
                  why it&apos;s not suited to your circumstances. That
                  essentially leaves an advance replacement as the only
                  viable alternative.
                </TextReveal>
                <TextReveal variant="lineMask" editId="ment.se.p5">
                  Note: this mostly relates to technology-based products that
                  require some type of functionality to operate, but we&apos;ve
                  also added several topics that apply to just about any
                  item of your choice.
                </TextReveal>
                <TextReveal variant="wordSlide" editId="ment.se.p6">
                  Social Engineering — &ldquo;SE&rdquo; — is the next big
                  thing closest to refunding. It revolves around obtaining
                  product replacements from companies via warranty policy.
                  Every product has a warranty. If something goes wrong while
                  still in warranty, companies ship out brand-new product
                  replacements for FREE.
                </TextReveal>
                {/* Puppet-brain illustration relocated per user request:
                    now follows p6 ("Social Engineering — SE — is the next
                    big thing closest to refunding…") instead of p7. The
                    image acts as a visual punctuation for the "next big
                    thing" beat, then narrative continues with p7. */}
                <div className="my-10 sm:my-14 grid place-items-center">
                  <ScrollImage
                    src="/illustrations/puppet-brain.png"
                    alt=""
                    side="left"
                    glow="cyan"
                    inline
                    width="w-full max-w-[440px]"
                    height="h-[260px] sm:h-[340px] lg:h-[420px]"
                    tilt={8}
                  />
                </div>
                <TextReveal variant="wordBlur" editId="ment.se.p7">
                  However, it&apos;s not that easy. A lot of companies expect
                  the product to be sent back to them — which obviously you
                  are unable to do — or have very strong verification
                  processes to prove you actually own the product. This is
                  where SE comes in, and allows you to obtain FREE products
                  worth thousands without upfront payment from various
                  electronics and furniture companies. That is the main
                  difference between SE and Refunding.
                </TextReveal>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ─── Act 8 — What's included (SE) — bounce list ─────────── */}
      <section className="relative py-20 sm:py-24">
        <div className="container-wide">
          <div className="grid items-start gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:col-span-5 lg:sticky lg:top-24 lg:self-start lg:pt-40">
              {/* SE list image — sticky on desktop and offset down so it
                  visually aligns with bounce-list card 4 (mid-list). */}
              <div className="hidden lg:block">
                <ScrollImage
                  src="/illustrations/books-grad.png"
                  alt=""
                  side="left"
                  glow="cyan"
                  inline
                  width="w-full max-w-[440px]"
                  height="h-[440px]"
                  tilt={6}
                />
              </div>
              <div className="lg:hidden">
                <ScrollImage
                  src="/illustrations/books-grad.png"
                  alt=""
                  side="left"
                  glow="cyan"
                  inline
                  width="w-full max-w-[440px]"
                  height="h-[280px] sm:h-[360px]"
                  tilt={6}
                />
              </div>
            </div>
            <div className="lg:col-span-7">
              <Reveal>
                <EditableText
                  id="ment.se.included.eyebrow"
                  defaultValue="— what's included"
                  as="p"
                  className="heading-display gradient-eyebrow text-[10px] font-semibold uppercase tracking-[0.4em] sm:text-xs sm:tracking-[0.5em]"
                  data-testid="whats-included-eyebrow-se"
                />
                <KineticText
                  as="h3"
                  text="SE Mentorship."
                  editId="ment.se.included.title"
                  className="editorial-display mt-4 text-white text-[clamp(1.7rem,4.5vw,3.8rem)] uppercase sm:mt-5"
                  stagger={0.05}
                  style={{ textShadow: "0 4px 30px rgba(0,0,0,0.9)", letterSpacing: "-0.025em" }}
                />
              </Reveal>

              <VanishWrapper drift={50} minScale={0.92}>
              <BounceList
                items={SE_FEATURES}
                accent="cyan"
                editIdPrefix="ment.se.feature"
                detailsEditIdPrefix="ment.se.feature.detail"
                details={{
                  0: "Step-by-step social engineering walkthrough — every contact channel, every script, every escalation path.",
                  1: "Generators and vendor sources we trust so the paper trail holds up under loss-prevention review.",
                  2: "How to walk away with high-ticket inventory without ever sending money up front.",
                  3: "Private chat access — when a method dies, the next one is already documented and waiting.",
                  4: "Photoshop techniques and the specific companies whose flow doesn't include advance replacement.",
                  5: "Handle the phone scripts so you never have to box a product, pay a bill, or ship anything back.",
                  6: "Run multiple SEs in parallel across phone + live chat without one rep ever cross-checking the other.",
                  7: "Stack additional replacements on a single successful SE, target high-value SKUs, and learn the drop-off pipeline pros use.",
                }}
              />
              </VanishWrapper>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Act 9 — Add-ons + final WORLDWIDE statement ─────────── */}
      {/* Background contract-signing image removed at user request — the
          section is now transparent so the page-scoped CosmicBackground
          shows through, matching the rest of the page. */}
      <section className="relative py-20 sm:py-24">
        <div className="container-wide">
          <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
            <div className="lg:order-2 lg:col-span-5">
              {/* "A whole new world" — paired with the mentorship-key
                  artwork so the section visually nods to unlocking new
                  capabilities the add-ons offer. */}
              <ScrollImage
                src="/uploads/mentorship-key.png"
                alt=""
                side="right"
                glow="amber"
                inline
                width="w-full max-w-[440px]"
                height="h-[260px] sm:h-[340px] lg:h-[420px]"
                tilt={6}
              />
            </div>
            <div className="lg:order-1 lg:col-span-7">
              <Reveal>
                <EditableText
                  id="ment.addons.eyebrow"
                  defaultValue="— additional add-ons"
                  as="p"
                  className="heading-display text-[10px] font-semibold uppercase tracking-[0.4em] text-amber-300 sm:text-xs sm:tracking-[0.5em]"
                />
                <KineticText
                  as="h3"
                  text="A whole new world to explore."
                  editId="ment.addons.title"
                  className="editorial-display mt-4 text-white text-[clamp(1.7rem,4.5vw,3.8rem)] uppercase sm:mt-5"
                  style={{ textShadow: "0 4px 30px rgba(0,0,0,0.9)" }}
                />
              </Reveal>

              <ul className="mt-10 space-y-5 text-base leading-relaxed text-white/90 sm:text-lg">
                {ADDONS.map((a, i) => (
                  <li key={i} className="flex items-start gap-4">
                    <span className="mt-3 h-1 w-4 shrink-0 bg-amber-300" />
                    <TextReveal variant="wordSlide" editId={`ment.addons.${i}`} className="flex-1">
                      {a}
                    </TextReveal>
                  </li>
                ))}
              </ul>

              <div className="mt-10 space-y-6 text-base leading-relaxed text-white/85 sm:text-lg">
                <TextReveal variant="wordBlur" editId="ment.addons.outro">
                  Aside from the mentorship we also offer: Private
                  Methods, 1:1 Stealth Setup, Scripts (when they get
                  released) and more. There is a whole new world to explore.
                </TextReveal>
                <TextReveal variant="charBounce" editId="ment.addons.worldwide">
                  This mentorship is suitable for EVERYONE — and can be done
                  WORLDWIDE.
                </TextReveal>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Final CTA — reverse explosion text ──────────────────── */}
      {/* Spacing tightened: was py-24/sm:py-32 + mt-10 (≈ 6rem of empty
          space between headline and the Buy Now button). The CTA now
          reads as one cohesive block instead of two separated chunks. */}
      <section className="relative overflow-x-clip pb-12 pt-6 text-center sm:pb-16 sm:pt-8">
        <div className="container-wide relative">
          {/* Reverse-explosion CTA: each character flies in from a
              scattered 3D position and assembles into the headline.
              Large scatter radius so the effect is dramatic. */}
          <ExplodeText
            as="h2"
            text="Stop watching. Start earning."
            scatter={420}
            hue="167,139,250"
            className="editorial-display mx-auto text-white text-[clamp(2rem,7vw,6rem)] font-black uppercase"
            style={{
              paddingLeft: "0.3em",
              paddingRight: "0.3em",
              WebkitTextStroke: "1.2px rgba(0,0,0,0.55)",
              textShadow:
                "0 4px 24px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95), 0 0 50px rgba(167,139,250,0.45)",
            }}
          />
          <Reveal delay={0.5}>
            <div className="mt-5 sm:mt-6">
              <MagneticButton href="https://refundgod.bgng.io/" external variant="primary">
                Buy Now
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="m12 5 7 7-7 7" /><path d="M5 12h14" />
                </svg>
              </MagneticButton>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
