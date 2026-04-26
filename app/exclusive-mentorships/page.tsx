import { Reveal } from "@/components/Reveal";
import PinSection from "@/components/PinSection";
import GlassCard from "@/components/GlassCard";
import KineticText from "@/components/KineticText";
import HeroBackground from "@/components/HeroBackground";
import MagneticButton from "@/components/MagneticButton";

export const metadata = {
  title: "Exclusive Mentorships — RefundGod",
  description:
    "1:1 refunding and Social Engineering mentorships. Learn the fundamentals, advanced methods, and tailgating attacks. Lifetime support, top-tier methods.",
};

const REFUND_FEATURES = [
  "Avoid loss prevention from catching on, protect your identity, dodge police reports",
  "Avoid submitting evidence of damages or recycled items",
  "Succeed even if you signed for your order, save failed refunds & denied claims",
  "Cancel carrier investigations, discover private stores by reading TOS & Privacy Policy",
  "Sell your items AUTOMATICALLY by finding a customer",
  "Monopolize accounts and refund 5 accounts at once per store, simultaneously",
];

const SE_FEATURES = [
  "In-depth A-to-Z guide of how SE works, with high-quality private methods & private stores",
  "Easily find / generate PRIVATE serials, invoices and product images",
  "SE products worth OVER $1,500 — without upfront payment",
  "Lifetime Support",
  "Photoshop handwriting onto products, SE companies that don't offer advance replacement",
  "Avoid boxing, getting billed, sending product back and more",
  "Multi-task: SE multiple companies at once via phone + live chat",
];

const EMOTIONS = ["Fear", "Excitement", "Curiosity", "Anger", "Guilt", "Sadness"];

