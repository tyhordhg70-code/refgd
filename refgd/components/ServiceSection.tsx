"use client";
import { motion, useReducedMotion } from "framer-motion";
import { Reveal } from "./Reveal";
import KineticText from "./KineticText";
import GlassCard from "./GlassCard";
import CinematicCard3D from "./CinematicCard3D";
import MagneticButton from "./MagneticButton";
import EditableMagneticButton from "./EditableMagneticButton";
import InteractiveParticles from "./InteractiveParticles";
import ParallaxIllustration from "./ParallaxIllustration";
import CashbackScene from "./CashbackScene";
import ParallaxChapter from "./ParallaxChapter";
import EditableText from "./EditableText";
import AnimatedDivider from "./AnimatedDivider";
import SecureLockCenterpiece from "./SecureLockCenterpiece";
/* v6.13.14 — Wasting-time figure migrated to <EditableImage> so admin
   can swap the picture, apply an animation template, scale it, and
   adjust the space below it from the in-page edit popover. */
import EditableImage from "./EditableImage";

/**
 * Animated illustration of the "leap toward a phone with a credit card"
 * — used in the "Stop wasting time and money" beat. Floats subtly so
 * the figure feels alive instead of static.
 */
function WastingTimeIllustration({ size }: { size: number }) {
  const reduce = useReducedMotion();
  /* v6.13.32 — User reported "Stop wasting time image should have
     entrance animation". The internal `wastingTimeCine` keyframe
     does run, but it fires at COMPONENT MOUNT (i.e. as soon as the
     image enters the React tree), which on the storelist page
     happens far above the fold. By the time the visitor scrolls
     down to the "Stop wasting time" beat, the entrance has long
     since completed and the figure is sitting in its final state
     — to the user this reads as "no entrance animation".

     Fix: wrap the entire illustration in a viewport-gated
     `motion.div`. It starts opacity:0 + translated up, and only
     animates IN once the visitor scrolls 25 % of the figure into
     view. The internal cine + 3D float + shimmer keyframes still
     run as before, but they are now visible because the outer
     wrapper is what was hiding them until scroll reveal. */
  /* v6.13.12 — User asked for a 3D animation on the image. Rebuilt:
       1. Cinematic entrance still runs (`wastingTimeCine`), then…
       2. After 1.6 s settle, THREE looping GPU-only ambient layers
          take over (defined in globals.css):
            • wt3DFloat   — perspective rotateY/X parallax sway
            • wtGlowPulse — colour-cycling halo BEHIND the figure
            • wtShimmer   — drop-shadow + brightness sweep (rim light)
       The previous flat `y: [0, -10, 0]` framer-motion bob is
       gone — the new motion reads as actual 3D presence rather
       than a simple vertical bounce. */
  return (
    <motion.div
      initial={reduce ? { opacity: 1 } : { opacity: 0, y: 60, scale: 0.94 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, amount: 0.25 }}
      transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
      style={{
        width: size,
        height: size,
        position: "relative",
        perspective: 1400,
        transformStyle: "preserve-3d",
      }}
    >
      {/* (2) Glow halo BEHIND the figure — colour-breath cycle */}
      {!reduce && (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: "120%",
            height: "120%",
            pointerEvents: "none",
            filter: "blur(28px)",
            mixBlendMode: "screen",
            zIndex: 0,
            animation: "wtGlowPulse 5s ease-in-out infinite",
            // animation-delay lets it ramp up after the cinematic
            // entrance lands instead of fighting the bloom in.
            animationDelay: "1.4s",
            willChange: "transform, opacity, background",
          }}
        />
      )}

      {/* (1) 3D float wrapper — owns the rotateY/X/translateZ parallax. */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          zIndex: 1,
          transformStyle: "preserve-3d",
          animation: reduce
            ? undefined
            : "wt3DFloat 7s ease-in-out infinite",
          animationDelay: "1.6s",
          willChange: "transform",
        }}
      >
        {/* Cinematic ENTRANCE keyframe runs once on this layer so it
            can compose with the float wrapper's transform without
            clobbering it. */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            animation: reduce
              ? undefined
              : "wastingTimeCine 1.5s cubic-bezier(0.16, 1, 0.3, 1) both",
          }}
        >
          {/* v6.13.14 — was a plain <img>; now <EditableImage> so admin
              can replace the file, pick an animation template, scale
              and add/remove space below it from the popover. The
              built-in ambient `wtShimmer` keyframe still applies via
              className so the image keeps its rim-light sweep even
              when no admin template is chosen; admins can override
              by picking a template (which composes on top via the
              wrapper). The wrapper fills the float box (inset:0). */}
          <EditableImage
            id="service.wastingTime"
            defaultSrc="/uploads/wasting-time-phone.png"
            alt="Shopper leaping toward a phone with a credit card — saving time and money."
            wrapperClassName="block"
            wrapperStyle={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
            }}
            className={
              "h-full w-full object-contain " +
              (reduce ? "" : "atpl-shimmer")
            }
          />
        </div>
      </div>
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

