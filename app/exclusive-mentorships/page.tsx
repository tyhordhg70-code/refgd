import { Reveal } from "@/components/Reveal";
import ChipScroll from "@/components/ChipScroll";
import GlassCard from "@/components/GlassCard";
import KineticText from "@/components/KineticText";
import MagneticButton from "@/components/MagneticButton";
import AnimatedChessBoard from "@/components/AnimatedChessBoard";
import ParallaxIllustration from "@/components/ParallaxIllustration";
import ParallaxChapter from "@/components/ParallaxChapter";

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

/**
 * NOTE: Each major chapter section is wrapped in <ParallaxChapter> — the
 * background illustration drifts slower than the foreground content,
 * producing a layered 3D depth effect on scroll.
 */
export default function MentorshipsPage() {
  return (
    <div className="relative">
      {/* Act 1 — Scroll-linked scrollytelling */}
      <ChipScroll
        dir="/sequence/mentor"
        /* frameCount={0} → use the procedural chess fallback scene
           directly (no 404 spam from missing frame_*.webp assets). */
        frameCount={0}
        background="#05060a"
        accent="#a78bfa"
        fallbackKind="chess"
        caption="Refund & SE Mentorship."
        subCaption="Stop paying for other BS mentorships that have 0 value and ghost you after purchasing. Be your own refunder."
      />

      {/* Inline CTA */}
      <section className="relative z-10 pb-12 pt-12 text-center">
        <Reveal>
          <MagneticButton href="https://refundgod.bgng.io/" external variant="primary">
            Shop Methods
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="m12 5 7 7-7 7" /><path d="M5 12h14" />
            </svg>
          </MagneticButton>
        </Reveal>
      </section>

      {/* Act 2 — Refunding intro / chapter 01 — parallax depth */}
      <ParallaxChapter
        intensity={0.5}
        className="py-24"
        bgClassName="absolute inset-0 grid place-items-center opacity-25"
        bg={<ParallaxIllustration kind="chess" accent="violet" size={680} />}
      >
        <div className="container-wide relative grid items-center gap-10 sm:grid-cols-12">
          <div className="sm:col-span-5">
            <p
              className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-violet-300"
              style={{ textShadow: "0 0 24px rgba(167,139,250,0.6)" }}
            >
              — chapter 01 / refund
            </p>
            <KineticText
              as="h2"
              text="What is this Refunding Mentorship about?"
              className="editorial-display mt-5 text-white text-[clamp(1.8rem,5vw,4rem)] uppercase"
              style={{ textShadow: "0 4px 30px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.95)" }}
            />
            {/* Animated chess composition floats next to the title on lg+ */}
            <div className="chess-float mt-8 hidden h-72 sm:block">
              <AnimatedChessBoard className="h-full w-full" />
            </div>
          </div>
          <div className="sm:col-span-7">
            <GlassCard tint="violet" className="pulse-glow-violet">
              <div className="space-y-4 p-8 text-base leading-relaxed text-white/90 sm:text-lg">
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
                      className="rounded-full border border-violet-400/40 bg-violet-400/15 px-4 py-1.5 text-sm font-semibold text-violet-50 backdrop-blur-sm"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </ParallaxChapter>

      {/* Act 3 — Tailgating + Insider — parallax depth + floating cards */}
      <ParallaxChapter
        intensity={0.45}
        className="py-12"
        bgClassName="absolute left-[6%] top-[10%] hidden lg:block"
        bg={<ParallaxIllustration kind="shield" accent="cyan" size={300} />}
      >
        <div className="container-wide relative grid gap-5 lg:grid-cols-[1.2fr_1fr]">
          <GlassCard tint="cyan" className="float-card pulse-glow-cyan">
            <div className="relative overflow-hidden p-8">
              <div className="pointer-events-none absolute -right-6 -top-6 opacity-30">
                <ParallaxIllustration kind="shield" accent="cyan" size={160} />
              </div>
              <h3 className="relative heading-display text-2xl font-bold uppercase tracking-tight text-white">
                Access Tailgating Attacks
              </h3>
              <p className="relative mt-4 text-base leading-relaxed text-white/90">
                Tailgating, or piggybacking, is the act of trailing an
                authorised staff member into a restricted-access area.
                Attackers may play on social courtesy to get you to hold the
                door for them or convince you that they are also authorised.
                Pretexting plays a role here too — attackers exploit
                psychology to manipulate people into specific actions.
              </p>
            </div>
          </GlassCard>
          <GlassCard tint="amber" className="float-card float-card-2 pulse-glow">
            <div className="relative overflow-hidden p-8">
              <div className="pointer-events-none absolute -right-6 -top-6 opacity-30">
                <ParallaxIllustration kind="globe" accent="amber" size={160} />
              </div>
              <h3 className="relative heading-display text-2xl font-bold uppercase tracking-tight text-amber-100">
                Become your own private insider
              </h3>
              <p className="relative mt-4 text-base leading-relaxed text-white/90">
                Be fully anonymous, apply with stealth overseas information,
                pass through job interviews, learn each customer service
                tier&apos;s refunding limits & abilities, and how to get
                promoted to higher status to push your own orders through.
              </p>
              <p className="relative mt-3 text-xs italic text-white/70">
                This is not included in the regular mentorship — it&apos;s a
                separate add-on.
              </p>
            </div>
          </GlassCard>
        </div>
      </ParallaxChapter>

      {/* Act 4 — What's included (Refund) — parallax depth */}
      <ParallaxChapter
        intensity={0.55}
        className="py-20"
        bgClassName="absolute right-[3%] top-0 hidden lg:block"
        bg={<ParallaxIllustration kind="chess" accent="violet" size={380} />}
      >
        <div className="container-wide relative">
          <Reveal>
            <p
              className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-violet-300"
              style={{ textShadow: "0 0 24px rgba(167,139,250,0.6)" }}
            >
              — what&apos;s included
            </p>
            <h3
              className="editorial-display mt-5 max-w-4xl text-balance text-white text-[clamp(1.8rem,5vw,4rem)] uppercase"
              style={{ textShadow: "0 4px 30px rgba(0,0,0,0.9)" }}
            >
              Refunding Mentorship.
            </h3>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {REFUND_FEATURES.map((f, i) => (
              <GlassCard key={f} tint={i % 2 ? "violet" : "neutral"} delay={i * 0.05}>
                <div className="flex items-start gap-4 p-5">
                  <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-400/25 text-sm font-bold text-emerald-100 ring-1 ring-emerald-300/40">
                    ✓
                  </span>
                  <p className="text-base font-medium text-white/95">{f}</p>
                </div>
              </GlassCard>
            ))}
          </div>
          <Reveal delay={0.4}>
            <p className="mt-8 text-base text-white/85">
              We can guarantee that you&apos;ll be making AT LEAST $2,000/week
              within 2 weeks of starting if you follow everything correctly.
              By refunding one order alone you already profit. You also get
              access to a community of students discussing strategies.
            </p>
          </Reveal>
        </div>
      </ParallaxChapter>

      {/* Act 5 — SE intro / chapter 02 — parallax depth */}
      <ParallaxChapter
        intensity={0.5}
        className="py-24"
        bgClassName="absolute inset-0 grid place-items-center opacity-25"
        bg={<ParallaxIllustration kind="encryption" accent="cyan" size={620} />}
      >
        <div className="container-wide relative grid items-start gap-10 sm:grid-cols-12">
          <div className="sm:col-span-5 sm:order-2">
            <p
              className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-cyan-300"
              style={{ textShadow: "0 0 24px rgba(34,211,238,0.55)" }}
            >
              — chapter 02 / SE
            </p>
            <KineticText
              as="h2"
              text="Social Engineering Mentorship."
              className="editorial-display mt-5 text-white text-[clamp(1.8rem,5vw,4rem)] uppercase"
              style={{ textShadow: "0 4px 30px rgba(0,0,0,0.9), 0 2px 6px rgba(0,0,0,0.95)" }}
            />
            <div className="float-card mt-8 hidden h-60 sm:block">
              <ParallaxIllustration kind="encryption" accent="cyan" size={240} />
            </div>
          </div>
          <div className="sm:col-span-7 sm:order-1">
            <GlassCard tint="cyan" className="pulse-glow-cyan">
              <div className="space-y-4 p-8 text-base leading-relaxed text-white/90 sm:text-lg">
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
      </ParallaxChapter>

      {/* Act 6 — What's included (SE) — parallax depth */}
      <ParallaxChapter
        intensity={0.5}
        className="py-20"
        bgClassName="absolute left-[3%] top-0 hidden lg:block"
        bg={<ParallaxIllustration kind="spark" accent="cyan" size={360} />}
      >
        <div className="container-wide relative">
          <Reveal>
            <p
              className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-cyan-300"
              style={{ textShadow: "0 0 24px rgba(34,211,238,0.55)" }}
            >
              — what&apos;s included
            </p>
            <h3
              className="editorial-display mt-5 max-w-4xl text-balance text-white text-[clamp(1.8rem,5vw,4rem)] uppercase"
              style={{ textShadow: "0 4px 30px rgba(0,0,0,0.9)" }}
            >
              SE Mentorship.
            </h3>
          </Reveal>
          <div className="mt-12 grid gap-4 md:grid-cols-2">
            {SE_FEATURES.map((f, i) => (
              <GlassCard key={f} tint={i % 2 ? "cyan" : "neutral"} delay={i * 0.05}>
                <div className="flex items-start gap-4 p-5">
                  <span className="mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-cyan-400/25 text-sm font-bold text-cyan-100 ring-1 ring-cyan-300/40">
                    ✓
                  </span>
                  <p className="text-base font-medium text-white/95">{f}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </ParallaxChapter>

      {/* Act 7 — Add-ons */}
      <section className="relative py-12">
        <div className="container-wide relative">
          <GlassCard tint="amber" className="pulse-glow float-card">
            <div className="relative overflow-hidden p-8">
              <div className="pointer-events-none absolute -right-6 -top-6 opacity-25">
                <ParallaxIllustration kind="store" accent="amber" size={150} />
              </div>
              <h3 className="relative heading-display text-2xl font-bold uppercase tracking-tight text-white">
                Additional add-ons
              </h3>
              <ul className="relative mt-5 space-y-3 text-base text-white/90">
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
        <div className="container-wide relative">
          <KineticText
            as="h2"
            text="Stop watching. Start earning."
            className="editorial-display mx-auto text-white text-[clamp(2rem,7vw,6rem)] uppercase"
            style={{ textShadow: "0 4px 40px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.85)" }}
          />
          <Reveal delay={0.3}>
            <div className="mt-8">
              <MagneticButton href="https://refundgod.bgng.io/" external variant="primary">
                Shop Methods
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
