import { Reveal } from "@/components/Reveal";
import PinSection from "@/components/PinSection";
import GlassCard from "@/components/GlassCard";
import KineticText from "@/components/KineticText";
import HeroBackground from "@/components/HeroBackground";
import MagneticButton from "@/components/MagneticButton";

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
  },
  {
    title: "Precise, step-by-step procedures",
    body:
      "While creating numerous accounts may seem easy by simply using new information, the real value lies in maintaining their longevity without encountering bans or cancelations due to algorithm detections.",
    tint: "violet" as const,
  },
  {
    title: "Range of features",
    body:
      "Lifetime updates, anonymity techniques, account management strategies, anonymous credit cards, multi-account safety, automatic customers for selling items, and account-linking prevention.",
    tint: "amber" as const,
  },
  {
    title: "No filler, no BS",
    body:
      "After investing significant time and resources we offer only the most precise and actionable methods, with a lifetime support guarantee.",
    tint: "fuchsia" as const,
  },
];

const PRICING = [
  {
    title: "Stealth / OpSEC + Rebill Bypass",
    body:
      "Remain fully anonymous while surfing online, place orders under a forged identity, never face a rebill again — and much more.",
    url: "https://refundgod.bgng.io/product/stealth-opsec-guide-rebill-bypass-guide",
    tint: "cyan" as const,
  },
  {
    title: "Evasion Book — Level 1",
    body:
      "For those who want a serious long-term solution and to hit big ordering from multiple accounts at once before the store has a chance to detect and ban you. 45 pages, no filler.",
    url: "https://refundgod.bgng.io/product/evade1",
    tint: "amber" as const,
  },
  {
    title: "Evasion Book — Level 2",
    body:
      "For those just starting out with limited experience. Quick and easy solutions with free and paid alternatives. 10+ pages with lifetime support.",
    url: "https://refundgod.bgng.io/product/evasion-book---level-2",
    tint: "violet" as const,
  },
];

const TRUST = [
  { title: "Who we are", body: "We are an experienced team of cyber security developers, who initially established our presence on the dark web. During summer 2019 we relied on selling on Amazon when a significant setback was encountered — accounts of close friends and family members were suspended." },
  { title: "The setback",  body: "Undeterred, we persevered through numerous trials and errors, eventually discovering a secure and effective method to regain access to Amazon and PayPal, enabling us to resume selling. Motivated, we shared the knowledge — and the highly sought-after guide was born." },
  { title: "The aftermath", body: "For the following six months we dedicated extensive time and effort to developing effective strategies for safely creating multiple Amazon accounts without being linked or blocked, which soon led to research of other stores and their algorithms." },
];

