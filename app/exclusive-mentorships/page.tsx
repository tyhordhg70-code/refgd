import Image from "next/image";
import { Reveal } from "@/components/Reveal";
import ScrollReveal3D from "@/components/ScrollReveal3D";
import PinSection from "@/components/PinSection";
import Tilt3D from "@/components/Tilt3D";

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
      {/* Cinematic pinned hero */}
      <PinSection
        imageSrc="/images/mentorship-hero.png"
        alt="Refund & SE Mentorship"
        eyebrow="Exclusive Mentorships"
        title="Refund & SE Mentorship"
        body="Stop paying for other BS mentorships that have 0 value and ghost you after purchasing. Be your own refunder."
        accent="violet"
      />

      {/* CTA below hero */}
      <section className="container-px -mt-32 relative z-10 pb-12 text-center">
        <Reveal>
          <a
            href="https://refundgod.bgng.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-primary"
          >
            Buy Now
          </a>
        </Reveal>
      </section>

      {/* Refunding intro */}
      <section className="container-px pb-12">
        <ScrollReveal3D>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-violet-500/10 via-white/5 to-transparent p-8 sm:p-12">
            <h2 className="heading-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              What is this Refunding Mentorship about?
            </h2>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-white/75">
              <p>
                Refunding is a manipulation technique that exploits human error
                and finding loopholes in company policies, deceiving the
                company into processing a full refund for your item with
                various methods while keeping your item.
              </p>
              <p>
                Refunding centers around your use of persuasion and confidence.
                When exposed to these tactics, company agents are more likely
                to take actions they otherwise wouldn&apos;t.
              </p>
              <p>
                Among many methods, you target specific emotions as emotional
                manipulation gives you the upper hand in any interaction. The
                agent is far more likely to take irrational or risky actions
                when in an enhanced emotional state.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-2">
              {EMOTIONS.map((e) => (
                <span
                  key={e}
                  className="rounded-full border border-violet-400/30 bg-violet-400/10 px-4 py-1.5 text-sm font-medium text-violet-100"
                >
                  {e}
                </span>
              ))}
            </div>
          </div>
        </ScrollReveal3D>
      </section>

      {/* Tailgating */}
      <section className="container-px pb-12">
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <Tilt3D intensity={0.5}>
            <div className="h-full rounded-2xl border border-white/10 bg-white/5 p-6">
              <h3 className="heading-display text-xl font-bold text-white">Access Tailgating Attacks</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                Tailgating, or piggybacking, is the act of trailing an
                authorised staff member into a restricted-access area.
                Attackers may play on social courtesy to get you to hold the
                door for them or convince you that they are also authorised.
                Pretexting plays a role here too — attackers exploit
                psychology to manipulate people into specific actions.
              </p>
            </div>
          </Tilt3D>
          <Tilt3D intensity={0.5}>
            <div className="h-full rounded-2xl border border-amber-400/20 bg-gradient-to-br from-amber-500/15 to-transparent p-6">
              <h3 className="heading-display text-xl font-bold text-amber-100">Become your own private insider</h3>
              <p className="mt-3 text-sm leading-relaxed text-white/75">
                Be fully anonymous, apply with stealth overseas information,
                pass through job interviews, learn each customer service
                tier&apos;s refunding limits & abilities, and how to get promoted
                to higher status to push your own orders through.
              </p>
              <p className="mt-2 text-xs italic text-white/55">
                This is not included in the regular mentorship — it&apos;s a
                separate add-on.
              </p>
            </div>
          </Tilt3D>
        </div>
      </section>

      {/* Refund features */}
      <section className="container-px pb-12">
        <Reveal>
          <h3 className="heading-display mb-6 text-2xl font-bold tracking-tight text-white">
            What&apos;s included — Refunding Mentorship
          </h3>
        </Reveal>
        <div className="grid gap-3 md:grid-cols-2">
          {REFUND_FEATURES.map((f) => (
            <Tilt3D key={f} intensity={0.3}>
              <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-emerald-400/20 text-emerald-200">✓</span>
                <p className="text-sm font-medium text-white/85">{f}</p>
              </div>
            </Tilt3D>
          ))}
        </div>
        <Reveal>
          <p className="mt-6 text-sm text-white/65">
            We can guarantee that you&apos;ll be making AT LEAST $2,000/week within
            2 weeks of starting if you follow everything correctly. By
            refunding one order alone you already profit. You also get access
            to a community of students discussing strategies.
          </p>
        </Reveal>
      </section>

      {/* SE intro */}
      <section className="container-px pb-12">
        <ScrollReveal3D>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 via-white/5 to-transparent p-8 sm:p-12">
            <h2 className="heading-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Social Engineering (SE) Mentorship
            </h2>
            <div className="mt-4 space-y-4 text-base leading-relaxed text-white/75">
              <p>
                Our focus is a more modern approach which takes advantage of
                companies&apos; warranty policy, allowing you to obtain warranty
                replacement products directly from the company, without an
                initial purchase like refunding. This saves the anxiety of
                failure, and does not cut into your budget while waiting for
                a result.
              </p>
              <p>
                We introduce you to methodologies on how to manipulate any
                company into issuing a &ldquo;advanced replacement&rdquo; or
                &ldquo;refunds&rdquo;, by using a calculated approach to why
                sending back the item for repair cannot be personally
                accepted, leaving an advance replacement as the only viable
                alternative.
              </p>
              <p>
                Every product has a warranty. If something goes wrong while in
                warranty, companies ship out brand new product replacements
                for FREE. SE allows you to obtain FREE products without
                upfront payment from various electronics and furniture
                companies — products worth thousands of $$ with no upfront
                cost.
              </p>
            </div>
          </div>
        </ScrollReveal3D>
      </section>

      <section className="container-px pb-12">
        <Reveal>
          <h3 className="heading-display mb-6 text-2xl font-bold tracking-tight text-white">
            What&apos;s included — SE Mentorship
          </h3>
        </Reveal>
        <div className="grid gap-3 md:grid-cols-2">
          {SE_FEATURES.map((f) => (
            <Tilt3D key={f} intensity={0.3}>
              <div className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-cyan-400/20 text-cyan-200">✓</span>
                <p className="text-sm font-medium text-white/85">{f}</p>
              </div>
            </Tilt3D>
          ))}
        </div>
      </section>

      <section className="container-px pb-12">
        <ScrollReveal3D>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h3 className="heading-display text-xl font-bold text-white">Additional add-ons</h3>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-white/75">
              <li>Live SE&apos;ing on call / TeamViewer / screenshare. Personal mentorship through your SE.</li>
              <li>International reshipping to any country with customs prepaid.</li>
              <li>VERY detailed document of how every single SE method works, all SE terms explained, with private-company application notes.</li>
            </ul>
          </div>
        </ScrollReveal3D>
      </section>

      <section className="container-px pb-24 text-center">
        <Reveal>
          <a href="https://refundgod.bgng.io/" target="_blank" rel="noopener noreferrer" className="btn-primary">
            Buy Now
          </a>
        </Reveal>
      </section>
    </>
  );
}
