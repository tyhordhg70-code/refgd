"use client";
import EditableText from "@/components/EditableText";
import ChapterPill from "@/components/ChapterPill";
import KineticText from "@/components/KineticText";
import ParallaxIllustration from "@/components/ParallaxIllustration";
import SafeReveal from "@/components/SafeReveal";

const FEATURES = [
  { title: "Seamless transition",              body: "It doesn't matter what happened to your previous account; be it suspended, blocked, banned, blacklisted, or anything else, you WILL learn how to crank out new accounts without ever getting detected or linked again.", tint: "cyan"    as const, rgb: "34,211,238",  illo: "encryption" as const },
  { title: "Precise, step-by-step procedures", body: "While creating numerous accounts may seem easy by simply using new information, the real value lies in maintaining their longevity without encountering bans or cancelations due to algorithm detections.",       tint: "violet"  as const, rgb: "167,139,250", illo: "shield"     as const },
  { title: "Range of features",                body: "Lifetime updates, anonymity techniques, account management strategies, anonymous credit cards, multi-account safety, automatic customers for selling items, and account-linking prevention.",                       tint: "amber"   as const, rgb: "245,185,69",  illo: "globe"      as const },
  { title: "No filler, no BS",                 body: "After investing significant time and resources we offer only the most precise and actionable methods, with a lifetime support guarantee.",                                                                          tint: "fuchsia" as const, rgb: "232,121,249", illo: "spark"      as const },
];

/**
 * EvadeFeaturesPinned v4 — root-cause fix for "What you'll master text
 * vanishing". The previous pinned-scrub narrative used
 * `opacity: active ? 1 : 0` to cross-fade between 4 scenes inside a
 * 400vh sticky stage. Three of four scenes are always at opacity:0,
 * and the active-scene logic can briefly land on -1 / 4 (out of range)
 * at the scrub boundaries, making ALL scenes invisible. On Lenis
 * smooth-scroll the timing was unreliable enough that users reported
 * sustained vanishing.
 *
 * v4 retires the sticky scrub entirely. All 4 features render as a
 * static 2x2 grid (1 column on mobile) with SafeReveal entrances.
 * The chapter header KineticText "What you'll master." sits above
 * and is never inside a transforming ancestor, so it always renders
 * at full opacity from first paint.
 */
export default function EvadeFeaturesPinned() {
  return (
    <section className="relative z-10 py-20 sm:py-28">
      <div className="container-wide relative">
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
              lineHeight: 1.15,
            }}
          />
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:gap-7">
          {FEATURES.map((f, i) => (
            <SafeReveal
              key={i}
              className="relative overflow-hidden rounded-[1.75rem] p-8"
              delay={0.08 + (i % 2) * 0.12}
              style={{
                background: `linear-gradient(160deg, rgba(${f.rgb},0.18), rgba(10,8,22,0.85))`,
                border: `1px solid rgba(${f.rgb},0.35)`,
                boxShadow: `0 40px 90px -20px rgba(0,0,0,0.85), 0 0 50px -20px rgba(${f.rgb},0.4)`,
              }}
            >
              <div className="pointer-events-none absolute right-3 top-3 h-32 w-32 opacity-25" aria-hidden="true">
                <ParallaxIllustration kind={f.illo} accent={f.tint} size={120} />
              </div>
              <div
                aria-hidden
                className="editorial-display mb-4 text-3xl font-black leading-none"
                style={{
                  color: `rgba(${f.rgb},0.95)`,
                  textShadow: `0 0 20px rgba(${f.rgb},0.5)`,
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </div>
              <EditableText
                id={`evade.feature.${i}.title`}
                defaultValue={f.title}
                as="h3"
                className="heading-display text-2xl font-bold uppercase tracking-tight text-white"
                style={{ textShadow: "0 2px 16px rgba(0,0,0,0.8)", lineHeight: 1.2 }}
              />
              <EditableText
                id={`evade.feature.${i}.body`}
                defaultValue={f.body}
                as="p"
                multiline
                className="mt-4 text-base leading-relaxed text-white/95"
              />
            </SafeReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
