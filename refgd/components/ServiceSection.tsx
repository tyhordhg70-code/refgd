"use client";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "./Reveal";
import KineticText from "./KineticText";
import GlassCard from "./GlassCard";
import MagneticButton from "./MagneticButton";
import InteractiveParticles from "./InteractiveParticles";
import ParallaxIllustration from "./ParallaxIllustration";
import CashbackScene from "./CashbackScene";
import ParallaxChapter from "./ParallaxChapter";
import EditableText from "./EditableText";
import AnimatedDivider from "./AnimatedDivider";
import SecureLockCenterpiece from "./SecureLockCenterpiece";

/**
 * Animated illustration of the "leap toward a phone with a credit card"
 * — used in the "Stop wasting time and money" beat. Floats subtly so
 * the figure feels alive instead of static.
 */
function WastingTimeIllustration({ size }: { size: number }) {
  const reduce = useReducedMotion();
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
        animate={reduce ? undefined : { y: [0, -10, 0] }}
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
  return (
    <div id="service" className="relative isolate scroll-mt-16">
      {/* ─── Act 1 — "Get rewarded for shopping online." hero ──────── */}
      <section
        className="relative isolate flex min-h-[100svh] w-full items-center overflow-hidden bg-ink-950"
        data-cursor="big"
      >
        {/* mesh orbs + gradient ambience */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="orb orb-1 absolute left-[10%] top-[15%] h-[60vh] w-[60vh] rounded-full" />
          <div className="orb orb-2 absolute right-[8%] top-[28%] h-[55vh] w-[55vh] rounded-full" />
          <div className="orb orb-3 absolute left-[40%] bottom-[10%] h-[50vh] w-[50vh] rounded-full" />
        </div>

        {/* CASHBACK 3D scene — to the right on desktop, above headline on mobile */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-[2%] z-0 hidden items-center md:flex"
        >
          <CashbackScene size={520} />
        </div>
        <div className="pointer-events-none absolute left-1/2 top-[4%] z-0 -translate-x-1/2 md:hidden">
          <CashbackScene size={260} />
        </div>

        {/* interactive particles */}
        <InteractiveParticles count={70} />

        {/* Headline — centered on mobile, left on desktop. Whole card
            fades + drifts in on first paint so the beat has a clear
            entrance moment instead of just appearing in place. */}
        <motion.div
          initial={{ opacity: 0, y: 36, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.95, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
          className="container-wide pointer-events-none relative z-10 grid w-full place-items-center md:place-items-start"
          suppressHydrationWarning
        >
          <div className="w-full max-w-3xl text-center md:max-w-[60%] md:text-left">
            <div
              className="inline-block rounded-[2.5rem] border border-white/15 px-6 py-8 sm:px-12 sm:py-12"
              style={{
                background:
                  "linear-gradient(160deg, rgba(7,6,14,0.78), rgba(7,6,14,0.62) 35%, rgba(7,6,14,0.78))",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                boxShadow: "0 40px 120px -40px rgba(0,0,0,0.85)",
              }}
            >
              <KineticText
                as="h1"
                editId="service.hero.title"
                text="Get rewarded for shopping online."
                className="editorial-display max-w-[1500px] text-balance text-white text-[clamp(2.25rem,7vw,7rem)] uppercase"
                style={{ textShadow: "0 4px 40px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.85)" }}
                stagger={0.06}
                delay={0.35}
              />
              <motion.div
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, delay: 1.2 }}
                suppressHydrationWarning
              >
                <EditableText
                  id="service.hero.eyebrow"
                  defaultValue="— scroll to begin"
                  as="p"
                  className="heading-display mt-8 text-xs font-semibold uppercase tracking-[0.5em] text-amber-300"
                  style={{ textShadow: "0 0 22px rgba(245,185,69,0.55)" }}
                />
              </motion.div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* Act 1.5 — "AHHHH … feel the joy of cashback" LED beat is mounted
          by the parent page (store-list/page.tsx) immediately after this
          section so it can be reordered independently in the admin UI. */}

      {/* Act 2 — Editorial sub-statement + 3D money-time scene */}
      <section className="relative py-32">
        <div className="container-wide relative grid items-center gap-12 sm:grid-cols-12">
          <div className="sm:col-span-7 sm:col-start-2">
            <EditableText
              id="service.what.eyebrow"
              defaultValue="— chapter 02 / what"
              as="p"
              className="heading-display text-xs font-semibold uppercase tracking-[0.45em] text-amber-300"
              style={{ textShadow: "0 0 20px rgba(245,185,69,0.5)" }}
            />
            <KineticText
              as="h2"
              editId="service.what.title"
              text="Stop wasting time and money."
              className="editorial-display mt-5 text-balance text-white text-[clamp(2rem,6vw,5rem)] uppercase"
              style={{ textShadow: "0 4px 30px rgba(0,0,0,0.85)" }}
            />
            <Reveal delay={0.2}>
              <EditableText
                id="service.what.body"
                defaultValue="With our exclusive service, we provide a rewarding shopping experience — over 100+ participating stores spanning clothes, electronics, food, home, furniture, even travel. Enjoy it all at a fraction of the price."
                as="p"
                multiline
                className="mt-8 max-w-2xl text-lg leading-relaxed text-white"
                style={{ textShadow: "0 1px 10px rgba(0,0,0,0.7)" }}
              />
            </Reveal>

            {/* Mobile-only illustration below text */}
            <div className="mt-10 grid place-items-center md:hidden">
              <WastingTimeIllustration size={280} />
            </div>
          </div>
          {/* Desktop illustration */}
          <div className="hidden sm:col-span-4 md:grid md:place-items-center">
            <Reveal delay={0.3}>
              <WastingTimeIllustration size={360} />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ────────── Act 3 — How it works ────────── */}
      <section className="relative py-24">
        <div className="container-wide relative">
          <Reveal>
            <EditableText
              id="service.how.eyebrow"
              defaultValue="— chapter 03 / how"
              as="p"
              className="heading-display text-center text-xs font-semibold uppercase tracking-[0.5em] text-amber-300"
              style={{ textShadow: "0 0 20px rgba(245,185,69,0.5)" }}
            />
            <KineticText
              as="h2"
              editId="service.how.title"
              text="How it works"
              className="editorial-display mt-4 text-center text-white text-[clamp(2rem,6vw,5rem)] uppercase"
              style={{ textShadow: "0 4px 30px rgba(0,0,0,0.85)" }}
            />
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
                      Step {Number(s.n)}<br />
                      <EditableText
                        id={`service.step.${s.n}.title`}
                        defaultValue={s.title}
                        as="span"
                        className="text-amber-200"
                      />
                    </h3>
                    <EditableText
                      id={`service.step.${s.n}.body`}
                      defaultValue={s.body}
                      as="p"
                      multiline
                      className="mt-5 text-base leading-relaxed text-white/95"
                    />
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ────── Animated divider between How-it-works and Why-choose-us ────── */}
      <AnimatedDivider />

      {/* ────────── Act 4 — Why choose us ────────── */}
      <section className="relative py-24">
        <div className="container-wide relative">
          <Reveal>
            <EditableText
              id="service.why.eyebrow"
              defaultValue="— chapter 04 / why"
              as="p"
              className="heading-display text-xs font-semibold uppercase tracking-[0.5em] text-amber-300"
              style={{ textShadow: "0 0 20px rgba(245,185,69,0.5)" }}
            />
            <KineticText
              as="h2"
              editId="service.why.title"
              text="Why choose us?"
              className="editorial-display mt-4 max-w-4xl text-balance text-white text-[clamp(2rem,6vw,5rem)] uppercase"
              style={{ textShadow: "0 4px 30px rgba(0,0,0,0.85)" }}
            />
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
                  <EditableText
                    id={`service.why.${i}.h`}
                    defaultValue={w.h}
                    as="h3"
                    className="relative heading-display text-xl font-bold uppercase tracking-tight text-white"
                  />
                  <EditableText
                    id={`service.why.${i}.body`}
                    defaultValue={w.body}
                    as="p"
                    multiline
                    className="relative mt-4 text-base leading-relaxed text-white/95"
                  />
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ────────── Lock + Shield centerpiece (after "Why choose us") ────────── */}
      <section className="relative py-20">
        <div className="container-wide grid place-items-center">
          <Reveal>
            <SecureLockCenterpiece size={360} />
          </Reveal>
          <Reveal delay={0.2}>
            <EditableText
              id="service.lock.caption"
              defaultValue="— end-to-end encrypted · isolated · zero-knowledge"
              as="p"
              className="heading-display mt-8 text-center text-xs font-semibold uppercase tracking-[0.5em] text-violet-200"
              style={{ textShadow: "0 0 22px rgba(167,139,250,0.55)" }}
            />
          </Reveal>
        </div>
      </section>

      {/* ────────── Act 5 — Awarded CTA banner ────────── */}
      {/* Reduced spark backdrop opacity (was 0.25 → 0.10) and bumped the
          card surface so the body copy is readable against it. */}
      <ParallaxChapter
        intensity={0.4}
        className="pb-16 pt-12"
        bgClassName="absolute inset-0 grid place-items-center opacity-10"
        bg={<ParallaxIllustration kind="spark" accent="amber" size={580} />}
      >
        <section className="container-wide">
          <Reveal>
            <div
              className="pulse-glow relative overflow-hidden rounded-[2.5rem] border border-amber-400/40 p-10 text-center sm:p-16"
              style={{
                background:
                  "linear-gradient(160deg, rgba(40,22,4,0.88) 0%, rgba(20,12,4,0.92) 100%)",
                backdropFilter: "blur(16px) saturate(140%)",
                WebkitBackdropFilter: "blur(16px) saturate(140%)",
                boxShadow:
                  "0 50px 140px -30px rgba(0,0,0,0.95), inset 0 1px 0 rgba(255,255,255,0.06)",
              }}
            >
              <span aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-200/80 to-transparent" />
              <EditableText
                id="service.awarded.eyebrow"
                defaultValue="— awarded #1 service · @refundgod"
                as="p"
                className="heading-display text-[10px] font-semibold uppercase tracking-[0.5em] text-amber-200 sm:text-xs"
                style={{ textShadow: "0 0 18px rgba(245,185,69,0.55)" }}
              />
              <KineticText
                as="h2"
                editId="service.awarded.title"
                text="Innovative, fast and easy to use."
                className="editorial-display mt-4 mx-auto max-w-4xl text-balance text-white text-3xl uppercase sm:text-5xl md:text-6xl"
                style={{ textShadow: "0 4px 30px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.85)", lineHeight: 1.02 }}
              />
              <EditableText
                id="service.awarded.body"
                defaultValue="Choose wisely and let us handle your order with utmost care and quality. We are certain you will be returning back to us in no time."
                as="p"
                multiline
                className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-white"
                style={{ textShadow: "0 1px 10px rgba(0,0,0,0.7)" }}
              />
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
