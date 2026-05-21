"use client";
  import { motion, useScroll, useTransform, useReducedMotion, useMotionValueEvent } from "framer-motion";
  import { useEffect, useRef, useState } from "react";
  import EditableText from "@/components/EditableText";
  import ChapterPill from "@/components/ChapterPill";
  import KineticText from "@/components/KineticText";
  import ParallaxIllustration from "@/components/ParallaxIllustration";
  import { useEditContext } from "@/lib/edit-context";

  const FEATURES = [
    { title: "Seamless transition",            body: "It doesn't matter what happened to your previous account; be it suspended, blocked, banned, blacklisted, or anything else, you WILL learn how to crank out new accounts without ever getting detected or linked again.", tint: "cyan" as const,    rgb: "34,211,238",  illo: "encryption" as const },
    { title: "Precise, step-by-step procedures", body: "While creating numerous accounts may seem easy by simply using new information, the real value lies in maintaining their longevity without encountering bans or cancelations due to algorithm detections.",       tint: "violet" as const,  rgb: "167,139,250", illo: "shield"     as const },
    { title: "Range of features",              body: "Lifetime updates, anonymity techniques, account management strategies, anonymous credit cards, multi-account safety, automatic customers for selling items, and account-linking prevention.",                       tint: "amber" as const,   rgb: "245,185,69",  illo: "globe"      as const },
    { title: "No filler, no BS",               body: "After investing significant time and resources we offer only the most precise and actionable methods, with a lifetime support guarantee.",                                                                          tint: "fuchsia" as const, rgb: "232,121,249", illo: "spark"      as const },
  ];

  /**
   * EvadeFeaturesPinned — Lusion/Noomo-style pinned scroll narrative.
   *
   * Desktop: section pins for ~4× viewport. As the user scrolls, the
   * four features advance one-at-a-time inside a sticky stage. Each
   * scene has:
   *   – oversized 01/02/03/04 numeral
   *   – feature title + body (admin-editable, ids preserved)
   *   – matching ParallaxIllustration on the opposite side
   *   – cross-fade between scenes (no popcorn entrances)
   *
   * Mobile, reduced-motion, or admin-edit-mode: pin is disabled, all
   * four features render as a clean stacked column so EditableText
   * caret + popovers behave correctly.
   *
   * Edit ids preserved: evade.feature.0..3.title / .body, evade.ch4.eyebrow,
   * evade.ch4.title (the chapter pill+title rendered above the stage).
   *
   * NOTE — this section uses the OLD chapter-04 edit ids on purpose:
   *   evade.ch4.eyebrow = "FEATURES" eyebrow, evade.ch4.title = section
   * heading. The page used to share evade.ch4.* between Features and
   * Pricing chapters with different defaults; the pricing showcase below
   * uses evade.pricing.eyebrow / evade.pricing.title instead so the two
   * don't clash. Defaults match the page's previous content.
   */
  export default function EvadeFeaturesPinned() {
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
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
      target: containerRef,
      offset: ["start start", "end end"],
    });

    // Track current scene index (0-3) for the editorial overlay
    const [activeScene, setActiveScene] = useState(0);
    useMotionValueEvent(scrollYProgress, "change", (v) => {
      const i = Math.min(FEATURES.length - 1, Math.max(0, Math.floor(v * FEATURES.length)));
      setActiveScene(i);
    });

    // Fallback path (mobile / edit / reduced-motion) — plain stacked grid
    if (disable) {
      return (
        <section className="relative z-10 py-20">
          <div className="container-wide relative">
            <FeatureHeader />
            <div className="mt-12 grid gap-6 md:grid-cols-2">
              {FEATURES.map((f, i) => (
                <FeatureCard key={i} f={f} i={i} />
              ))}
            </div>
          </div>
        </section>
      );
    }

    return (
      <section ref={containerRef} className="relative z-10" style={{ height: `${FEATURES.length * 100}vh` }}>
        {/* Sticky stage */}
        <div className="sticky top-0 flex h-screen items-center overflow-hidden">
          <div className="container-wide relative w-full">
            <FeatureHeader />

            {/* Sceneboard — each feature is an absolute-positioned scene
                that fades in when active. Plain CSS opacity transitions
                keep this cheap. */}
            <div className="relative mt-10 h-[60vh]">
              {FEATURES.map((f, i) => (
                <FeatureScene
                  key={i}
                  f={f}
                  i={i}
                  active={activeScene === i}
                />
              ))}
            </div>

            {/* Progress dots */}
            <div className="mt-6 flex items-center justify-center gap-3">
              {FEATURES.map((_, i) => (
                <span
                  key={i}
                  aria-hidden
                  className="h-1.5 rounded-full transition-all duration-500"
                  style={{
                    width: activeScene === i ? 48 : 14,
                    background:
                      activeScene === i
                        ? `rgba(${FEATURES[i].rgb},0.95)`
                        : "rgba(255,255,255,0.18)",
                    boxShadow:
                      activeScene === i
                        ? `0 0 18px rgba(${FEATURES[i].rgb},0.7)`
                        : "none",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  }

  function FeatureHeader() {
    return (
      <div className="flex flex-col items-start gap-4">
        <ChapterPill
          editId="evade.features.eyebrow"
          defaultValue="chapter 04 / features"
          accent="amber"
          size="md"
        />
        <KineticText
          as="h2"
          text="What you'll master."
          editId="evade.features.title"
          className="editorial-display max-w-3xl text-balance uppercase text-white text-[clamp(1.8rem,4.8vw,3.6rem)]"
          style={{
            textShadow:
              "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
            letterSpacing: "-0.025em",
          }}
        />
      </div>
    );
  }

  function FeatureScene({ f, i, active }: { f: typeof FEATURES[number]; i: number; active: boolean }) {
    return (
      <div
        className="absolute inset-0 grid items-center gap-10 transition-all duration-700 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]"
        style={{
          opacity: active ? 1 : 0,
          transform: active ? "translateY(0)" : "translateY(40px)",
          pointerEvents: active ? "auto" : "none",
        }}
        aria-hidden={!active}
      >
        {/* Left — illustration + oversized numeral */}
        <div className="relative flex items-center justify-center">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 grid place-items-center"
          >
            <span
              className="editorial-display select-none font-black leading-none"
              style={{
                fontSize: "clamp(10rem, 22vw, 22rem)",
                color: `rgba(${f.rgb},0.16)`,
                textShadow: `0 0 80px rgba(${f.rgb},0.35)`,
                letterSpacing: "-0.06em",
              }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
          </div>
          <div className="relative" aria-hidden>
            <ParallaxIllustration kind={f.illo} accent={f.tint} size={280} />
          </div>
        </div>

        {/* Right — title + body (admin-editable) */}
        <div className="relative">
          <div
            className="mb-4 text-xs font-bold uppercase tracking-[0.32em]"
            style={{ color: `rgba(${f.rgb},0.95)` }}
          >
            Feature · {String(i + 1).padStart(2, "0")} of 04
          </div>
          <EditableText
            id={`evade.feature.${i}.title`}
            defaultValue={f.title}
            as="h3"
            className="editorial-display text-balance uppercase text-white text-[clamp(1.6rem,4vw,3rem)]"
            style={{
              textShadow: "0 4px 24px rgba(0,0,0,0.95)",
              letterSpacing: "-0.025em",
            }}
          />
          <EditableText
            id={`evade.feature.${i}.body`}
            defaultValue={f.body}
            as="p"
            multiline
            className="mt-6 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg"
          />
        </div>
      </div>
    );
  }

  function FeatureCard({ f, i }: { f: typeof FEATURES[number]; i: number }) {
    return (
      <div
        className="relative overflow-hidden rounded-[1.75rem] p-8"
        style={{
          background: `linear-gradient(160deg, rgba(${f.rgb},0.18), rgba(10,8,22,0.85))`,
          border: `1px solid rgba(${f.rgb},0.35)`,
          boxShadow: `0 40px 90px -20px rgba(0,0,0,0.85), 0 0 50px -20px rgba(${f.rgb},0.4)`,
        }}
      >
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 opacity-30 mix-blend-screen" aria-hidden="true">
          <ParallaxIllustration kind={f.illo} accent={f.tint} size={130} />
        </div>
        <div
          aria-hidden
          className="mb-4 editorial-display text-3xl font-black leading-none"
          style={{ color: `rgba(${f.rgb},0.95)`, textShadow: `0 0 20px rgba(${f.rgb},0.5)` }}
        >
          {String(i + 1).padStart(2, "0")}
        </div>
        <EditableText
          id={`evade.feature.${i}.title`}
          defaultValue={f.title}
          as="h3"
          className="heading-display text-2xl font-bold uppercase tracking-tight text-white"
          style={{ textShadow: "0 2px 16px rgba(0,0,0,0.8)" }}
        />
        <EditableText
          id={`evade.feature.${i}.body`}
          defaultValue={f.body}
          as="p"
          multiline
          className="mt-4 text-base leading-relaxed text-white/95"
        />
      </div>
    );
  }
  