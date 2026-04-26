import Image from "next/image";
import { Reveal, Orb } from "@/components/Reveal";
import ScrollReveal3D, { ScrollFloatImage } from "@/components/ScrollReveal3D";

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
  },
  {
    title: "Precise, step-by-step procedures",
    body:
      "While creating numerous accounts may seem easy by simply using new information, the real value lies in maintaining their longevity without encountering bans or cancelations due to algorithm detections.",
  },
  {
    title: "Range of features",
    body:
      "Lifetime updates, anonymity techniques, account management strategies, anonymous credit cards, multi-account safety, automatic customers for selling items, and account-linking prevention.",
  },
  {
    title: "No filler, no BS",
    body:
      "After investing significant time and resources we offer only the most precise and actionable methods, with a lifetime support guarantee.",
  },
];

const PRICING = [
  {
    title: "Stealth / OpSEC Guide + Rebill Bypass",
    body:
      "Remain fully anonymous while surfing online, place orders under a forged identity, never face a rebill again — and much more.",
    url: "https://refundgod.bgng.io/product/stealth-opsec-guide-rebill-bypass-guide",
  },
  {
    title: "Evasion Book — Level 1",
    body:
      "For those who want a serious long-term solution and to hit big ordering from multiple accounts at once before the store has a chance to detect and ban you. 45 pages, no filler.",
    url: "https://refundgod.bgng.io/product/evade1",
  },
  {
    title: "Evasion Book — Level 2",
    body:
      "For those just starting out with limited experience. Quick and easy solutions with free and paid alternatives. 10+ pages with lifetime support.",
    url: "https://refundgod.bgng.io/product/evasion-book---level-2",
  },
];

export default function EvadePage() {
  return (
    <>
      <section className="relative isolate overflow-hidden">
        <Orb className="left-1/3 top-10 h-96 w-96 animate-pulseGlow" color="rgba(34,211,238,0.3)" />
        <Orb className="right-0 top-40 h-80 w-80 animate-pulseGlow" color="rgba(245,185,69,0.25)" />

        <div className="container-px relative grid items-center gap-10 pt-20 pb-12 md:grid-cols-[1.1fr_0.9fr]">
          <Reveal>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-cyan-300/85">
              Evade Cancelations
            </p>
            <h1 className="heading-display mt-3 text-4xl font-bold tracking-tight text-white sm:text-6xl">
              <span className="bg-gradient-to-r from-cyan-200 via-white to-amber-200 bg-clip-text text-transparent">
                Experience Online Freedom
              </span>
            </h1>
            <p className="mt-4 max-w-xl text-lg text-white/75">
              Say goodbye to order cancelations, bans, rebills, failed refunds
              due to fraud detections &amp; more.
            </p>
            <p className="mt-3 text-sm uppercase tracking-widest text-white/45">
              Trusted by clients worldwide
            </p>
          </Reveal>

          <ScrollFloatImage amount={70}>
            <div className="relative mx-auto aspect-square w-full max-w-md animate-floatSlow rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/15 to-amber-500/10 p-3 shadow-[0_30px_120px_-30px_rgba(34,211,238,0.55)]">
              <Image
                src="/images/splash-2.png"
                alt="Evade Cancelations"
                fill
                priority
                sizes="(max-width: 768px) 80vw, 32rem"
                className="rounded-2xl object-contain p-6 drop-shadow-[0_0_60px_rgba(103,232,249,0.5)]"
              />
            </div>
          </ScrollFloatImage>
        </div>
      </section>

      <section className="container-px pb-12">
        <ScrollReveal3D>
          <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-500/10 to-transparent p-8 sm:p-12">
            <h2 className="heading-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Evade like a PRO
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-white/75">
              Dive into a comprehensive overview of each store&apos;s anti-fraud
              system and their ability to detect suspicious user behaviour.
              Stores invest hundreds of thousands each year to fight against
              refunders and are equipped with advanced machine learning
              algorithms to identify potential fraud — even if you are not
              banned.
            </p>
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-white/75">
              During the checkout process, you are assigned a fraud score, and
              if it reaches a certain threshold, your current and future
              orders may be cancelled.
            </p>
          </div>
        </ScrollReveal3D>
      </section>

      <section className="container-px pb-12">
        <Reveal>
          <h2 className="heading-display mb-6 text-3xl font-bold tracking-tight text-white">
            Our comprehensive solutions
          </h2>
        </Reveal>
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            "Avoid account bans and cancellations by learning how to properly and efficiently place large orders without account aging.",
            "Gain insights into avoiding rebills or winning against an existing rebill, plus understanding anti-fraud systems, user behaviour analysis, order fraud scores, and the latest algorithms used by online stores.",
            "Remain completely anonymous while surfing the internet and placing your orders under a forged identity with credit lines up to $10,000.",
          ].map((body, i) => (
            <ScrollReveal3D key={i} intensity={0.5}>
              <p className="rounded-2xl border border-white/10 bg-white/5 p-6 text-sm leading-relaxed text-white/75">
                {body}
              </p>
            </ScrollReveal3D>
          ))}
        </div>
      </section>

      <section className="container-px pb-12">
        <div className="grid gap-4 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <ScrollReveal3D key={f.title} intensity={0.6}>
              <div className="rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
                <h3 className="heading-display text-xl font-bold text-white">{f.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-white/75">{f.body}</p>
              </div>
            </ScrollReveal3D>
          ))}
        </div>
      </section>

      <section className="container-px pb-12">
        <Reveal>
          <h2 className="heading-display mb-6 text-3xl font-bold tracking-tight text-white">
            Why trust us?
          </h2>
        </Reveal>
        <div className="grid gap-4 lg:grid-cols-3">
          {[
            { title: "Who we are?", body: "We are an experienced team of cyber security developers, who initially established our presence on the dark web. During summer 2019 we relied on selling on Amazon when a significant setback was encountered — accounts of close friends and family members were suspended." },
            { title: "The setback", body: "Undeterred, we persevered through numerous trials and errors, eventually discovering a secure and effective method to regain access to Amazon and PayPal, enabling us to resume selling. Motivated, we shared the knowledge — and the highly sought-after guide was born." },
            { title: "The aftermath", body: "For the following six months we dedicated extensive time and effort to developing effective strategies for safely creating multiple Amazon accounts without being linked or blocked, which soon led to research of other stores and their algorithms." },
          ].map((c, i) => (
            <ScrollReveal3D key={c.title} intensity={0.5}>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                <h3 className="heading-display text-lg font-bold text-white">{c.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-white/75">{c.body}</p>
              </div>
            </ScrollReveal3D>
          ))}
        </div>
      </section>

      <section className="container-px pb-24" id="Learn">
        <Reveal>
          <h2 className="heading-display mb-2 text-3xl font-bold tracking-tight text-white">
            Get started placing orders, today!
          </h2>
          <p className="mb-8 text-white/65">Our pricing — select your plan:</p>
        </Reveal>
        <div className="grid gap-5 md:grid-cols-3">
          {PRICING.map((p, i) => (
            <ScrollReveal3D key={p.title} intensity={0.6}>
              <div className="flex h-full flex-col rounded-2xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent p-6">
                <h3 className="heading-display text-xl font-bold text-white">{p.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-white/75">{p.body}</p>
                <a
                  href={p.url}
                  target="_blank" rel="noopener noreferrer"
                  className="btn-primary mt-5 w-full !justify-center"
                >
                  Buy Now
                </a>
              </div>
            </ScrollReveal3D>
          ))}
        </div>
      </section>
    </>
  );
}
