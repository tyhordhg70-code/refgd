"use client";
  import { motion, useReducedMotion } from "framer-motion";
  import EditableText from "@/components/EditableText";
  import EditableImage from "@/components/EditableImage";
  import MagneticButton from "@/components/MagneticButton";
  import ChapterPill from "@/components/ChapterPill";
  import KineticText from "@/components/KineticText";

  const PRICING = [
    {
      title: "Stealth / OpSEC + Rebill Bypass",
      body:  "Remain fully anonymous while surfing online, place orders under a forged identity, never face a rebill again — and much more.",
      url:   "https://refundgod.bgng.io/product/stealth-opsec-guide-rebill-bypass-guide",
      rgb:   "34,211,238",
      img:   "/uploads/stealth-opsec.png",
    },
    {
      title: "Evasion Book — Level 1",
      body:  "For those who want a serious long-term solution and to hit big ordering from multiple accounts at once before the store has a chance to detect and ban you. Stay under the radar, pass through account reviews and more. 45 pages with no filler content.",
      url:   "https://refundgod.bgng.io/product/evade1",
      rgb:   "245,185,69",
      img:   "/uploads/evasion-l1.webp",
    },
    {
      title: "Evasion Book — Level 2",
      body:  "For those just starting out with limited experience. Quick and easy solutions with free and paid alternatives. 10+ pages with lifetime support.",
      url:   "https://refundgod.bgng.io/product/evasion-book---level-2",
      rgb:   "167,139,250",
      img:   "/uploads/evasion-l2.png",
    },
  ];

  /**
   * EvadePricingShowcase — vertical 3-tier pricing, NOT horizontal.
   *
   * Per user's explicit ask: keep all three existing product images,
   * keep the vertical layout (md:grid-cols-3). What changes is the
   * PRESENTATION so each tier reads as a deliberate composition
   * instead of an image floating in a card:
   *
   *   • Oversized translucent tier numeral (01/02/03) anchors each
   *     tier visually so the eye has a structural reference.
   *   • Each tier wrapped in a layered editorial frame:
   *       – outer panel with accent gradient + ring
   *       – inner plinth that the product image rests ON, with a
   *         soft elliptical shadow below (image no longer floats
   *         in void)
   *   • Refined type hierarchy (eyebrow / title / body / CTA).
   *   • Magnetic CTA via existing EditableLinkButton → MagneticButton.
   *
   * ALL existing admin edit ids preserved:
   *   evade.pricing.0..2.img       (EditableImage)
   *   evade.pricing.0..2.title     (EditableText)
   *   evade.pricing.0..2.body      (EditableText)
   *   evade.pricing.0..2.url       (EditableLinkButton)
   *   evade.pricing.eyebrow        (ChapterPill — was evade.ch4.eyebrow,
   *                                 see note in features pinned)
   *   evade.pricing.title          (KineticText)
   *
   * NOTE on chapter ids — the page used to put both Features and
   * Pricing under evade.ch4.*; we now namespace them under
   * evade.ch4.* (Features) and evade.pricing.* (Pricing) so the two
   * headings don't share a single edit value. Defaults match the
   * page's previous content so first-paint reads the same.
   */
  export default function EvadePricingShowcase() {
    const reduced = useReducedMotion();
    return (
      <section className="relative z-10 py-24" id="Learn">
        <div className="container-wide relative">
          <div className="flex flex-col items-start gap-4">
            <ChapterPill
              editId="evade.ch4.eyebrow"
              defaultValue="Get started, today"
              accent="amber"
              size="md"
            />
            <KineticText
              as="h2"
              text="Our pricing — select your plan."
              editId="evade.ch4.title"
              className="editorial-display max-w-4xl text-balance uppercase text-white text-[clamp(2rem,5.6vw,4.4rem)]"
              style={{
                textShadow:
                  "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
                letterSpacing: "-0.025em",
              }}
            />
          </div>

          <div className="mt-12 grid gap-7 md:grid-cols-3">
            {PRICING.map((p, i) => (
              <motion.div
                key={i}
                initial={reduced ? { opacity: 1 } : { opacity: 1, x: i === 0 ? -40 : i === 2 ? 40 : 0, y: i === 1 ? 28 : 0 }}
                whileInView={reduced ? undefined : { opacity: 1, x: 0, y: 0 }}
                viewport={{ once: true, amount: 0.2, margin: "0px 0px -10% 0px" }}
                transition={{ duration: 0.9, delay: i * 0.15, ease: [0.22, 1, 0.36, 1] }}
                className="group relative"
              >
                {/* Outer editorial frame — layered panel + ring */}
                <div
                  className="relative h-full overflow-hidden rounded-[2rem] border border-white/15"
                  style={{
                    background: `linear-gradient(165deg, rgba(${p.rgb},0.22), rgba(10,8,22,0.93) 60%)`,
                    boxShadow: `0 50px 120px -25px rgba(0,0,0,0.9), 0 0 90px -25px rgba(${p.rgb},0.55), inset 0 1px 0 rgba(255,255,255,0.08)`,
                    backdropFilter: "blur(14px)",
                    WebkitBackdropFilter: "blur(14px)",
                  }}
                >
                  {/* Top inner highlight */}
                  <span
                    aria-hidden
                    className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent"
                  />

                  {/* Oversized backdrop tier numeral */}
                  <span
                    aria-hidden
                    className="editorial-display pointer-events-none absolute right-4 top-2 select-none font-black leading-none"
                    style={{
                      fontSize: "clamp(5rem, 10vw, 8.5rem)",
                      color: `rgba(${p.rgb},0.16)`,
                      textShadow: `0 0 40px rgba(${p.rgb},0.35)`,
                      letterSpacing: "-0.05em",
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  <div className="relative flex h-full flex-col p-8">
                    {/* Image plinth — image sits ON a darker rounded
                        plinth with an elliptical shadow underneath,
                        so it reads as resting on a surface instead of
                        floating in void. */}
                    <div
                      className="relative mx-auto mb-6 flex h-48 w-full items-end justify-center"
                    >
                      {/* Plinth */}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-6 bottom-0 h-10 rounded-[100%]"
                        style={{
                          background: `radial-gradient(ellipse 60% 100% at 50% 0%, rgba(${p.rgb},0.55), transparent 70%)`,
                          filter: "blur(14px)",
                        }}
                      />
                      {/* Plinth surface */}
                      <div
                        aria-hidden
                        className="pointer-events-none absolute inset-x-8 bottom-1 h-1 rounded-full"
                        style={{
                          background: `linear-gradient(90deg, transparent, rgba(${p.rgb},0.55), transparent)`,
                        }}
                      />
                      <EditableImage
                        id={`evade.pricing.${i}.img`}
                        defaultSrc={p.img}
                        alt={p.title}
                        wrapperClassName="relative z-10 block h-full"
                        wrapperStyle={{ animationDelay: `${i * 0.6}s` }}
                        className="pricing-img-bob relative h-full w-auto max-w-full object-contain drop-shadow-[0_22px_44px_rgba(0,0,0,0.65)]"
                      />
                    </div>

                    {/* Eyebrow tier label */}
                    <div
                      className="mb-2 text-[11px] font-bold uppercase tracking-[0.32em]"
                      style={{ color: `rgba(${p.rgb},0.95)` }}
                    >
                      Tier · 0{i + 1}
                    </div>

                    <EditableText
                      id={`evade.pricing.${i}.title`}
                      defaultValue={p.title}
                      as="h3"
                      className="relative heading-display text-2xl font-bold uppercase tracking-tight text-white"
                      style={{ textShadow: "0 2px 14px rgba(0,0,0,0.8)", lineHeight: 1.2 }}
                    />

                    {/* Hair-rule under title */}
                    <span
                      aria-hidden
                      className="mt-3 block h-px w-12"
                      style={{
                        background: `linear-gradient(90deg, rgba(${p.rgb},0.95), transparent)`,
                      }}
                    />

                    <EditableText
                      id={`evade.pricing.${i}.body`}
                      defaultValue={p.body}
                      as="p"
                      multiline
                      className="relative mt-4 flex-1 text-base leading-relaxed text-white/95"
                    />

                    <div className="relative mt-7">
                      <MagneticButton href={p.url} external variant="primary" className="w-full">
                          Shop Methods
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <path d="m12 5 7 7-7 7" /><path d="M5 12h14" />
                          </svg>
                        </MagneticButton>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    );
  }
  