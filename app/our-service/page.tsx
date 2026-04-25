import Link from "next/link";
import { Reveal, Orb } from "@/components/Reveal";

export const metadata = {
  title: "Our Service — RefundGod",
  description:
    "Place an order, submit it through our encrypted form, and enjoy. RefundGod's three-step process explained, with details on encryption and timeframes.",
};

const STEPS = [
  {
    n: "01",
    title: "Place your order",
    body:
      "Choose a participating store from our vast variety store list of your choice, and follow the instructions (if any) to place your order. In case of any doubts or questions, please feel free to contact us!",
  },
  {
    n: "02",
    title: "Submit your order",
    body:
      "Once you receive your order, kindly fill our service form so we can work our magic to ensure a smooth and safe process. Keep in mind: all stores have different timeframes. All forms are end-to-end encrypted to ensure your privacy.",
  },
  {
    n: "03",
    title: "Enjoy your order",
    body:
      "Once you receive a confirmation email or your funds back, simply pay our service fee. After which, all information related to you is permanently deleted.",
  },
];

export default function OurServicePage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Orb className="left-1/2 top-10 h-96 w-96 -translate-x-1/2" color="rgba(245,185,69,0.25)" />
        <Orb className="right-0 top-40 h-72 w-72" color="rgba(199,121,208,0.25)" />
        <div className="container-px relative pt-20 pb-12 text-center">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-300/85">
              Our Service
            </p>
            <h1 className="heading-display mx-auto mt-3 max-w-3xl text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Get rewarded for shopping online
            </h1>
            <p className="mt-3 text-xl italic text-white/70">Ahh.. feel the joy of cashback.</p>
            <p className="mx-auto mt-6 max-w-2xl text-base text-white/65">
              With our exclusive service, we provide a rewarding shopping
              experience, so that you can enjoy the world at a fraction of
              the price.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="container-px pb-12">
        <Reveal>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-8 sm:p-12">
            <h2 className="heading-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Stop wasting time and money.
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-white/70">
              With over 100+ participating stores, whether you are shopping for
              clothes, electronics, food, home improvement, furniture or just
              simply travelling around the world for work or vacation, we help
              you enjoy it all — at a fraction of the price.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="container-px pb-16">
        <Reveal>
          <h2 className="heading-display mb-8 text-3xl font-bold tracking-tight text-white">How It Works</h2>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.12}>
              <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-6">
                <div className="heading-display text-6xl font-bold text-amber-300/15">{s.n}</div>
                <h3 className="heading-display -mt-6 text-xl font-bold text-white">
                  Step {Number(s.n)} — {s.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/65">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="container-px pb-16">
        <Reveal>
          <h2 className="heading-display mb-4 text-3xl font-bold tracking-tight text-white">
            Why choose us?
          </h2>
          <div className="grid gap-4 lg:grid-cols-3">
            <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-white/70">
              With over 5 years of experience our advanced systems and insiders
              are always up to date in the game, sorting individual data points
              throughout the data pipeline to be analysed for actionable
              insights, ensuring maximum success on your order.
            </p>
            <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-white/70">
              We employ advanced measures to fortify the security of your
              account and information with end-to-end encryption, and deploy
              isolated environments, ensuring your data does not get mixed
              with others, which leads to bans, fails or data leaks.
            </p>
            <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-white/70">
              United by our expertise, creativity and shared vision, we offer
              stores that NOBODY else does, and act with a sense of urgency to
              almost immediately begin working on your order.
            </p>
          </div>
        </Reveal>
      </section>

      <section className="container-px pb-24">
        <Reveal>
          <div className="overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 p-8 sm:p-12 text-center">
            <h2 className="heading-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Innovative, Fast and Easy to Use
            </h2>
            <p className="mt-3 text-white/75">Awarded #1 service @RefundGod handle</p>
            <p className="mx-auto mt-3 max-w-2xl text-white/65">
              You have NOTHING to lose and only to gain! Choose wisely and make
              the right decision by letting us handle your order with utmost
              care and quality. We are certain you will be returning back to
              us in no time.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="/store-list" className="btn-primary">
                Refund Store List
              </Link>
              <a
                href="https://cryptpad.fr/form/#/2/form/view/8G2YtzZK21kTYT4Hib0yja1VVoh2Q+3dPhBMKQtH37w/"
                target="_blank" rel="noopener noreferrer" className="btn-ghost"
              >
                Submit your order →
              </a>
            </div>
          </div>
        </Reveal>
      </section>
    </>
  );
}
