"use client";
  import { motion, useReducedMotion } from "framer-motion";
  import { useEffect, useRef, useState } from "react";
  import EditableText from "@/components/EditableText";
  import EditableImage from "@/components/EditableImage";
  import ChapterPill from "@/components/ChapterPill";
  import KineticText from "@/components/KineticText";
  import { useEditContext } from "@/lib/edit-context";

  const TRUST = [
    { id: 0, title: "Who we are",   body: "We are an experienced team of cyber security developers, who initially established our presence on the dark web. During the summer of 2019 we had been solely relying on selling on Amazon, when a significant setback was encountered. Despite all attempts to address the issue with Amazon, only generic responses from OFM were received indicating policy non-compliance, leading to the suspension of not only my account but also those of close friends and family members.", rgb: "34,211,238" },
    { id: 1, title: "The setback",  body: "This turn of events was deeply distressing, as Amazon constituted a substantial portion of our business at the time. Undeterred, we persevered through numerous trials and errors, eventually discovering a secure and effective method to regain access to Amazon and PayPal, enabling us to resume selling. Motivated by this experience, we decided to share the hard-earned knowledge with others — resulting in the creation of the highly sought-after guide, which became the go-to resource for navigating other stores' suspension protocols.",                                                                                                                                                                                                                                                                          rgb: "167,139,250" },
    { id: 2, title: "The aftermath", body: "For the following six months — after getting our seller account up and running — we dedicated extensive time and effort to developing effective strategies for safely and easily creating multiple Amazon accounts without the risk of being linked and blocked, which soon led to research of other stores and how their algorithms work as well.",                                                                                                                                                                                                                                                                                                                                                                                                                                                                                rgb: "245,185,69" },
  ];

  /**
   * EvadeTrustSplit — split-screen pinned testimonial section.
   *
   * Desktop (lg+):
   *   Left half: sticky panel. trust-reviews image is the panel
   *   background (integrated, not floating). Overlay text cross-fades
   *   between the three trust card titles based on which card is in
   *   view on the right column.
   *
   *   Right half: scrolling column of three editorial trust cards
   *   (NOT GlassCards) with the existing admin edit ids preserved
   *   (evade.trust.0/1/2.title + .body).
   *
   * Mobile / admin edit: collapses to a vertical stack: chapter
   * header → integrated trust-reviews image → three trust cards.
   * The image remains admin-editable via EditableImage (id:
   * evade.divider.trustReviews) in both layouts.
   */
  export default function EvadeTrustSplit() {
    const reduced = useReducedMotion();
    const { isAdmin, editMode } = useEditContext();
    const editing = isAdmin && editMode;

    const [isMobile, setIsMobile] = useState(false);
    useEffect(() => {
      const mq = window.matchMedia("(max-width: 1023px)");
      const sync = () => setIsMobile(mq.matches);
      sync();
      mq.addEventListener("change", sync);
      return () => mq.removeEventListener("change", sync);
    }, []);

    const disable = reduced || editing || isMobile;
    const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
    const [active, setActive] = useState(0);

    // Track which card is closest to the viewport center
    useEffect(() => {
      if (disable) return;
      const obs = new IntersectionObserver(
        (entries) => {
          let best = active;
          let bestRatio = -1;
          entries.forEach((e) => {
            if (e.intersectionRatio > bestRatio) {
              bestRatio = e.intersectionRatio;
              const idx = Number((e.target as HTMLElement).dataset.idx ?? -1);
              if (idx >= 0) best = idx;
            }
          });
          setActive(best);
        },
        { threshold: [0.25, 0.5, 0.75], rootMargin: "-30% 0px -30% 0px" }
      );
      cardRefs.current.forEach((el) => el && obs.observe(el));
      return () => obs.disconnect();
    }, [disable, active]);

    return (
      <section className="relative z-10 py-20">
        <div className="container-wide relative">
          <div className="grid items-start gap-10 lg:grid-cols-2 lg:gap-16">
            {/* LEFT — sticky panel with integrated trust-reviews image */}
            <div className={`relative ${disable ? "" : "lg:sticky lg:top-24"}`}>
              <div
                className="relative overflow-hidden rounded-[2rem] border border-white/15"
                style={{
                  aspectRatio: "4/5",
                  background:
                    "linear-gradient(160deg, rgba(245,185,69,0.18), rgba(10,8,22,0.92))",
                  boxShadow:
                    "0 60px 140px -30px rgba(0,0,0,0.9), 0 0 90px -20px rgba(245,185,69,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
              >
                {/* Trust-reviews image — now INTEGRATED as panel
                    background (not floating). Admin-editable. */}
                <div className="absolute inset-0 grid place-items-center p-10">
                  <EditableImage
                    id="evade.divider.trustReviews"
                    defaultSrc="/uploads/trust-reviews.webp"
                    alt="Star reviews — clients trust RefundGod."
                    wrapperClassName="relative block w-full h-full"
                    className="h-full w-full object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.7)]"
                  />
                </div>
                {/* Cross-fading title overlay */}
                <div className="absolute inset-x-0 bottom-0 p-8">
                  <div className="relative h-20">
                    {TRUST.map((t, i) => (
                      <div
                        key={t.id}
                        className="absolute inset-0 flex flex-col justify-end transition-all duration-700"
                        style={{
                          opacity: active === i ? 1 : 0,
                          transform: active === i ? "translateY(0)" : "translateY(10px)",
                        }}
                        aria-hidden={active !== i}
                      >
                        <div
                          className="text-xs font-bold uppercase tracking-[0.32em]"
                          style={{ color: `rgba(${t.rgb},0.95)` }}
                        >
                          Trust · 0{i + 1} of 03
                        </div>
                        <div
                          className="editorial-display mt-2 text-3xl font-black uppercase leading-tight text-white sm:text-4xl"
                          style={{
                            textShadow: "0 4px 20px rgba(0,0,0,0.9)",
                            letterSpacing: "-0.025em",
                          }}
                        >
                          {t.title}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* Vignette */}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0"
                  style={{
                    background:
                      "radial-gradient(ellipse 80% 60% at 50% 30%, transparent, rgba(10,8,22,0.55))",
                  }}
                />
              </div>
            </div>

            {/* RIGHT — chapter header + scrolling trust cards */}
            <div className="relative">
              <div className="mb-10 flex flex-col items-start gap-4">
                <ChapterPill
                  editId="evade.ch3.eyebrow"
                  defaultValue="chapter 03 / reputation"
                  accent="amber"
                  size="md"
                />
                <KineticText
                  as="h2"
                  text="Our reputation at stake."
                  editId="evade.ch3.title"
                  className="editorial-display max-w-xl text-balance uppercase text-white text-[clamp(2rem,5vw,3.6rem)]"
                  style={{
                    textShadow:
                      "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
                    letterSpacing: "-0.025em",
                  }}
                />
              </div>

              <div className="flex flex-col gap-8">
                {TRUST.map((t, i) => (
                  <motion.div
                    key={t.id}
                    ref={(el) => { cardRefs.current[i] = el; }}
                    data-idx={i}
                    initial={reduced ? { opacity: 1 } : { opacity: 0, y: 30 }}
                    whileInView={reduced ? undefined : { opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.7, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
                    className="relative pl-6"
                  >
                    <span
                      aria-hidden
                      className="absolute left-0 top-2 bottom-2 w-[2px] rounded-full"
                      style={{
                        background: `linear-gradient(180deg, rgba(${t.rgb},0.95), transparent)`,
                        boxShadow: `0 0 18px rgba(${t.rgb},0.6)`,
                      }}
                    />
                    <div
                      className="mb-2 text-xs font-bold uppercase tracking-[0.32em]"
                      style={{ color: `rgba(${t.rgb},0.95)` }}
                    >
                      0{i + 1} · TRUST
                    </div>
                    <EditableText
                      id={`evade.trust.${i}.title`}
                      defaultValue={t.title}
                      as="h3"
                      className="editorial-display text-2xl font-black uppercase text-white sm:text-3xl"
                      style={{
                        textShadow: "0 2px 14px rgba(0,0,0,0.8)",
                        letterSpacing: "-0.02em",
                      }}
                    />
                    <EditableText
                      id={`evade.trust.${i}.body`}
                      defaultValue={t.body}
                      as="p"
                      multiline
                      className="mt-4 text-base leading-relaxed text-white/90 sm:text-lg"
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  }
  