import { Reveal } from "@/components/Reveal";
import ChipScroll from "@/components/ChipScroll";
import GlassCard from "@/components/GlassCard";
import KineticText from "@/components/KineticText";
import MagneticButton from "@/components/MagneticButton";
import ParallaxIllustration from "@/components/ParallaxIllustration";
import ParallaxChapter from "@/components/ParallaxChapter";
import { ReorderableContainer, ReorderableSection } from "@/components/ReorderableSection";
import EditableText from "@/components/EditableText";

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
    bgImg: "/uploads/stealth-opsec.png",
  },
  {
    title: "Evasion Book — Level 1",
    body:
      "For those who want a serious long-term solution and to hit big ordering from multiple accounts at once before the store has a chance to detect and ban you. 45 pages, no filler.",
    url: "https://refundgod.bgng.io/product/evade1",
    tint: "amber" as const,
    bgImg: "/uploads/evasion-l1.png",
  },
  {
    title: "Evasion Book — Level 2",
    body:
      "For those just starting out with limited experience. Quick and easy solutions with free and paid alternatives. 10+ pages with lifetime support.",
    url: "https://refundgod.bgng.io/product/evasion-book---level-2",
    tint: "violet" as const,
    bgImg: "/uploads/evasion-l2.png",
  },
];

const TRUST = [
  { title: "Who we are", body: "We are an experienced team of cyber security developers, who initially established our presence on the dark web. During summer 2019 we relied on selling on Amazon when a significant setback was encountered — accounts of close friends and family members were suspended.", illo: "globe" as const },
  { title: "The setback",  body: "Undeterred, we persevered through numerous trials and errors, eventually discovering a secure and effective method to regain access to Amazon and PayPal, enabling us to resume selling. Motivated, we shared the knowledge — and the highly sought-after guide was born.", illo: "encryption" as const },
  { title: "The aftermath", body: "For the following six months we dedicated extensive time and effort to developing effective strategies for safely creating multiple Amazon accounts without being linked or blocked, which soon led to research of other stores and their algorithms.", illo: "shield" as const },
];

/** Reusable card for chapter section headers — solid backdrop on top of
 *  the site-wide galaxy so the title stays legible. */