/**
 * ServiceSection slice prop:
 *   undefined  → renders all acts (default, used everywhere except store-list)
 *   "hero"     → renders only Act 1 (the "Get rewarded" full-screen hero)
 *   "rest"     → renders Acts 2-5 + Lock centerpiece
 *
 * The store-list page splits the section so the LedJoySection ("AHHHH …
 * feel the joy of cashback") can sit DIRECTLY between Act 1 and Act 2.
 */
export default function ServiceSection(
  { slice, noBg }: { slice?: "hero" | "rest"; noBg?: boolean } = {},
) {
  const showHero = !slice || slice === "hero";
  const showRest = !slice || slice === "rest";
  /* v6.13.36 — `noBg` opt-out so the storelist page can paint ONE
     continuous bg+orb mesh across the whole document instead of
     letting the hero's intrinsic `bg-ink-950 + orbs` block the
     page-level mesh from showing through. */
  const heroBg = noBg ? "" : "bg-ink-950";
  return (
    <div id="service" className="relative isolate scroll-mt-16">
      {showHero && (
      <>
      {/* ─── Act 1 — "Get rewarded for shopping online." hero ──────── */}
      <section
        /* v6.13.11 — REAL fix for the mobile illustration clipping.
           Previous attempts kept this section as `flex` (which
           defaults to flex-direction:row) and tried to fix the
           clipping by toggling items-center vs items-start and
           tweaking min-h. None of that worked because the actual
           bug was that the headline <motion.div> and the mobile
           CashbackScene <div> are SIBLINGS in a flex-row container
           — they were laying out side-by-side, with the cashback
           scene pushed beyond the viewport's right edge and then
           sliced off by `overflow-hidden`. Switching to flex-col
           on mobile (and only restoring flex-row on md:) makes
           them stack vertically: headline first, then the 260 px
           cashback scene fully visible below it. */
        /* v6.13.19 — Added `min-h-[100svh]` on mobile (was no min-h
           at all, just pt-8 pb-16). User reported "Get rewarded
           section is cut off" on store-list — root cause: the
           hero had no min-height on mobile, so when the page's
           scrollytelling positioned the section between the
           preceding intro and the LedJoySection (which IS 100svh),
           the hero's natural content height was sometimes shorter
           than viewport and the LED beat below it bled up over
           the cashback-scene illustration, making the hero look
           sliced. Forcing 100svh on mobile gives the headline +
           cashback scene their own dedicated screen, matching
           desktop's 92svh treatment. */
        className={`relative isolate flex w-full flex-col items-center justify-center overflow-hidden ${heroBg} min-h-[100svh] pt-8 pb-16 md:flex-row md:items-center md:py-0 md:min-h-[92svh]`}
        data-cursor="big"
        /* v6.13.34 — Anchor for SkipToStoreListButton's
           IntersectionObserver. The button fades in while this
           hero is on screen and fades out once the visitor scrolls
           past it. */
        data-skip-anchor="cashback"
      >
        {/* mesh orbs + gradient ambience — skipped when noBg is set
            (e.g. on the storelist page, which paints its OWN
            page-level orb mesh that runs the full document height). */}
        {!noBg && (
          <div aria-hidden="true" className="pointer-events-none absolute inset-0">
            <div className="orb orb-1 absolute left-[10%] top-[15%] h-[60vh] w-[60vh] rounded-full" />
            <div className="orb orb-2 absolute right-[8%] top-[28%] h-[55vh] w-[55vh] rounded-full" />
            <div className="orb orb-3 absolute left-[40%] bottom-[10%] h-[50vh] w-[50vh] rounded-full" />
          </div>
        )}

        {/* CASHBACK 3D scene — desktop only, decorative on the right.
            On mobile we drop it entirely so the headline always fits
            in a single viewport frame without being pushed off-screen. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 right-[2%] z-0 hidden items-center md:flex"
        >
          <CashbackScene size={520} />
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
          <div className="w-full max-w-3xl text-center md:max-w-[58%] md:text-left">
            <div
              className="inline-block rounded-[2rem] border border-white/15 px-4 py-5 sm:px-9 sm:py-7 sm:rounded-[2.5rem]"
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
                className="editorial-display max-w-[1500px] text-balance text-white text-[clamp(1.5rem,4.4vw,4.5rem)] uppercase"
                style={{ textShadow: "0 4px 40px rgba(0,0,0,0.95), 0 2px 8px rgba(0,0,0,0.85)", lineHeight: 1.05 }}
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
                  className="heading-display mt-3 text-[10px] font-semibold uppercase tracking-[0.45em] text-amber-300 sm:mt-5 sm:text-xs sm:tracking-[0.5em]"
                  style={{ textShadow: "0 0 22px rgba(245,185,69,0.55)" }}
                />
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* MOBILE-only cashback scene — desktop has the 520px scene
            absolutely positioned on the right; on mobile we drop a
            smaller version below the headline so the illustration is
            never invisible. User report: "for storelist illustration
            is missing on mobile". */}
        <div
          aria-hidden="true"
          className="container-wide pointer-events-none relative z-10 mt-6 grid w-full place-items-center md:hidden"
        >
          <CashbackScene size={260} />
        </div>
      </section>

      {/* Act 1.5 — "AHHHH … feel the joy of cashback" LED beat is
          mounted by the parent page IN BETWEEN the hero and Act 2 via
          slice="hero" / slice="rest". */}
      </>
      )}

      {showRest && (
      <>
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
              // v6.9 — was a plain GlassCard with default reveal.
              // Per user request the How-it-works boxcards now get
              // a fast cinematic 3D flip-in with a hard accent
              // edge-glow that flashes on entrance and settles to
              // a thin static rim. CinematicCard3D uses pure 3D
              // transforms (no SVG displacement) so it is sharp
              // and never reads as dizzy/blurry.
              <CinematicCard3D
                key={s.n}
                variant="flip"
                accent={s.tint as any}
                delay={i * 0.12}
                duration={720}
              >
              <GlassCard
                tint={s.tint}
                delay={0}
                index={i}
                reveal={false}
                className=""
              >
                <div className="relative overflow-hidden p-8 sm:p-10">
                  {/* v6.13.48 — Step illustrations were rendered with
                      `mixBlendMode: "screen"` which is supposed to make
                      black pixels transparent. Step 1's source webp
                      apparently has a slightly-off-black background
                      (not pure #000), so screen still composited a
                      visible dark blob over the top-right of the card
                      — the user reported this as "step1 box has some
                      black overlay on top of it". `lighten` is more
                      aggressive: it keeps each pixel's MAX(card, image)
                      per channel, so any pixel darker than the card
                      surface is fully suppressed regardless of how
                      close-to-pure-black it is. The amber/violet card
                      surfaces are darker than the illustration's
                      coloured strokes, so the visible art still reads
                      cleanly while the dark backdrop fully drops out.
                      Plus a slight contrast/brightness lift so the
                      remaining strokes pop. */}
                  <div className="pointer-events-none absolute -right-4 -top-4 h-[170px] w-[170px]">
                    {s.n === "01" && <img src="/images/step-place-order.webp" alt="" loading="eager" decoding="async" className="h-full w-full object-contain" style={{ mixBlendMode:"lighten", opacity:0.9, filter:"contrast(1.15) brightness(1.05)" }} />}
                    {s.n === "02" && <img src="/images/step-submit-order.webp" alt="" loading="eager" decoding="async" className="h-full w-full object-contain" style={{ mixBlendMode:"lighten", opacity:0.9, filter:"contrast(1.15) brightness(1.05)" }} />}
                    {s.n === "03" && <img src="/images/step-enjoy-order.webp" alt="" loading="eager" decoding="async" className="h-full w-full object-contain" style={{ mixBlendMode:"lighten", opacity:0.9, filter:"contrast(1.15) brightness(1.05)" }} />}
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
              </CinematicCard3D>
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
                index={i + 3}
                className=""
              >
                <div className="relative overflow-hidden p-8">
                  {/* Per-card decorative illustration */}
                  {i === 0 && (
                    <div className="pointer-events-none absolute inset-0">
                      <img
                        src="/images/five-years-deep.webp"
                        alt=""
                        className="absolute right-0 bottom-0 h-[90%] w-[90%] object-contain object-right-bottom opacity-35"
                        style={{ mixBlendMode: "screen" }}
                      />
                    </div>
                  )}
                  {i === 1 && (
                    <div className="pointer-events-none absolute inset-0">
                      <img
                        src="/uploads/secure-lock.png"
                        alt=""
                        className="absolute right-[-10%] bottom-[-10%] h-[85%] w-[85%] object-contain object-right-bottom opacity-30"
                        style={{ mixBlendMode: "screen" }}
                      />
                    </div>
                  )}
                  {i === 2 && (
                    <div className="pointer-events-none absolute inset-0">
                      <img
                        src="/images/stores-nobody-has.webp"
                        alt=""
                        className="absolute right-[-5%] bottom-[-5%] h-[90%] w-[90%] object-contain object-right-bottom opacity-35"
                        style={{ mixBlendMode: "screen" }}
                      />
                    </div>
                  )}
                  <div className="relative">
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
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

            {/* Lock centerpiece removed — illustration is now inside E2E encrypted card */}

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
            {/* v6.13.13 — User report "Innovative fast easy box card on
                storelist has hard glow". The previous `pulse-glow`
                class drives an infinite box-shadow keyframe that
                fires a high-amber bloom every 5 s — combined with
                the heavy ambient drop-shadow it gave the box a
                harsh, almost-too-bright halo on a dark phone
                screen. Removed `pulse-glow` and softened the
                ambient shadow to a tighter, lower-alpha drop so
                the card still has presence but no longer reads
                as a flashing/over-saturated rim. */}
            <div
              className="relative overflow-hidden rounded-[2.5rem] border border-amber-400/15 p-10 text-center sm:p-16"
              style={{
                background:
                  "linear-gradient(160deg, rgba(40,22,4,0.88) 0%, rgba(20,12,4,0.92) 100%)",
                backdropFilter: "blur(16px) saturate(140%)",
                WebkitBackdropFilter: "blur(16px) saturate(140%)",
                boxShadow:
                  "0 22px 60px -22px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.05)",
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
                {/* v6.13.48 — Browse-the-store-list CTA: now editable
                    (label + URL via admin popover) AND the right-side
                    icon swapped from a down-arrow to a shopping-cart
                    glyph per user request. */}
                <EditableMagneticButton
                  labelKey="service.cta.browse.label"
                  defaultLabel="Browse the store list"
                  urlKey="service.cta.browse.url"
                  defaultUrl="#region"
                  external={false}
                  variant="primary"
                  testId="service-cta-browse"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="9" cy="21" r="1.4" />
                      <circle cx="18" cy="21" r="1.4" />
                      <path d="M2.5 3h2l2.7 12.4a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21.5 7H6" />
                    </svg>
                  }
                />
                {/* v6.13.48 — Submit-your-order CTA: editable label + URL. */}
                <EditableMagneticButton
                  labelKey="service.cta.submit.label"
                  defaultLabel="Submit your order"
                  urlKey="service.cta.submit.url"
                  defaultUrl="https://cryptpad.fr/form/#/2/form/view/8G2YtzZK21kTYT4Hib0yja1VVoh2Q+3dPhBMKQtH37w/"
                  external
                  variant="ghost"
                  testId="service-cta-submit"
                  icon={
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <path d="m12 5 7 7-7 7" /><path d="M5 12h14" />
                    </svg>
                  }
                />
              </div>
            </div>
          </Reveal>
        </section>
      </ParallaxChapter>
      </>
      )}
    </div>
  );
}
