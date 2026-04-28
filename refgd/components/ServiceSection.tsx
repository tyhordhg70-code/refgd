"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Reveal } from "./Reveal";
import KineticText from "./KineticText";
import GlassCard from "./GlassCard";
import MagneticButton from "./MagneticButton";
import InteractiveParticles from "./InteractiveParticles";
import ParallaxIllustration from "./ParallaxIllustration";
import CashbackScene from "./CashbackScene";
import MoneyTimeScene from "./MoneyTimeScene";
import ParallaxChapter from "./ParallaxChapter";

/**
 * "Stop wasting time and money" illustration: the leaping shopper
 * artwork (transparent PNG) animated as if he's springing toward the
 * phone. Uses framer-motion to:
 *   • float gently up & down on a 3.6s loop (the "leap" pose),
 *   • bob the credit-card horizontally on a slightly different cadence
 *     so the figure feels alive rather than static,
 *   • drift the whole composition in on first paint with a soft scale.
 *
 * `MoneyTimeScene` is left in the import list because other entry
 * points elsewhere in the codebase still reference this module's
 * exports — removing the import here is a no-op for that.
 */
function WastingTimeIllustration({ size }: { size: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: 18 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: false, margin: "-10% 0px" }}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      style={{
        width: size,
        height: size,
        position: "relative",
        filter: "drop-shadow(0 30px 50px rgba(0,0,0,0.55))",
      }}
    >
      <motion.img
        src="/uploads/wasting-time-phone.png"
        alt="Shopper leaping toward a phone with a credit card — saving time and money."
        loading="lazy"
        decoding="async"
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
        }}
      />
    </motion.div>
  );
}

/**
 * Multi-act intro section, embedded at the top of /store-list.
 *   Act 1: animated CASHBACK hero (replaces the central planet/orb with
 *          a 3D-feel cashback scene — coins, shopping bag, sparkling joy).
 *   Act 2: editorial subheading + supporting copy + 3D money-time scene.
 *   Act 3: 3-step glass timeline with floating cards (parallax depth).
 *   Act 4: "Why us" three-up — parallax chapter (bg slower than fg).
 *   Act 5: Awarded glass CTA banner with pulsating glow.
 */

const STEPS = [
  {
    n: "01",
    title: "Place your order",
    body:
      "Choose a participating store from our list and follow any instructions to place your order. Questions? We're available on Telegram around the clock.",
    tint: "amber" as const,
    illust: "store" as const,
  },
  {
    n: "02",
    title: "Submit your order",
    body:
      "If your order ships with UPS courier, let us know right away. Otherwise, once you receive it, fill our service form so we can work our magic. All stores have different timeframes — every form is end-to-end encrypted to protect your privacy. You're notified the moment your order is complete.",
    tint: "violet" as const,
    illust: "encryption" as const,
  },
  {
    n: "03",
    title: "Enjoy your order",
    body:
      "Once you receive a confirmation or your funds back, simply pay our service fee. After that, all data related to you is permanently deleted.",
    tint: "emerald" as const,
    illust: "spark" as const,
  },
];

const WHY = [
  {
    h: "Five years deep",
    body: "Our advanced systems and insiders are always up-to-date, sorting individual data points to ensure maximum success on your order.",
    illust: "globe" as const,
    tint: "amber" as const,
  },
  {
    h: "End-to-end encrypted",
    body: "Isolated environments — your data never gets mixed with others, eliminating bans, fails or data leaks.",
    illust: "encryption" as const,
    tint: "violet" as const,
  },
  {
    h: "Stores nobody else has",
    body: "We act with urgency to begin working on your order almost immediately after submission.",
    illust: "store" as const,
    tint: "cyan" as const,
  },
];