function ChapterHeader({
  chapter,
  title,
  accentClass = "text-cyan-300",
  glowRgb = "34,211,238",
}: {
  chapter: string;
  title: string;
  accentClass?: string;
  glowRgb?: string;
}) {
  return (
    <div
      className="rounded-[2rem] border border-white/10 px-6 py-8 sm:px-12 sm:py-10"
      style={{
        background:
          "linear-gradient(160deg, rgba(15,10,30,0.82), rgba(8,6,18,0.92))",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        boxShadow: "0 30px 90px -30px rgba(0,0,0,0.8)",
      }}
    >
      <p
        className={`heading-display text-xs font-semibold uppercase tracking-[0.5em] sm:text-sm ${accentClass}`}
        style={{ textShadow: `0 0 24px rgba(${glowRgb},0.55)` }}
      >
        — {chapter}
      </p>
      <KineticText
        as="h2"
        text={title}
        className="editorial-display mt-5 max-w-5xl text-balance text-white text-[clamp(2rem,6vw,5rem)] uppercase"
        style={{ textShadow: "0 4px 30px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.95)" }}
      />
    </div>
  );
}

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
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 0%, rgba(30,18,90,0.55), transparent 60%), radial-gradient(ellipse 70% 60% at 80% 100%, rgba(82,28,140,0.55), transparent 60%), linear-gradient(180deg, rgba(8,8,32,0.65) 0%, rgba(18,8,40,0.78) 50%, rgba(10,4,32,0.88) 100%)",
        }}
      />
      <ReorderableSection sectionId="hero">
      {/* Act 1 — Scroll-linked image-sequence scrollytelling. */}
      <ChipScroll
        dir="/sequence/evade"
        frameCount={48}
        background="#05060a"
        accent="#22d3ee"
        fallbackKind="shield"
        caption="Experience Online Freedom."
        subCaption="Say goodbye to order cancelations, bans, rebills, failed refunds due to fraud detections & more. Trusted by clients worldwide."
      />
      </ReorderableSection>

      <ReorderableSection sectionId="intro">
      {/* Act 2 — Editorial intro / chapter 01 — parallax depth */}
      <ParallaxChapter
        intensity={0.5}
        className="z-10 py-16"
        bgClassName="absolute -right-[6%] top-1/2 hidden -translate-y-1/2 lg:block"
        bg={<ParallaxIllustration kind="shield" accent="cyan" size={420} />}
      >
        <div className="container-wide relative">
          <ChapterHeader chapter="chapter 01 / evade" title="Evade like a PRO." />
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <GlassCard tint="cyan" className="pulse-glow-cyan">
              <div className="relative p-8">
                {/* Subtle background photo — vault mood */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-[0.18] mix-blend-screen"
                  style={{
                    backgroundImage: "url(/uploads/evade-vault.png)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <EditableText
                  id="evade.intro.body1"
                  defaultValue="Dive into a comprehensive overview of each store's anti-fraud system and their ability to detect suspicious user behaviour. Stores invest hundreds of thousands each year to fight against refunders and are equipped with advanced machine learning algorithms to identify potential fraud — even if you are not banned."
                  as="p"
                  multiline
                  className="relative text-base leading-relaxed text-white/95 sm:text-lg"
                />
              </div>
            </GlassCard>
            <GlassCard tint="violet" delay={0.1}>
              <div className="relative p-8">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-[2rem] opacity-[0.16] mix-blend-screen"
                  style={{
                    backgroundImage: "url(/uploads/credit-cash.png)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }}
                />
                <EditableText
                  id="evade.intro.body2"
                  defaultValue="During the checkout process, you are assigned a fraud score, and if it reaches a certain threshold, your current and future orders may be cancelled. Our methods keep that score invisible."
                  as="p"
                  multiline
                  className="relative text-base leading-relaxed text-white/95 sm:text-lg"
                />
              </div>
            </GlassCard>
          </div>
        </div>
      </ParallaxChapter>

      {/* Act 3 — Solutions / chapter 02 — parallax depth */}
      <ParallaxChapter
        intensity={0.55}
        className="py-24"
        bgClassName="absolute left-[2%] top-[10%] hidden lg:block"
        bg={<ParallaxIllustration kind="encryption" accent="violet" size={360} />}
      >
        <div className="container-wide relative">
          <ChapterHeader
            chapter="chapter 02 / solutions"
            title="Our comprehensive solutions."
            accentClass="text-violet-300"
            glowRgb="167,139,250"
          />
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {[
              { id: "evade.solution.0", body: "Avoid account bans and cancellations by learning how to properly and efficiently place large orders without account aging.", tint: "amber" as const,  illo: "spark"      as const, glow: "pulse-glow"        },
              { id: "evade.solution.1", body: "Gain insights into avoiding rebills or winning against an existing rebill, plus understanding anti-fraud systems, user behaviour analysis, order fraud scores, and the latest algorithms used by online stores.", tint: "cyan"  as const, illo: "encryption" as const, glow: "pulse-glow-cyan"   },
              { id: "evade.solution.2", body: "Remain completely anonymous while surfing the internet and placing your orders under a forged identity with credit lines up to $10,000.", tint: "violet" as const, illo: "globe"      as const, glow: "pulse-glow-violet" },
            ].map((c, i) => (
              <GlassCard key={i} tint={c.tint} delay={i * 0.1} className={`${c.glow} float-card${i === 1 ? " float-card-2" : ""}`}>
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
        </div>
      </ParallaxChapter>
      </ReorderableSection>

      <ReorderableSection sectionId="features">
      {/* Act 4 — Features 2x2 — parallax depth */}
      <ParallaxChapter
        intensity={0.4}
        className="py-16"
        bgClassName="absolute inset-0 grid place-items-center opacity-25"
        bg={<ParallaxIllustration kind="globe" accent="amber" size={620} />}
      >
        <div className="container-wide relative grid gap-5 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <GlassCard key={f.title} tint={f.tint} delay={i * 0.08} className={i % 2 === 0 ? "float-card" : "float-card float-card-2"}>
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
          ))}
        </div>
      </ParallaxChapter>
      </ReorderableSection>

      <ReorderableSection sectionId="trust">
      {/* Act 5 — Trust / chapter 03 — parallax depth */}
      <ParallaxChapter
        intensity={0.5}
        className="py-24"
        bgClassName="absolute right-[2%] top-[8%] hidden lg:block"
        bg={<ParallaxIllustration kind="globe" accent="amber" size={380} />}
      >
        <div className="container-wide relative">
          <ChapterHeader
            chapter="chapter 03 / trust"
            title="Why trust us?"
            accentClass="text-amber-300"
            glowRgb="245,185,69"
          />
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {TRUST.map((c, i) => (
              <GlassCard key={c.title} tint={["cyan","violet","amber"][i] as any} delay={i * 0.1} className="float-card">
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

      <ReorderableSection sectionId="pricing">
      {/* Act 6 — Pricing / chapter 04 — parallax depth */}
      <ParallaxChapter
        intensity={0.45}
        className="py-24"
        bgClassName="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
        bg={<ParallaxIllustration kind="spark" accent="amber" size={520} />}
      >
        <div className="container-wide relative" id="Learn">
          <ChapterHeader
            chapter="chapter 04 / pricing"
            title="Get started, today."
            accentClass="text-amber-300"
            glowRgb="245,185,69"
          />
          <EditableText
            id="evade.pricing.lead"
            defaultValue="Our pricing — select your plan:"
            as="p"
            className="mt-6 text-base text-white/80"
          />
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PRICING.map((p, i) => (
              <GlassCard key={p.title} tint={p.tint} delay={i * 0.1} className="pulse-glow float-card">
                <div className="relative flex h-full flex-col overflow-hidden p-8">
                  {/* Card-specific hero image, sits behind text at low
                      opacity. Different image per pricing card. */}
                  <div
                    aria-hidden
                    className="pointer-events-none absolute inset-0 opacity-[0.22] mix-blend-screen"
                    style={{
                      backgroundImage: `url(${p.bgImg})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center",
                      maskImage:
                        "linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.15) 100%)",
                      WebkitMaskImage:
                        "linear-gradient(180deg, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.55) 60%, rgba(0,0,0,0.15) 100%)",
                    }}
                  />
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
                    <MagneticButton href={p.url} external variant="primary" className="w-full">
                      Shop Methods
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="m12 5 7 7-7 7" /><path d="M5 12h14" />
                      </svg>
                    </MagneticButton>
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
