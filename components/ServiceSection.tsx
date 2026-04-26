"use client";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import { Reveal } from "./Reveal";
import KineticText from "./KineticText";
import GlassCard from "./GlassCard";
import MagneticButton from "./MagneticButton";
import HeroBackground from "./HeroBackground";

/**
 * Multi-act "Our Service" intro section, embedded at the top of /store-list.
 * Act 1: full-bleed hero with cinematic image + edge-to-edge headline.
 * Act 2: editorial subheading + supporting copy.
 * Act 3: 3-step glass timeline.
 * Act 4: "Why us" three-up.
 * Act 5: Awarded glass CTA banner.
 */

const STEPS = [
  {
    n: "01",
    title: "Place your order",
    body:
      "Choose a participating store from our list and follow any instructions to place your order. Questions? We're available on Telegram around the clock.",
    tint: "amber" as const,
  },
  {
    n: "02",
    title: "Submit your order",
    body:
      "Once your order is in, fill our service form so we can work our magic. Stores have different timeframes — every form is end-to-end encrypted to protect your privacy.",
    tint: "violet" as const,
  },
  {
    n: "03",
    title: "Enjoy your order",
    body:
      "Once you receive a confirmation or your funds back, simply pay our service fee. After that, all data related to you is permanently deleted.",
    tint: "emerald" as const,
  },
];

const WHY = [
  {
    h: "Five years deep",
    body: "Our advanced systems and insiders are always up-to-date, sorting individual data points to ensure maximum success on your order.",
  },
  {
    h: "End-to-end encrypted",
    body: "Isolated environments — your data never gets mixed with others, eliminating bans, fails or data leaks.",
  },
  {
    h: "Stores nobody else has",
    body: "We act with urgency to begin working on your order almost immediately after submission.",
  },
];