export default function ServiceSection() {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const titleY  = useTransform(scrollYProgress, [0, 1], ["0%", "-50%"]);
  const titleOp = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.4, 0]);
  const sceneY  = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const sceneOp = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.5, 0]);

  return (
    <div id="service" className="relative isolate scroll-mt-16">
      {/* Act 1 — Animated CASHBACK hero (no static image, no orb planet) */}
      <section
        ref={heroRef}
        className="relative isolate min-h-[100svh] w-full overflow-hidden bg-ink-950"
        data-cursor="big"
      >
        {/* mesh orbs + gradient ambience */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="orb orb-1 absolute left-[10%] top-[15%] h-[60vh] w-[60vh] rounded-full" />
          <div className="orb orb-2 absolute right-[8%] top-[28%] h-[55vh] w-[55vh] rounded-full" />
          <div className="orb orb-3 absolute left-[40%] bottom-[10%] h-[50vh] w-[50vh] rounded-full" />
        </div>

        {/* CASHBACK 3D scene replaces the previous orb/planet — sits to
            the right on desktop, stacks behind text on mobile.          */}
        <motion.div
          aria-hidden="true"
          style={{ y: sceneY, opacity: sceneOp }}
          suppressHydrationWarning
          className="pointer-events-none absolute inset-y-0 right-[2%] z-0 hidden items-center md:flex"
        >
          <CashbackScene size={560} />
        </motion.div>
        {/* Mobile: smaller scene above the headline */}
        <div className="pointer-events-none absolute left-1/2 top-[6%] z-0 -translate-x-1/2 md:hidden">
          <CashbackScene size={300} />
        </div>

        {/* interactive particles */}
        <InteractiveParticles count={70} />

        {/* Headline — left-aligned on desktop so it sits beside the scene */}
        <motion.div
          style={{ y: titleY, opacity: titleOp }}
          suppressHydrationWarning
          className="container-wide pointer-events-none relative z-10 grid min-h-[100svh] place-items-center md:place-items-start md:pt-[12vh]"
        >
          <div className="text-center md:max-w-[58%] md:text-left">
            <div
              className="inline-block rounded-[2.5rem] border border-white/10 px-6 py-8 sm:px-12 sm:py-12"
              style={{
                background:
                  "linear-gradient(160deg, rgba(7,6,14,0.7), rgba(7,6,14,0.55) 35%, rgba(7,6,14,0.7))",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                boxShadow: "0 40px 120px -40px rgba(0,0,0,0.85)",
              }}
            >
              <KineticText
                as="h1"
                text="Get rewarded for shopping online."
                className="editorial-display max-w-[1500px] text-balance text-white text-[clamp(2.25rem,7vw,7rem)] uppercase"
                style={{ textShadow: "0 4px 40px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.85)" }}
                stagger={0.06}
                delay={0.1}
              />
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.2 }}
                suppressHydrationWarning
                className="mt-8 text-2xl font-light italic text-white sm:text-3xl"
                style={{ textShadow: "0 2px 16px rgba(0,0,0,0.85)" }}
              >
                Ahh… feel the joy of cashback.
              </motion.p>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Act 2 — Editorial sub-statement + 3D money-time scene */}
      <section className="relative py-32">
        <div className="container-wide relative grid items-center gap-12 sm:grid-cols-12">
          <div className="sm:col-span-7 sm:col-start-2">
            <p
              className="heading-display text-xs font-semibold uppercase tracking-[0.45em] text-amber-300"
              style={{ textShadow: "0 0 20px rgba(245,185,69,0.5)" }}
            >
              — chapter 02 / what
            </p>
            <KineticText
              as="h2"
              text="Stop wasting time and money."
              className="editorial-display mt-5 text-balance text-white text-[clamp(2rem,6vw,5rem)] uppercase"
              style={{ textShadow: "0 4px 30px rgba(0,0,0,0.85)" }}
            />
            <Reveal delay={0.2}>
              <p
                className="mt-8 max-w-2xl text-lg leading-relaxed text-white"
                style={{ textShadow: "0 1px 10px rgba(0,0,0,0.7)" }}
              >
                With our exclusive service, we provide a rewarding shopping
                experience — over <span className="text-amber-200 font-semibold">100+ participating stores</span> spanning
                clothes, electronics, food, home, furniture, even travel.
                Enjoy it all at a fraction of the price.
              </p>
            </Reveal>

            {/* Animated illustration below the text on mobile/tablet —
                the leaping shopper with credit card and phone fits the
                "stop wasting time and money" beat better than the abstract
                3D money-time render that previously lived here.        */}
            <div className="mt-10 grid place-items-center md:hidden">
              <WastingTimeIllustration size={280} />
            </div>
          </div>
          {/* Same illustration on desktop, larger. */}
          <div className="hidden sm:col-span-4 md:grid md:place-items-center">
            <Reveal delay={0.3}>
              <WastingTimeIllustration size={360} />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ────────── Acts 3 + 4 with PARALLAX (bg slower than fg) ────────── */}
      <ParallaxChapter
        bg={
          <div className="absolute inset-0 grid place-items-center">
            <div className="opacity-30 blur-[1px] sm:opacity-40">
              <ParallaxIllustration kind="store" accent="amber" size={680} />
            </div>
          </div>
        }
        bgClassName="absolute inset-0"
        intensity={0.35}
      >
        {/* Act 3 — How it works (glass timeline, FLOATING animated cards) */}
        <section className="relative py-24">
          <div className="container-wide relative">
            <Reveal>
              <p
                className="heading-display text-center text-xs font-semibold uppercase tracking-[0.5em] text-amber-300"
                style={{ textShadow: "0 0 20px rgba(245,185,69,0.5)" }}
              >
                — chapter 03 / how
              </p>
              <h2
                className="editorial-display mt-4 text-center text-white text-[clamp(2rem,6vw,5rem)] uppercase"
                style={{ textShadow: "0 4px 30px rgba(0,0,0,0.85)" }}
              >
                How it works
              </h2>
            </Reveal>
            <div className="mt-16 grid gap-6 md:grid-cols-3">
              {STEPS.map((s, i) => (
                <GlassCard
                  key={s.n}
                  tint={s.tint}
                  delay={i * 0.12}
                  className={`pulse-glow float-card ${i === 1 ? "float-card-2" : ""}`}
                >
                  <div className="relative overflow-hidden p-8 sm:p-10">
                    <div className="pointer-events-none absolute -right-8 -top-8 opacity-30">
                      <ParallaxIllustration kind={s.illust} accent={s.tint as any} size={180} />
                    </div>
                    <div className="relative">
                      <div className="heading-display text-aurora text-[7rem] font-bold leading-none tracking-tighter opacity-30">
                        {s.n}
                      </div>
                      <h3 className="heading-display -mt-12 text-2xl font-bold text-white">
                        Step {Number(s.n)}<br/>
                        <span className="text-amber-200">{s.title}</span>
                      </h3>
                      <p className="mt-5 text-base leading-relaxed text-white/85">
                        {s.body}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>

        {/* Act 4 — Why us with chapter illustrations (also floats) */}
        <section className="relative py-24">
          <div className="container-wide relative">
            <Reveal>
              <p
                className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-amber-300"
                style={{ textShadow: "0 0 20px rgba(245,185,69,0.5)" }}
              >
                — chapter 04 / why
              </p>
              <h2
                className="editorial-display mt-4 max-w-4xl text-balance text-white text-[clamp(2rem,6vw,5rem)] uppercase"
                style={{ textShadow: "0 4px 30px rgba(0,0,0,0.85)" }}
              >
                Why choose us?
              </h2>
            </Reveal>
            <div className="mt-14 grid gap-5 lg:grid-cols-3">
              {WHY.map((w, i) => (
                <GlassCard
                  key={w.h}
                  tint={w.tint}
                  delay={i * 0.1}
                  className={`pulse-glow float-card ${i % 2 === 1 ? "float-card-2" : ""}`}
                >
                  <div className="relative overflow-hidden p-8">
                    <div className="pointer-events-none absolute -right-6 -top-6 opacity-25">
                      <ParallaxIllustration kind={w.illust} accent={w.tint as any} size={150} />
                    </div>
                    <h3 className="relative heading-display text-xl font-bold uppercase tracking-tight text-white">{w.h}</h3>
                    <p className="relative mt-4 text-base leading-relaxed text-white/85">{w.body}</p>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        </section>
      </ParallaxChapter>

      {/* Act 5 — Awarded CTA banner with pulsating glow + parallax depth */}
      <ParallaxChapter
        intensity={0.4}
        className="pb-16 pt-12"
        bgClassName="absolute inset-0 grid place-items-center opacity-25"
        bg={<ParallaxIllustration kind="spark" accent="amber" size={580} />}
      >
        <section className="container-wide">
          <Reveal>
            <div className="pulse-glow relative overflow-hidden rounded-[2.5rem] border border-amber-400/25 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/15 p-10 text-center backdrop-blur-2xl sm:p-16">
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/60 to-transparent" />
              <p
                className="heading-display text-[10px] font-semibold uppercase tracking-[0.5em] text-amber-200 sm:text-xs"
                style={{ textShadow: "0 0 18px rgba(245,185,69,0.55)" }}
              >
                — awarded #1 service · @refundgod
              </p>
              <h2
                className="editorial-display mt-4 mx-auto max-w-4xl text-balance text-white text-3xl uppercase sm:text-5xl md:text-6xl"
                style={{ textShadow: "0 4px 30px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.85)", lineHeight: 1.02 }}
              >
                Innovative, fast and easy to use.
              </h2>
              <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/90">
                Choose wisely and let us handle your order with utmost care and
                quality. We are certain you will be returning back to us in no time.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
                <MagneticButton href="#region" variant="primary">
                  Browse the store list
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M12 5v14M19 12l-7 7-7-7" />
                  </svg>
                </MagneticButton>
                <MagneticButton
                  href="https://cryptpad.fr/form/#/2/form/view/8G2YtzZK21kTYT4Hib0yja1VVoh2Q+3dPhBMKQtH37w/"
                  external
                  variant="ghost"
                >
                  Submit your order
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="m12 5 7 7-7 7" /><path d="M5 12h14" />
                  </svg>
                </MagneticButton>
              </div>
            </div>
          </Reveal>
        </section>
      </ParallaxChapter>
    </div>
  );
}