export default function EvadePage() {
  return (
    <>
      {/* Act 1 — Cinematic pinned hero */}
      <PinSection
        imageSrc="/images/evade-hero.png"
        alt="Evade Cancelations"
        eyebrow="evade cancelations"
        title="Experience Online Freedom."
        body="Say goodbye to order cancelations, bans, rebills, failed refunds due to fraud detections & more. Trusted by clients worldwide."
        accent="cyan"
      />

      {/* Act 2 — Editorial intro */}
      <section className="relative -mt-32 z-10 py-12">
        <HeroBackground />
        <div className="container-wide relative">
          <GlassCard tint="cyan">
            <div className="p-10 sm:p-14">
              <p className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-cyan-300/85">
                — chapter 01 / evade
              </p>
              <KineticText
                as="h2"
                text="Evade like a PRO."
                className="editorial-display mt-5 bg-gradient-to-b from-white via-white to-cyan-200 bg-clip-text text-transparent text-[clamp(2rem,6vw,5rem)] uppercase"
              />
              <div className="mt-8 grid gap-6 md:grid-cols-2">
                <p className="text-base leading-relaxed text-white/80 sm:text-lg">
                  Dive into a comprehensive overview of each store&apos;s
                  anti-fraud system and their ability to detect suspicious
                  user behaviour. Stores invest hundreds of thousands each
                  year to fight against refunders and are equipped with
                  advanced machine learning algorithms to identify potential
                  fraud — even if you are not banned.
                </p>
                <p className="text-base leading-relaxed text-white/80 sm:text-lg">
                  During the checkout process, you are assigned a fraud
                  score, and if it reaches a certain threshold, your current
                  and future orders may be cancelled.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Act 3 — Solutions, 3-up */}
      <section className="relative py-24">
        <HeroBackground />
        <div className="container-wide relative">
          <Reveal>
            <p className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-cyan-300/80">
              — chapter 02 / solutions
            </p>
            <KineticText
              as="h2"
              text="Our comprehensive solutions."
              className="editorial-display mt-5 max-w-5xl text-balance bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent text-[clamp(2rem,6vw,5rem)] uppercase"
            />
          </Reveal>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {[
              { body: "Avoid account bans and cancellations by learning how to properly and efficiently place large orders without account aging.", tint: "amber" as const },
              { body: "Gain insights into avoiding rebills or winning against an existing rebill, plus understanding anti-fraud systems, user behaviour analysis, order fraud scores, and the latest algorithms used by online stores.", tint: "cyan" as const },
              { body: "Remain completely anonymous while surfing the internet and placing your orders under a forged identity with credit lines up to $10,000.", tint: "violet" as const },
            ].map((c, i) => (
              <GlassCard key={i} tint={c.tint} delay={i * 0.1}>
                <p className="p-7 text-base leading-relaxed text-white/85">{c.body}</p>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Act 4 — Features, 2x2 */}
      <section className="relative py-12">
        <HeroBackground />
        <div className="container-wide relative grid gap-5 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <GlassCard key={f.title} tint={f.tint} delay={i * 0.08}>
              <div className="p-8">
                <h3 className="heading-display text-2xl font-bold uppercase tracking-tight text-white">
                  {f.title}
                </h3>
                <p className="mt-4 text-base leading-relaxed text-white/80">{f.body}</p>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* Act 5 — Trust */}
      <section className="relative py-24">
        <HeroBackground />
        <div className="container-wide relative">
          <Reveal>
            <p className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-cyan-300/80">
              — chapter 03 / trust
            </p>
            <KineticText
              as="h2"
              text="Why trust us?"
              className="editorial-display mt-5 max-w-4xl text-balance bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent text-[clamp(2rem,6vw,5rem)] uppercase"
            />
          </Reveal>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {TRUST.map((c, i) => (
              <GlassCard key={c.title} tint={["cyan","violet","amber"][i] as any} delay={i * 0.1}>
                <div className="p-7">
                  <h3 className="heading-display text-xl font-bold uppercase tracking-tight text-white">
                    {c.title}
                  </h3>
                  <p className="mt-3 text-base leading-relaxed text-white/80">{c.body}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Act 6 — Pricing */}
      <section className="relative py-24" id="Learn">
        <HeroBackground />
        <div className="container-wide relative">
          <Reveal>
            <p className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-amber-300/80">
              — chapter 04 / pricing
            </p>
            <KineticText
              as="h2"
              text="Get started, today."
              className="editorial-display mt-5 max-w-4xl text-balance bg-gradient-to-b from-white to-amber-200 bg-clip-text text-transparent text-[clamp(2rem,6vw,5rem)] uppercase"
            />
            <p className="mt-6 text-base text-white/65">Our pricing — select your plan:</p>
          </Reveal>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PRICING.map((p, i) => (
              <GlassCard key={p.title} tint={p.tint} delay={i * 0.1}>
                <div className="flex h-full flex-col p-8">
                  <h3 className="heading-display text-2xl font-bold uppercase tracking-tight text-white">
                    {p.title}
                  </h3>
                  <p className="mt-4 flex-1 text-base leading-relaxed text-white/80">{p.body}</p>
                  <div className="mt-7">
                    <MagneticButton href={p.url} external variant="primary" className="w-full">
                      Buy Now
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
      </section>
    </>
  );
}