export default function MentorshipsPage() {
  return (
    <>
      {/* Act 1 — Cinematic pinned hero */}
      <PinSection
        imageSrc="/images/mentorship-hero.png"
        alt="Refund & SE Mentorship"
        eyebrow="exclusive mentorships"
        title="Refund & SE Mentorship."
        body="Stop paying for other BS mentorships that have 0 value and ghost you after purchasing. Be your own refunder."
        accent="violet"
      />

      {/* Inline CTA */}
      <section className="relative -mt-40 z-10 pb-12 text-center">
        <Reveal>
          <MagneticButton href="https://refundgod.bgng.io/" external variant="primary">
            Buy Now
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="m12 5 7 7-7 7" /><path d="M5 12h14" />
            </svg>
          </MagneticButton>
        </Reveal>
      </section>

      {/* Act 2 — Refunding intro */}
      <section className="relative py-24">
        <HeroBackground />
        <div className="container-wide relative grid items-start gap-10 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <p className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-violet-300/85">
              — chapter 01 / refund
            </p>
            <KineticText
              as="h2"
              text="What is this Refunding Mentorship about?"
              className="editorial-display mt-5 bg-gradient-to-b from-white via-white to-violet-200 bg-clip-text text-transparent text-[clamp(1.8rem,5vw,4rem)] uppercase"
            />
          </div>
          <div className="sm:col-span-7">
            <GlassCard tint="violet">
              <div className="space-y-4 p-8 text-base leading-relaxed text-white/80 sm:text-lg">
                <p>
                  Refunding is a manipulation technique that exploits human
                  error and finding loopholes in company policies, deceiving
                  the company into processing a full refund for your item with
                  various methods while keeping your item.
                </p>
                <p>
                  Refunding centers around your use of persuasion and
                  confidence. When exposed to these tactics, company agents
                  are more likely to take actions they otherwise wouldn&apos;t.
                </p>
                <p>
                  Among many methods, you target specific emotions as
                  emotional manipulation gives you the upper hand in any
                  interaction. The agent is far more likely to take
                  irrational or risky actions when in an enhanced emotional
                  state.
                </p>
                <div className="flex flex-wrap gap-2 pt-2">
                  {EMOTIONS.map((e) => (
                    <span
                      key={e}
                      className="rounded-full border border-violet-400/30 bg-violet-400/10 px-4 py-1.5 text-sm font-medium text-violet-100 backdrop-blur-sm"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Act 3 — Tailgating + Insider */}
      <section className="relative py-12">
        <HeroBackground />
        <div className="container-wide relative grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <GlassCard tint="cyan">
            <div className="p-8">
              <h3 className="heading-display text-2xl font-bold uppercase tracking-tight text-white">
                Access Tailgating Attacks
              </h3>
              <p className="mt-4 text-base leading-relaxed text-white/80">
                Tailgating, or piggybacking, is the act of trailing an
                authorised staff member into a restricted-access area.
                Attackers may play on social courtesy to get you to hold the
                door for them or convince you that they are also authorised.
                Pretexting plays a role here too — attackers exploit
                psychology to manipulate people into specific actions.
              </p>
            </div>
          </GlassCard>
          <GlassCard tint="amber">
            <div className="p-8">
              <h3 className="heading-display text-2xl font-bold uppercase tracking-tight text-amber-100">
                Become your own private insider
              </h3>
              <p className="mt-4 text-base leading-relaxed text-white/80">
                Be fully anonymous, apply with stealth overseas information,
                pass through job interviews, learn each customer service
                tier&apos;s refunding limits & abilities, and how to get
                promoted to higher status to push your own orders through.
              </p>
              <p className="mt-3 text-xs italic text-white/55">
                This is not included in the regular mentorship — it&apos;s a
                separate add-on.
              </p>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* Act 4 — What's included (Refund) */}
      <section className="relative py-20">
        <HeroBackground />
        <div className="container-wide relative">
          <Reveal>
            <p className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-violet-300/80">
              — what&apos;s included
            </p>
            <h3 className="editorial-display mt-5 max-w-4xl text-balance bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent text-[clamp(1.8rem,5vw,4rem)] uppercase">
              Refunding Mentorship.
            </h3>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {REFUND_FEATURES.map((f, i) => (
              <GlassCard key={f} tint={i % 2 ? "violet" : "neutral"} delay={i * 0.05}>
                <div className="flex items-start gap-4 p-5">
                  <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-400/20 text-sm font-bold text-emerald-200 ring-1 ring-emerald-300/30">
                    ✓
                  </span>
                  <p className="text-base font-medium text-white/85">{f}</p>
                </div>
              </GlassCard>
            ))}
          </div>
          <Reveal delay={0.4}>
            <p className="mt-8 text-base text-white/65">
              We can guarantee that you&apos;ll be making AT LEAST $2,000/week
              within 2 weeks of starting if you follow everything correctly.
              By refunding one order alone you already profit. You also get
              access to a community of students discussing strategies.
            </p>
          </Reveal>
        </div>
      </section>

      {/* Act 5 — SE intro */}
      <section className="relative py-24">
        <HeroBackground />
        <div className="container-wide relative grid items-start gap-10 sm:grid-cols-12">
          <div className="sm:col-span-5 sm:order-2">
            <p className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-cyan-300/85">
              — chapter 02 / SE
            </p>
            <KineticText
              as="h2"
              text="Social Engineering Mentorship."
              className="editorial-display mt-5 bg-gradient-to-b from-white via-white to-cyan-200 bg-clip-text text-transparent text-[clamp(1.8rem,5vw,4rem)] uppercase"
            />
          </div>
          <div className="sm:col-span-7 sm:order-1">
            <GlassCard tint="cyan">
              <div className="space-y-4 p-8 text-base leading-relaxed text-white/80 sm:text-lg">
                <p>
                  Our focus is a more modern approach which takes advantage of
                  companies&apos; warranty policy, allowing you to obtain
                  warranty replacement products directly from the company,
                  without an initial purchase like refunding. This saves the
                  anxiety of failure, and does not cut into your budget while
                  waiting for a result.
                </p>
                <p>
                  We introduce you to methodologies on how to manipulate any
                  company into issuing an &ldquo;advanced replacement&rdquo; or
                  &ldquo;refund&rdquo;, by using a calculated approach to why
                  sending back the item for repair cannot be personally
                  accepted, leaving an advance replacement as the only viable
                  alternative.
                </p>
                <p>
                  Every product has a warranty. If something goes wrong while
                  in warranty, companies ship out brand new product
                  replacements for FREE. SE allows you to obtain FREE products
                  worth thousands without upfront cost.
                </p>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Act 6 — What's included (SE) */}
      <section className="relative py-20">
        <HeroBackground />
        <div className="container-wide relative">
          <Reveal>
            <p className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-cyan-300/80">
              — what&apos;s included
            </p>
            <h3 className="editorial-display mt-5 max-w-4xl text-balance bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent text-[clamp(1.8rem,5vw,4rem)] uppercase">
              SE Mentorship.
            </h3>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {SE_FEATURES.map((f, i) => (
              <GlassCard key={f} tint={i % 2 ? "cyan" : "neutral"} delay={i * 0.05}>
                <div className="flex items-start gap-4 p-5">
                  <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-400/20 text-sm font-bold text-cyan-200 ring-1 ring-cyan-300/30">
                    ✓
                  </span>
                  <p className="text-base font-medium text-white/85">{f}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Act 7 — Add-ons */}
      <section className="relative py-12">
        <HeroBackground />
        <div className="container-wide relative">
          <GlassCard tint="amber">
            <div className="p-8">
              <h3 className="heading-display text-2xl font-bold uppercase tracking-tight text-white">
                Additional add-ons
              </h3>
              <ul className="mt-5 space-y-3 text-base text-white/80">
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1 w-3 shrink-0 bg-amber-300" />
                  Live SE&apos;ing on call / TeamViewer / screenshare. Personal
                  mentorship through your SE.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1 w-3 shrink-0 bg-amber-300" />
                  International reshipping to any country with customs prepaid.
                </li>
                <li className="flex items-start gap-3">
                  <span className="mt-2 h-1 w-3 shrink-0 bg-amber-300" />
                  VERY detailed document of how every single SE method works,
                  all SE terms explained, with private-company application notes.
                </li>
              </ul>
            </div>
          </GlassCard>
        </div>
      </section>

      <section className="relative py-24 text-center">
        <HeroBackground />
        <div className="container-wide relative">
          <KineticText
            as="h2"
            text="Stop watching. Start earning."
            className="editorial-display mx-auto bg-gradient-to-b from-white to-amber-200 bg-clip-text text-transparent text-[clamp(2rem,7vw,6rem)] uppercase"
          />
          <Reveal delay={0.3}>
            <div className="mt-8">
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
    </>
  );
}
