import Link from "next/link";
import Image from "next/image";
import { Reveal, Orb } from "./Reveal";
import ScrollReveal3D from "./ScrollReveal3D";
import Tilt3D from "./Tilt3D";

/**
 * "Our Service" content, embedded at the top of the store list page.
 * Pulled from the original /our-service route which is now a redirect.
 */

const STEPS = [
  {
    n: "01",
    title: "Place your order",
    body:
      "Choose a participating store from our store list, and follow any instructions to place your order. Questions? We're available on Telegram around the clock.",
  },
  {
    n: "02",
    title: "Submit your order",
    body:
      "Once your order is in, fill our service form so we can work our magic. Stores have different timeframes — and every form is end-to-end encrypted to protect your privacy.",
  },
  {
    n: "03",
    title: "Enjoy your order",
    body:
      "Once you receive a confirmation or your funds back, simply pay our service fee. After that, all data related to you is permanently deleted.",
  },
];

export default function ServiceSection() {
  return (
    <div id="service" className="relative isolate scroll-mt-16">
      <section className="relative overflow-hidden">
        {/* Hero image bar with parallax */}
        <div className="relative aspect-[16/8] sm:aspect-[16/6] overflow-hidden">
          <Image
            src="/images/storelist-hero.png"
            alt="RefundGod store list"
            fill
            priority
            sizes="100vw"
            className="object-cover scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950/40 via-ink-950/55 to-ink-950" />
          <Orb className="left-1/2 top-10 h-96 w-96 -translate-x-1/2" color="rgba(245,185,69,0.22)" />
          <Orb className="right-0 top-40 h-72 w-72" color="rgba(199,121,208,0.22)" />
          <div className="container-px absolute inset-0 grid place-items-center text-center">
            <Reveal>
              <p className="heading-display text-xs font-semibold uppercase tracking-[0.45em] text-amber-300/90 sm:text-sm">
                Our Service
              </p>
              <h1 className="heading-display mx-auto mt-3 max-w-3xl bg-gradient-to-r from-amber-200 via-white to-amber-200 bg-clip-text text-4xl font-bold uppercase tracking-tight text-transparent sm:text-6xl md:text-7xl">
                Get rewarded for shopping online
              </h1>
              <p className="mt-4 text-xl italic text-white/80">Ahh.. feel the joy of cashback.</p>
              <p className="mx-auto mt-5 max-w-2xl text-base text-white/75">
                With our exclusive service, we provide a rewarding shopping
                experience, so that you can enjoy the world at a fraction of
                the price.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      <section className="container-px pb-12">
        <ScrollReveal3D intensity={0.8}>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-8 sm:p-12">
            <h2 className="heading-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Stop wasting time and money.
            </h2>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-white/75">
              With over 100+ participating stores — clothes, electronics, food,
              home, furniture, even travel — we help you enjoy it all at a
              fraction of the price.
            </p>
          </div>
        </ScrollReveal3D>
      </section>

      <section className="container-px pb-12">
        <Reveal>
          <h2 className="heading-display mb-6 text-3xl font-bold tracking-tight text-white">How it works</h2>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {STEPS.map((s) => (
            <Tilt3D key={s.n} intensity={0.5}>
              <div className="relative h-full overflow-hidden rounded-2xl border border-white/10 bg-ink-900/60 p-6 transition-shadow hover:shadow-[0_25px_60px_-25px_rgba(245,185,69,0.45)]">
                <div className="heading-display text-6xl font-bold text-amber-300/15">{s.n}</div>
                <h3 className="heading-display -mt-6 text-xl font-bold text-white">
                  Step {Number(s.n)} — {s.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-white/75">{s.body}</p>
              </div>
            </Tilt3D>
          ))}
        </div>
      </section>

      <section className="container-px pb-16">
        <Reveal>
          <h2 className="heading-display mb-4 text-3xl font-bold tracking-tight text-white">
            Why choose us?
          </h2>
        </Reveal>
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            "5+ years of experience. Our advanced systems and insiders are always up-to-date, sorting individual data points to ensure maximum success on your order.",
            "End-to-end encryption and isolated environments — your data never gets mixed with others, eliminating bans, fails or data leaks.",
            "We offer stores nobody else does, and we act with urgency to begin working on your order almost immediately after submission.",
          ].map((body, i) => (
            <Tilt3D key={i} intensity={0.4}>
              <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-white/75">
                {body}
              </p>
            </Tilt3D>
          ))}
        </div>
      </section>

      <section className="container-px pb-12">
        <ScrollReveal3D>
          <div className="overflow-hidden rounded-3xl border border-amber-400/20 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 p-8 sm:p-12 text-center">
            <h2 className="heading-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
              Innovative, fast and easy to use
            </h2>
            <p className="mt-3 text-white/80">Awarded #1 service @RefundGod handle</p>
            <p className="mx-auto mt-3 max-w-2xl text-white/75">
              Choose wisely and let us handle your order with utmost care and
              quality. We are certain you will be returning back to us in no
              time.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link href="#region" className="btn-primary">
                Browse the store list ↓
              </Link>
              <a
                href="https://cryptpad.fr/form/#/2/form/view/8G2YtzZK21kTYT4Hib0yja1VVoh2Q+3dPhBMKQtH37w/"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                Submit your order →
              </a>
            </div>
          </div>
        </ScrollReveal3D>
      </section>
    </div>
  );
}