export default function ServiceSection() {
  const heroRef = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const imgScale = useTransform(scrollYProgress, [0, 1], [1.05, 1.18]);
  const titleY = useTransform(scrollYProgress, [0, 1], ["0%", "-50%"]);
  const titleOp = useTransform(scrollYProgress, [0, 0.7, 1], [1, 0.4, 0]);

  return (
    <div id="service" className="relative isolate scroll-mt-16">
      {/* Act 1 — Full-bleed cinematic hero (no crop, no low-res) */}
      <section
        ref={heroRef}
        className="relative isolate min-h-[100svh] w-full overflow-hidden"
        data-cursor="big"
      >
        <motion.div
          aria-hidden="true"
          style={{ y: imgY, scale: imgScale }}
          className="absolute inset-0"
        >
          <Image
            src="/images/path-store-list.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
          {/* Atmospheric overlay so the image never feels cut off — gradient
              blend into background everywhere */}
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at 50% 40%, transparent 25%, rgba(5,6,10,0.6) 70%, rgba(5,6,10,0.98) 100%), linear-gradient(180deg, rgba(5,6,10,0.55) 0%, transparent 25%, transparent 60%, rgba(5,6,10,0.98) 100%)",
            }}
          />
        </motion.div>

        {/* Glow blobs */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute left-[15%] top-[20%] h-[55vh] w-[55vh] animate-pulseGlow rounded-full bg-amber-400/22 blur-[140px]" />
          <div className="absolute right-[10%] top-[35%] h-[45vh] w-[45vh] animate-pulseGlow rounded-full bg-fuchsia-500/20 blur-[140px]" style={{ animationDelay: "1.6s" }} />
        </div>

        {/* Headline */}
        <motion.div
          style={{ y: titleY, opacity: titleOp }}
          className="container-wide relative z-10 grid min-h-[100svh] place-items-center"
        >
          <div className="text-center">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-amber-200/95 sm:text-sm"
            >
              — our service
            </motion.p>
            <KineticText
              as="h1"
              text="Get rewarded for shopping online."
              className="editorial-display mx-auto mt-6 max-w-[1500px] text-balance bg-gradient-to-b from-white via-white to-amber-200 bg-clip-text text-transparent text-[clamp(2.5rem,9vw,10rem)] uppercase drop-shadow-[0_8px_60px_rgba(0,0,0,0.6)]"
              stagger={0.06}
              delay={0.15}
            />
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 1.4 }}
              className="mt-8 text-2xl font-light italic text-white/85 sm:text-3xl"
            >
              Ahh… feel the joy of cashback.
            </motion.p>
          </div>
        </motion.div>
      </section>

      {/* Act 2 — Editorial sub-statement */}
      <section className="relative py-32">
        <HeroBackground />
        <div className="container-wide relative grid items-end gap-12 sm:grid-cols-12">
          <div className="sm:col-span-7 sm:col-start-2">
            <p className="heading-display text-xs font-semibold uppercase tracking-[0.45em] text-amber-300/80">
              — chapter 02 / what
            </p>
            <KineticText
              as="h2"
              text="Stop wasting time and money."
              className="editorial-display mt-5 text-balance bg-gradient-to-b from-white via-white to-white/40 bg-clip-text text-transparent text-[clamp(2rem,6vw,5rem)] uppercase"
            />
          </div>
          <div className="sm:col-span-4">
            <Reveal delay={0.2}>
              <p className="text-lg leading-relaxed text-white/70">
                With our exclusive service, we provide a rewarding shopping
                experience — over <span className="text-amber-200 font-semibold">100+ participating stores</span> spanning
                clothes, electronics, food, home, furniture, even travel.
                Enjoy it all at a fraction of the price.
              </p>
            </Reveal>
          </div>
        </div>
      </section>

      {/* Act 3 — How it works (glass timeline) */}
      <section className="relative py-24">
        <HeroBackground />
        <div className="container-wide relative">
          <Reveal>
            <p className="heading-display text-center text-xs font-semibold uppercase tracking-[0.5em] text-amber-300/80">
              — chapter 03 / how
            </p>
            <h2 className="editorial-display mt-4 text-center bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent text-[clamp(2rem,6vw,5rem)] uppercase">
              How it works
            </h2>
          </Reveal>
          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <GlassCard key={s.n} tint={s.tint} delay={i * 0.12}>
                <div className="relative p-8 sm:p-10">
                  <div className="heading-display text-aurora text-[7rem] font-bold leading-none tracking-tighter opacity-30">
                    {s.n}
                  </div>
                  <h3 className="heading-display -mt-12 text-2xl font-bold text-white">
                    Step {Number(s.n)}<br/>
                    <span className="text-amber-200">{s.title}</span>
                  </h3>
                  <p className="mt-5 text-base leading-relaxed text-white/75">
                    {s.body}
                  </p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Act 4 — Why us */}
      <section className="relative py-24">
        <HeroBackground />
        <div className="container-wide relative">
          <Reveal>
            <p className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-amber-300/80">
              — chapter 04 / why
            </p>
            <h2 className="editorial-display mt-4 max-w-4xl text-balance bg-gradient-to-b from-white to-white/40 bg-clip-text text-transparent text-[clamp(2rem,6vw,5rem)] uppercase">
              Why choose us?
            </h2>
          </Reveal>
          <div className="mt-14 grid gap-5 lg:grid-cols-3">
            {WHY.map((w, i) => (
              <GlassCard key={w.h} tint={["amber","violet","cyan"][i] as any} delay={i * 0.1}>
                <div className="p-8">
                  <h3 className="heading-display text-xl font-bold uppercase tracking-tight text-white">{w.h}</h3>
                  <p className="mt-4 text-base leading-relaxed text-white/75">{w.body}</p>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* Act 5 — Awarded CTA banner */}
      <section className="container-wide pb-16 pt-12">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] border border-amber-400/25 bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-500/15 p-10 text-center backdrop-blur-2xl sm:p-16">
            <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/60 to-transparent" />
            <p className="heading-display text-[10px] font-semibold uppercase tracking-[0.5em] text-amber-200/80 sm:text-xs">
              — awarded #1 service · @refundgod
            </p>
            <h2 className="editorial-display mt-4 mx-auto max-w-4xl text-balance bg-gradient-to-b from-white to-amber-100 bg-clip-text text-transparent text-3xl uppercase sm:text-5xl md:text-6xl">
              Innovative, fast and easy to use.
            </h2>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white/80">
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
    </div>
  );
}
