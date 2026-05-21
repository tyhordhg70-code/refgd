"use client";
  import { motion, useReducedMotion } from "framer-motion";
  import EditableText from "@/components/EditableText";
  import EditableImage from "@/components/EditableImage";

  /**
   * EvadeTrustSplit v2 — user feedback redesign:
   *  • No more split-screen. The whole chapter is now ONE unified
   *    glowing editorial box card — the trust-reviews image sits
   *    INSIDE the same box as the header and stories so nothing
   *    floats outside the frame.
   *  • Header "Who we are" → "Why trust us" (new default copy via
   *    the evade.trust.0.title id). All other edit ids preserved.
   *  • The dark vignette overlay over the panel is GONE.
   *  • The three trust stories use UNIQUE inline card designs
   *    (each different from the boxcards used elsewhere on the
   *    page): a numbered marker chip + corner glyph + accent rule
   *    along the top edge. Each one fades in from a different
   *    direction.
   */

  const TRUST = [
    { id: 0, title: "Why trust us", body: "We are an experienced team of cyber security developers, who initially established our presence on the dark web. During the summer of 2019 we had been solely relying on selling on Amazon, when a significant setback was encountered. Despite all attempts to address the issue with Amazon, only generic responses from OFM were received indicating policy non-compliance, leading to the suspension of not only my account but also those of close friends and family members.", rgb: "34,211,238", fromX: -40, glyph: "◆" },
    { id: 1, title: "The setback",  body: "This turn of events was deeply distressing, as Amazon constituted a substantial portion of our business at the time. Undeterred, we persevered through numerous trials and errors, eventually discovering a secure and effective method to regain access to Amazon and PayPal, enabling us to resume selling. Motivated by this experience, we decided to share the hard-earned knowledge with others — resulting in the creation of the highly sought-after guide, which became the go-to resource for navigating other stores' suspension protocols.", rgb: "167,139,250", fromX:  40, glyph: "▲" },
    { id: 2, title: "The aftermath", body: "For the following six months — after getting our seller account up and running — we dedicated extensive time and effort to developing effective strategies for safely and easily creating multiple Amazon accounts without the risk of being linked and blocked, which soon led to research of other stores and how their algorithms work as well.", rgb: "245,185,69", fromX: -40, glyph: "●" },
  ];

  export default function EvadeTrustSplit() {
    const reduced = useReducedMotion();

    return (
      <section className="relative z-10 py-20">
        <div className="container-wide relative">
          {/* UNIFIED glowing editorial box — contains header + image + 3 cards */}
          <motion.div
            initial={reduced ? { opacity: 1 } : { opacity: 0, y: 40 }}
            whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.05 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
            className="relative overflow-hidden rounded-[2rem] border border-amber-400/30 p-6 sm:p-10 lg:p-14"
            style={{
              background:
                "linear-gradient(165deg, rgba(245,185,69,0.14), rgba(167,139,250,0.10) 45%, rgba(10,8,22,0.95))",
              boxShadow:
                "0 70px 160px -30px rgba(0,0,0,0.92), 0 0 120px -25px rgba(245,185,69,0.45), inset 0 1px 0 rgba(255,255,255,0.09)",
              backdropFilter: "blur(10px)",
              WebkitBackdropFilter: "blur(10px)",
            }}
          >
            {/* Soft corner glow accents */}
            <span aria-hidden className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full"
              style={{ background: "radial-gradient(circle at 50% 50%, rgba(245,185,69,0.35), transparent 70%)", filter: "blur(20px)" }} />
            <span aria-hidden className="pointer-events-none absolute -right-20 -bottom-20 h-72 w-72 rounded-full"
              style={{ background: "radial-gradient(circle at 50% 50%, rgba(167,139,250,0.30), transparent 70%)", filter: "blur(20px)" }} />

            {/* Header row — chapter chip + title + trust-reviews image inline */}
            <div className="relative grid items-center gap-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:gap-12">
              <div>
                <EditableText
                  id="evade.ch3.eyebrow"
                  defaultValue="chapter 03 / reputation"
                  as="div"
                  className="inline-flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.32em] text-amber-200"
                />
                <EditableText
                  id="evade.ch3.title"
                  defaultValue="Why trust us."
                  as="h2"
                  className="editorial-display mt-5 max-w-xl text-balance uppercase text-white text-[clamp(2rem,5vw,3.6rem)]"
                  style={{
                    textShadow: "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
                    letterSpacing: "-0.025em",
                    lineHeight: 1.04,
                  }}
                />
              </div>
              {/* Trust-reviews image — inline inside the unified box, same edit id */}
              <div className="relative w-full max-w-[280px] justify-self-center lg:max-w-[320px] lg:justify-self-end">
                <EditableImage
                  id="evade.divider.trustReviews"
                  defaultSrc="/uploads/trust-reviews.webp"
                  alt="Star reviews — clients trust RefundGod."
                  wrapperClassName="relative block w-full"
                  className="h-auto w-full object-contain drop-shadow-[0_20px_40px_rgba(0,0,0,0.65)]"
                />
              </div>
            </div>

            {/* 3 unique trust cards — different styling from the rest of the page */}
            <div className="relative mt-10 grid gap-5 lg:grid-cols-3 lg:gap-6">
              {TRUST.map((t, i) => (
                <motion.div
                  key={t.id}
                  initial={reduced ? { opacity: 1 } : { opacity: 0, x: t.fromX, y: 20 }}
                  whileInView={reduced ? undefined : { opacity: 1, x: 0, y: 0 }}
                  viewport={{ once: true, amount: 0.1 }}
                  transition={{ duration: 0.8, delay: 0.15 + i * 0.14, ease: [0.22, 1, 0.36, 1] }}
                  className="relative"
                >
                  {/* Unique card — slim slab with top accent rule + corner glyph */}
                  <div
                    className="relative h-full rounded-2xl p-6 pt-7"
                    style={{
                      background: `linear-gradient(180deg, rgba(${t.rgb},0.10), rgba(10,8,22,0.55))`,
                      border: `1px solid rgba(${t.rgb},0.35)`,
                      boxShadow: `0 24px 60px -20px rgba(0,0,0,0.7), 0 0 40px -20px rgba(${t.rgb},0.45)`,
                    }}
                  >
                    {/* Top accent rule */}
                    <span aria-hidden className="absolute inset-x-0 top-0 h-[3px] rounded-t-2xl"
                      style={{ background: `linear-gradient(90deg, rgba(${t.rgb},0.0), rgba(${t.rgb},0.95) 50%, rgba(${t.rgb},0.0))` }} />

                    {/* Numbered chip */}
                    <div className="mb-3 flex items-center gap-3">
                      <span
                        className="grid h-9 w-9 place-items-center rounded-full text-xs font-black"
                        style={{
                          background: `rgba(${t.rgb},0.18)`,
                          border: `1px solid rgba(${t.rgb},0.6)`,
                          color: `rgba(${t.rgb},1)`,
                          boxShadow: `0 0 18px rgba(${t.rgb},0.45)`,
                        }}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span aria-hidden className="text-xl" style={{ color: `rgba(${t.rgb},0.85)`, textShadow: `0 0 14px rgba(${t.rgb},0.6)` }}>{t.glyph}</span>
                    </div>

                    <EditableText
                      id={`evade.trust.${i}.title`}
                      defaultValue={t.title}
                      as="h3"
                      className="editorial-display text-xl font-black uppercase text-white sm:text-2xl"
                      style={{ textShadow: "0 2px 14px rgba(0,0,0,0.8)", letterSpacing: "-0.02em", lineHeight: 1.1 }}
                    />
                    <EditableText
                      id={`evade.trust.${i}.body`}
                      defaultValue={t.body}
                      as="p"
                      multiline
                      className="mt-3 text-sm leading-relaxed text-white/90 sm:text-base"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>
    );
  }
  