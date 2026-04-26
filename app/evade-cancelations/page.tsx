import ChipScroll from "@/components/ChipScroll";
import GlassCard from "@/components/GlassCard";
import KineticText from "@/components/KineticText";
import MagneticButton from "@/components/MagneticButton";
import ParallaxIllustration from "@/components/ParallaxIllustration";
import ParallaxChapter from "@/components/ParallaxChapter";

export const metadata = {
  title: "Evade Cancelations — RefundGod",
  description:
    "Stop bans, rebills, fraud-detection cancelations. Stealth setups, anonymous identities, and step-by-step procedures for placing big orders without aging.",
};

const PRICING = [
  {
    title: "Stealth / OpSEC Guide + Rebill Bypass",
    body:
      "Remain fully anonymous while surfing online, placing orders under a forged identity, never face a rebill again and much more!",
    url: "https://refundgod.bgng.io/product/stealth-opsec-guide-rebill-bypass-guide",
    tint: "cyan" as const,
  },
  {
    title: "Evasion Book - Level 1",
    body:
      "For those who are looking for a serious long-term solution & to hit big ordering from multiple accounts at once before the store has a chance to detect and ban you. Stay under the radar, pass through account reviews and more! 45 pages with no filler content!",
    url: "https://refundgod.bgng.io/product/evade1",
    tint: "amber" as const,
  },
  {
    title: "Evasion Book - Level 2",
    body:
      "For those who just started in this field and do not have much experience. Quick and easy solutions with free and paid alternatives. Over 10 pages with lifetime support.",
    url: "https://refundgod.bgng.io/product/evasion-book---level-2",
    tint: "violet" as const,
  },
];

const TRUST = [
  {
    title: "Who we are?",
    body: "We are an experienced team of cyber security developers, who initially established our presence on the dark web. During the summer of 2019 time we have been solely relying on selling on Amazon, when a significant setback was encountered. Despite all attempts to address the issue with Amazon, only generic responses from OFM where received indicating policy non-compliance, leading to the suspension of not only my account but also those of close friends and family members.",
    illo: "globe" as const,
  },
  {
    title: "The setback...",
    body: "This turn of events was deeply distressing as Amazon constituted a substantial portion of our business at the time. Undeterred, we persevered through numerous trials and errors, eventually discovering a secure and effective method to regain access to Amazon and PayPal, enabling us to resume selling.\nMotivated by this experience, we decided to share the hard-earned knowledge with others, resulting in the creation of the highly sought-after guide, which became the go-to resource for navigating other stores suspension protocols.",
    illo: "encryption" as const,
  },
  {
    title: "The Aftermath",
    body: "For the following six months, after getting our seller account up and running, we have dedicated extensive time and effort to developing effective strategies for safely and easily creating multiple Amazon accounts without the risk of being linked and blocked, which soon lead to research of other stores and how their algorithms work as well.",
    illo: "shield" as const,
  },
];

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

