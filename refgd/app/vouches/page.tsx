import Link from "next/link";
import { Reveal, Orb } from "@/components/Reveal";
import { ReorderableContainer, ReorderableSection } from "@/components/ReorderableSection";

export const metadata = {
  title: "Vouches — RefundGod",
  description: "5+ years of vouches. Read live testimonials in our Telegram group.",
};

const VOUCH_QUOTES = [
  { who: "@anon_1", body: "Got my $4k Sam's Club refund in under 7 days. Smooth process, communication was 10/10." },
  { who: "@reseller_j", body: "Did 3 orders back to back on Crate & Barrel — every one paid out. These guys are legit." },
  { who: "@goldenchain", body: "Jaxxon $7,500 chain refunded clean. Mentorship was worth every cent." },
  { who: "@silentbuyer", body: "After getting banned everywhere, the OpSec guide brought my accounts back to life." },
];

export default function VouchesPage() {
  return (
    <ReorderableContainer pageId="vouches">
      <ReorderableSection sectionId="hero">
      <section className="relative isolate overflow-hidden">
        <Orb className="left-10 top-10 h-96 w-96" color="rgba(34,211,238,0.25)" />
        <Orb className="right-10 top-40 h-72 w-72" color="rgba(245,185,69,0.25)" />
        <div className="container-px relative pt-20 pb-10 text-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/85">
              Trusted Worldwide
            </p>
            <h1 className="heading-display mt-3 text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Vouches
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-base text-white/65">
              Real customers. Real refunds. The full archive lives inside our
              Telegram group — public excerpts below.
            </p>
          </Reveal>
        </div>
      </section>
      </ReorderableSection>
      <ReorderableSection sectionId="quotes">
      <section className="container-px pb-16">
        <div className="grid gap-4 md:grid-cols-2">
          {VOUCH_QUOTES.map((v, i) => (
            <Reveal key={v.who} delay={i * 0.08}>
              <figure className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <blockquote className="text-base leading-relaxed text-white/80">
                  &ldquo;{v.body}&rdquo;
                </blockquote>
                <figcaption className="mt-3 text-sm text-amber-300/85">— {v.who}</figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
        <Reveal>
          <div className="mt-10 text-center">
            <a href="https://t.me/+nwkW2Mw3959mZDc0" target="_blank" rel="noopener noreferrer" className="btn-primary">
              See live vouches in Telegram
            </a>
          </div>
        </Reveal>
      </section>
      </ReorderableSection>
    </ReorderableContainer>
  );
}
