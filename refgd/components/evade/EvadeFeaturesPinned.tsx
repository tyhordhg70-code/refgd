"use client";
import EditableText from "@/components/EditableText";
import KineticText from "@/components/KineticText";
import SafeReveal from "@/components/SafeReveal";
import HudEyebrow from "./HudEyebrow";
import CyberGlyph, { type CyberGlyphKind } from "./CyberGlyph";

const FEATURES: { title: string; body: string; tint: "cyan" | "violet" | "amber" | "fuchsia"; rgb: string; illo: CyberGlyphKind; cmd: string }[] = [
  { title: "Seamless transition",              body: "It doesn't matter what happened to your previous account; be it suspended, blocked, banned, blacklisted, or anything else, you WILL learn how to crank out new accounts without ever getting detected or linked again.", tint: "cyan",    rgb: "34,211,238",  illo: "terminal",   cmd: "exec seamless_transition" },
  { title: "Precise, step-by-step procedures", body: "While creating numerous accounts may seem easy by simply using new information, the real value lies in maintaining their longevity without encountering bans or cancelations due to algorithm detections.",       tint: "violet",  rgb: "167,139,250", illo: "hexgrid",    cmd: "run procedures --strict" },
  { title: "Range of features",                body: "Lifetime updates, anonymity techniques, account management strategies, anonymous credit cards, multi-account safety, automatic customers for selling items, and account-linking prevention.",                       tint: "amber",   rgb: "245,185,69",  illo: "shieldscan", cmd: "list features --all" },
  { title: "No filler, no BS",                 body: "After investing significant time and resources we offer only the most precise and actionable methods, with a lifetime support guarantee.",                                                                          tint: "fuchsia", rgb: "232,121,249", illo: "crosshair",  cmd: "verify --integrity" },
];

/**
 * EvadeFeaturesPinned — chapter "features", redesigned as a CAPABILITY
 * TERMINAL READOUT instead of a 2x2 grid of identical glass cards.
 *
 * One console window: traffic-light header + monospace path, then four
 * capability entries rendered as command outputs (mono prompt, cyber
 * glyph, editable title + body) sharing the terminal surface and split
 * by hairlines — so it reads as a manpage/console, not floating cards.
 *
 * Preserved editIds: evade.features.eyebrow / .title and
 * evade.feature.{i}.title / .body (defaultValues byte-identical).
 */
export default function EvadeFeaturesPinned() {
  return (
    <section className="relative z-10 py-20 sm:py-28">
      <div className="container-wide">
        <div className="mb-10 flex flex-col items-start gap-5">
          <HudEyebrow editId="evade.features.eyebrow" defaultValue="chapter 04 / features" accent="amber" />
          <KineticText
            as="h2"
            text="What you'll master."
            editId="evade.features.title"
            className="editorial-display max-w-3xl text-balance uppercase text-white text-[clamp(2rem,5.4vw,4rem)]"
            style={{ textShadow: "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)", letterSpacing: "-0.025em" }}
          />
        </div>

        {/* ── Terminal window ── */}
        <SafeReveal kind="riseDep" duration={1.0}>
          <div
            className="overflow-hidden rounded-xl border border-white/12"
            style={{
              background: "linear-gradient(180deg, rgba(10,13,24,0.92), rgba(6,8,16,0.95))",
              boxShadow: "inset 0 0 0 1px rgba(34,211,238,0.06), 0 50px 120px -50px rgba(0,0,0,0.9)",
            }}
          >
            {/* header bar */}
            <div className="flex items-center gap-3 border-b border-white/10 bg-white/[0.03] px-4 py-3"
              style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}>
              <span className="flex gap-1.5" aria-hidden>
                <span className="h-3 w-3 rounded-full" style={{ background: "rgba(255,95,86,0.9)" }} />
                <span className="h-3 w-3 rounded-full" style={{ background: "rgba(255,189,46,0.9)" }} />
                <span className="h-3 w-3 rounded-full" style={{ background: "rgba(39,201,63,0.9)" }} />
              </span>
              <span className="text-[11px] tracking-[0.12em] text-white/45" aria-hidden>
                refundgod@evade: <span className="text-cyan-300/80">~/capabilities</span>
              </span>
              <span className="ml-auto hidden items-center gap-2 text-[10px] uppercase tracking-[0.24em] text-emerald-300/70 sm:flex" aria-hidden>
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> live
              </span>
            </div>

            {/* entries */}
            <div className="grid sm:grid-cols-2">
              {FEATURES.map((f, i) => (
                <SafeReveal
                  key={f.title}
                  kind="lift"
                  delay={0.06 * i}
                  duration={0.8}
                  className={[
                    "relative p-6 sm:p-7",
                    "border-white/8",
                    i % 2 === 0 ? "sm:border-r" : "",
                    i < 2 ? "border-b" : "sm:border-b-0 border-b",
                    i === 2 ? "border-b sm:border-b-0" : "",
                  ].join(" ")}
                >
                  {/* mono prompt */}
                  <div className="mb-4 flex items-center gap-2 text-[11px] tracking-[0.08em]"
                    style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }} aria-hidden>
                    <span style={{ color: `rgba(${f.rgb},0.95)` }}>&gt;</span>
                    <span className="text-white/45">{f.cmd}</span>
                    <span className="ev-ft-caret ml-0.5 inline-block h-3.5 w-1.5 align-middle" style={{ background: `rgba(${f.rgb},0.9)` }} />
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="shrink-0">
                      <CyberGlyph kind={f.illo} accent={f.tint} size={58} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <EditableText
                        id={`evade.feature.${i}.title`}
                        defaultValue={f.title}
                        as="h3"
                        className="heading-display text-lg font-bold uppercase tracking-tight text-white sm:text-xl"
                        style={{ lineHeight: 1.2 }}
                      />
                      <span aria-hidden className="mt-2 block h-px w-10" style={{ background: `linear-gradient(90deg, rgba(${f.rgb},0.95), transparent)` }} />
                      <EditableText
                        id={`evade.feature.${i}.body`}
                        defaultValue={f.body}
                        as="p"
                        multiline
                        className="mt-3 text-[15px] leading-relaxed text-white/90"
                      />
                    </div>
                  </div>
                </SafeReveal>
              ))}
            </div>
          </div>
        </SafeReveal>
      </div>

      <style>{`
        .ev-ft-caret { animation: evFtBlink 1.1s steps(1) infinite; }
        @keyframes evFtBlink { 0%,50% { opacity: 1; } 50.01%,100% { opacity: 0; } }
        @media (prefers-reduced-motion: reduce) { .ev-ft-caret { animation: none; opacity: 0.8; } }
      `}</style>
    </section>
  );
}