export default function EvadePage() {
  return (
    <>
      {/* Act 1 — Scroll-linked image-sequence scrollytelling with cinematic entrance */}
      <ChipScroll
        dir="/sequence/evade"
        frameCount={0}
        background="#05060a"
        accent="#22d3ee"
        fallbackKind="shield"
        caption="Experience Online Freedom"
        subCaption="Say goodbye to order cancelations, bans, rebills, failed refunds due to fraud detections & more."
      />

      {/* YouTube Trailer Section — Embedded with autoplay, muted for compliance */}
      <ParallaxChapter
        intensity={0.35}
        className="relative z-10 py-20"
        bgClassName="absolute inset-0 opacity-15"
        bg={<ParallaxIllustration kind="globe" accent="cyan" size={500} />}
      >
        <div className="container-wide relative">
          <div className="mb-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
              Watch Now
            </p>
            <h2 className="mt-2 text-3xl font-bold text-white sm:text-4xl">
              View Trailer Video
            </h2>
          </div>
          <div
            className="mx-auto max-w-3xl overflow-hidden rounded-2xl border border-white/10"
            style={{
              background:
                "linear-gradient(135deg, rgba(15,10,30,0.6), rgba(8,6,18,0.8))",
              backdropFilter: "blur(8px)",
              WebkitBackdropFilter: "blur(8px)",
              boxShadow: "0 25px 60px -20px rgba(34,211,238,0.3)",
            }}
          >
            <div
              className="relative w-full"
              style={{ paddingBottom: "56.25%", backgroundColor: "#000" }}
            >
              <iframe
                className="absolute inset-0 h-full w-full border-0"
                src="https://www.youtube.com/embed/9ga4vZFpB6E?autoplay=1&mute=1&rel=0&modestbranding=1"
                title="RefundGod Trailer"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      </ParallaxChapter>

      {/* Chapter 01 — Evade like a PRO */}
      <ParallaxChapter
        intensity={0.5}
        className="z-10 py-16"
        bgClassName="absolute -right-[6%] top-1/2 hidden -translate-y-1/2 lg:block"
        bg={<ParallaxIllustration kind="shield" accent="cyan" size={420} />}
      >
        <div className="container-wide relative">
          <ChapterHeader
            chapter="chapter 01 / evade"
            title="Evade like a PRO"
          />
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300/80">
            Trusted by Clients Worldwide
          </p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <GlassCard tint="cyan" className="pulse-glow-cyan">
              <p className="p-8 text-base leading-relaxed text-white/95 sm:text-lg">
                Dive into a comprehensive overview of each store&apos;s
                anti-fraud system and their ability to detect suspicious
                user behaviour. Stores invest hundreds of thousands each
                year to fight against refunders and are equipped with
                advanced machine learning algorithms to identify potential
                fraud, even if you are not banned.
              </p>
            </GlassCard>
            <GlassCard tint="violet" delay={0.1}>
              <p className="p-8 text-base leading-relaxed text-white/95 sm:text-lg">
                During checkout process, you are assigned a fraud
                score, and if it reaches a certain threshold, your current
                and future orders may be cancelled.
              </p>
            </GlassCard>
          </div>
        </div>
      </ParallaxChapter>

      {/* Chapter 02 — Our Comprehensive Solutions */}
      <ParallaxChapter
        intensity={0.55}
        className="py-24"
        bgClassName="absolute left-[2%] top-[10%] hidden lg:block"
        bg={<ParallaxIllustration kind="encryption" accent="violet" size={360} />}
      >
        <div className="container-wide relative">
          <ChapterHeader
            chapter="chapter 02 / solutions"
            title="Our Comprehensive Solutions"
            accentClass="text-violet-300"
            glowRgb="167,139,250"
          />
          <p className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-violet-300/80">
            What&apos;s included:
          </p>

          {/* Three main solutions */}
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            <GlassCard tint="amber" delay={0} className="pulse-glow float-card">
              <div className="relative overflow-hidden p-7">
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 opacity-25 mix-blend-screen"
                  aria-hidden="true"
                >
                  <ParallaxIllustration
                    kind="spark"
                    accent="amber"
                    size={130}
                  />
                </div>
                <p className="relative text-base leading-relaxed text-white/95">
                  Avoid account bans and cancellations by learning how to
                  properly and efficiently place large orders without account
                  aging.
                </p>
              </div>
            </GlassCard>
            <GlassCard tint="cyan" delay={0.1} className="pulse-glow-cyan float-card float-card-2">
              <div className="relative overflow-hidden p-7">
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 opacity-25 mix-blend-screen"
                  aria-hidden="true"
                >
                  <ParallaxIllustration
                    kind="encryption"
                    accent="cyan"
                    size={130}
                  />
                </div>
                <p className="relative text-base leading-relaxed text-white/95">
                  Gain insights into avoiding rebills or win against an
                  existing rebill and understanding anti-fraud systems, user
                  behavior analysis, order fraud scores, and the latest
                  algorithms used by online stores.
                </p>
              </div>
            </GlassCard>
            <GlassCard tint="violet" delay={0.2} className="pulse-glow-violet float-card">
              <div className="relative overflow-hidden p-7">
                <div
                  className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 opacity-25 mix-blend-screen"
                  aria-hidden="true"
                >
                  <ParallaxIllustration
                    kind="globe"
                    accent="violet"
                    size={130}
                  />
                </div>
                <p className="relative text-base leading-relaxed text-white/95">
                  Remain completely anonymous while surfing the internet and
                  placing your orders under a forged identity with credit
                  lines up to $10,000.
                </p>
              </div>
            </GlassCard>
          </div>

          {/* Additional Solutions */}
          <div className="mt-16 grid gap-6 md:grid-cols-2">
            <GlassCard tint="cyan" delay={0.2}>
              <div className="relative overflow-hidden p-8">
                <h3
                  className="heading-display text-2xl font-bold uppercase tracking-tight text-white"
                  style={{ textShadow: "0 2px 16px rgba(0,0,0,0.8)" }}
                >
                  Seamless transition
                </h3>
                <p className="relative mt-4 text-base leading-relaxed text-white/95">
                  It doesn&apos;t matter what happened to your previous
                  account; be it suspended, blocked, banned, blacklisted, or
                  anything else, you WILL learn how to crank out new accounts
                  without ever getting detected or linked again!
                </p>
              </div>
            </GlassCard>
            <GlassCard tint="amber" delay={0.3}>
              <div className="relative overflow-hidden p-8">
                <h3
                  className="heading-display text-2xl font-bold uppercase tracking-tight text-white"
                  style={{ textShadow: "0 2px 16px rgba(0,0,0,0.8)" }}
                >
                  Precise, step-by-step procedures
                </h3>
                <p className="relative mt-4 text-base leading-relaxed text-white/95">
                  While it&apos;s true that the process of creating numerous
                  accounts may seem easy, simply by using new information, the
                  real value lies in maintaining their longevity without
                  encountering bans or cancelations due to algorithm
                  detections.
                </p>
              </div>
            </GlassCard>
            <GlassCard tint="violet" delay={0.4}>
              <div className="relative overflow-hidden p-8">
                <h3
                  className="heading-display text-2xl font-bold uppercase tracking-tight text-white"
                  style={{ textShadow: "0 2px 16px rgba(0,0,0,0.8)" }}
                >
                  We offer a range of features
                </h3>
                <p className="relative mt-4 text-base leading-relaxed text-white/95">
                  We include lifetime updates, techniques for maintaining
                  anonymity, account management strategies, obtaining
                  anonymous credit cards, creating multiple accounts safely,
                  selling items to automatic customers, and preventing account
                  linking.
                </p>
              </div>
            </GlassCard>
            <GlassCard tint="fuchsia" delay={0.5}>
              <div className="relative overflow-hidden p-8">
                <h3
                  className="heading-display text-2xl font-bold uppercase tracking-tight text-white"
                  style={{ textShadow: "0 2px 16px rgba(0,0,0,0.8)" }}
                >
                  No Filler, No BS!
                </h3>
                <p className="relative mt-4 text-base leading-relaxed text-white/95">
                  After investing significant time and resources we offer only
                  the most precise and actionable methods with a lifetime
                  support guarantee.
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      </ParallaxChapter>

      {/* Chapter 03 — Why Trust Us */}
      <ParallaxChapter
        intensity={0.5}
        className="py-24"
        bgClassName="absolute right-[2%] top-[8%] hidden lg:block"
        bg={<ParallaxIllustration kind="globe" accent="amber" size={380} />}
      >
        <div className="container-wide relative">
          <ChapterHeader
            chapter="chapter 03 / trust"
            title="Why Trust Us?"
            accentClass="text-amber-300"
            glowRgb="245,185,69"
          />
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {TRUST.map((c, i) => (
              <GlassCard
                key={c.title}
                tint={["cyan", "violet", "amber"][i] as any}
                delay={i * 0.1}
                className="float-card"
              >
                <div className="relative overflow-hidden p-7">
                  <div
                    className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 opacity-25 mix-blend-screen"
                    aria-hidden="true"
                  >
                    <ParallaxIllustration
                      kind={c.illo}
                      accent={["cyan", "violet", "amber"][i] as any}
                      size={120}
                    />
                  </div>
                  <h3
                    className="relative heading-display text-xl font-bold uppercase tracking-tight text-white"
                    style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
                  >
                    {c.title}
                  </h3>
                  <p className="relative mt-3 whitespace-pre-line text-base leading-relaxed text-white/95">
                    {c.body}
                  </p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </ParallaxChapter>

      {/* Chapter 04 — Pricing */}
      <ParallaxChapter
        intensity={0.45}
        className="py-24"
        bgClassName="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 lg:block"
        bg={<ParallaxIllustration kind="spark" accent="amber" size={520} />}
      >
        <div className="container-wide relative" id="Learn">
          <ChapterHeader
            chapter="chapter 04 / pricing"
            title="Get started placing orders, Today!"
            accentClass="text-amber-300"
            glowRgb="245,185,69"
          />
          <p className="mt-6 text-base text-white/80">
            Our Pricing — Select your plan:
          </p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PRICING.map((p, i) => (
              <GlassCard
                key={p.title}
                tint={p.tint}
                delay={i * 0.1}
                className="pulse-glow float-card"
              >
                <div className="flex h-full flex-col p-8">
                  <h3
                    className="heading-display text-2xl font-bold uppercase tracking-tight text-white"
                    style={{ textShadow: "0 2px 14px rgba(0,0,0,0.8)" }}
                  >
                    {p.title}
                  </h3>
                  <p className="mt-4 flex-1 text-base leading-relaxed text-white/95">
                    {p.body}
                  </p>
                  <div className="mt-7">
                    <MagneticButton
                      href={p.url}
                      external
                      variant="primary"
                      className="w-full"
                    >
                      Buy Now
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      >
                        <path d="m12 5 7 7-7 7" />
                        <path d="M5 12h14" />
                      </svg>
                    </MagneticButton>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </ParallaxChapter>
    </>
  );
}
