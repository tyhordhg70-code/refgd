"use client";
import EditableText from "@/components/EditableText";
import EditableImage from "@/components/EditableImage";
import KineticText from "@/components/KineticText";
import SafeReveal from "@/components/SafeReveal";
import HudEyebrow from "./HudEyebrow";

/**
 * EvadeShieldMoment — redesigned as a full-bleed "scan moment".
 *
 * Gone: the rounded-[2rem] glass panel with two corner blur-blobs that
 * every other section also used. Instead the sec-shield art becomes the
 * subject of an active threat-scan — wrapped in a targeting reticle and
 * radar rings with a single travelling scan beam — while the copy sits
 * as a frameless editorial column. Reads as a defense console, not a card.
 *
 * Preserved editIds: evade.shield.eyebrow / .title / .body and the
 * image evade.divider.secShield (with identical defaultSrc + alt).
 */
export default function EvadeShieldMoment() {
  return (
    <section className="relative z-10 overflow-hidden py-24 sm:py-32">
      {/* faint full-width baseline rule + mono coordinates (HUD furniture) */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden -translate-y-1/2 lg:block" aria-hidden>
        <div className="container-wide">
          <div className="h-px w-full" style={{ background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.18) 30%, rgba(34,211,238,0.18) 70%, transparent)" }} />
        </div>
      </div>

      <div className="container-wide relative">
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16">
          {/* ── Editorial copy column (frameless) ── */}
          <SafeReveal kind="lift" duration={1.0}>
            <div
              className="mb-5 inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.3em] text-cyan-300/70"
              style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
              aria-hidden
            >
              <span className="grid h-4 w-4 place-items-center rounded-full border border-cyan-300/40 text-[8px]">◇</span>
              THREAT&nbsp;SCAN&nbsp;//&nbsp;ACTIVE
            </div>
            <HudEyebrow editId="evade.shield.eyebrow" defaultValue="defense layer / undetectable" accent="cyan" />
            <KineticText
              as="h2"
              text="Built to be undetectable."
              editId="evade.shield.title"
              className="editorial-display mt-7 max-w-xl text-balance uppercase text-white text-[clamp(2rem,5vw,3.6rem)]"
              style={{
                textShadow: "0 6px 36px rgba(0,0,0,0.95), 0 2px 6px rgba(0,0,0,0.95)",
                letterSpacing: "-0.025em",
                lineHeight: 1.12,
              }}
            />
            <div className="mt-7 max-w-lg border-l-2 border-cyan-300/50 pl-5">
              <EditableText
                id="evade.shield.body"
                defaultValue="A fortified infrastructure of sandboxed identities, rotating fingerprints, and anti-detection layers — engineered so every order looks like it came from a clean, trusted shopper. The store's fraud team sees nothing out of the ordinary; you walk away with the refund."
                as="p"
                multiline
                className="text-base leading-[1.8] text-white/90 sm:text-lg"
              />
            </div>
            {/* mono status row */}
            <div
              className="mt-8 flex flex-wrap gap-x-7 gap-y-2 text-[10px] uppercase tracking-[0.22em] text-white/45"
              style={{ fontFamily: '"JetBrains Mono", ui-monospace, monospace' }}
              aria-hidden
            >
              <span><span className="text-cyan-300/80">●</span> fingerprint&nbsp;rotation</span>
              <span><span className="text-cyan-300/80">●</span> sandboxed&nbsp;identity</span>
              <span><span className="text-cyan-300/80">●</span> 0&nbsp;flags&nbsp;raised</span>
            </div>
          </SafeReveal>

          {/* ── Scan composition ── */}
          <SafeReveal kind="riseDep" delay={0.15} duration={1.15} className="relative">
            <div className="ev-sm-stage relative mx-auto w-full max-w-[520px]">
              {/* radar rings */}
              <span aria-hidden className="ev-sm-rings" />
              {/* slow rotating dashed reticle ring (1 animation) */}
              <span aria-hidden className="ev-sm-reticle hidden lg:block" />
              {/* crosshair ticks */}
              <span aria-hidden className="ev-sm-tick ev-sm-tick-t" />
              <span aria-hidden className="ev-sm-tick ev-sm-tick-b" />
              <span aria-hidden className="ev-sm-tick ev-sm-tick-l" />
              <span aria-hidden className="ev-sm-tick ev-sm-tick-r" />

              <div className="ev-sm-imgwrap relative">
                <EditableImage
                  id="evade.divider.secShield"
                  defaultSrc="/uploads/sec-shield.webp"
                  alt="Anti-fraud security infrastructure — servers, shields, encrypted keys."
                  wrapperClassName="relative block mx-auto w-full"
                  className="mx-auto block h-auto w-full object-contain drop-shadow-[0_30px_60px_rgba(34,211,238,0.4)]"
                />
                {/* single travelling scan beam (1 animation, desktop) */}
                <span aria-hidden className="ev-sm-beam hidden lg:block" />
              </div>
            </div>
          </SafeReveal>
        </div>
      </div>

      <style>{`
        .ev-sm-rings {
          position: absolute; inset: -8% ; border-radius: 50%;
          background:
            radial-gradient(circle, transparent 0 32%, rgba(34,211,238,0.16) 32.3% 33%, transparent 33.3%),
            radial-gradient(circle, transparent 0 57%, rgba(34,211,238,0.11) 57.3% 58%, transparent 58.3%),
            radial-gradient(circle, transparent 0 82%, rgba(167,139,250,0.10) 82.3% 83%, transparent 83.3%);
          pointer-events: none;
        }
        .ev-sm-reticle {
          position: absolute; inset: 2%; border-radius: 50%;
          border: 1px dashed rgba(34,211,238,0.28);
          animation: evSmSpin 26s linear infinite;
          will-change: transform; pointer-events: none;
        }
        @keyframes evSmSpin { to { transform: rotate(360deg); } }
        .ev-sm-tick {
          position: absolute; background: rgba(34,211,238,0.6);
          box-shadow: 0 0 10px rgba(34,211,238,0.5); pointer-events: none;
        }
        .ev-sm-tick-t, .ev-sm-tick-b { left: 50%; width: 1px; height: 14px; transform: translateX(-50%); }
        .ev-sm-tick-l, .ev-sm-tick-r { top: 50%; height: 1px; width: 14px; transform: translateY(-50%); }
        .ev-sm-tick-t { top: -16px; } .ev-sm-tick-b { bottom: -16px; }
        .ev-sm-tick-l { left: -16px; } .ev-sm-tick-r { right: -16px; }

        .ev-sm-imgwrap { overflow: hidden; border-radius: 18px; }
        .ev-sm-beam {
          position: absolute; left: 0; right: 0; top: 0; height: 40%;
          background: linear-gradient(180deg, transparent, rgba(125,231,255,0.05) 60%, rgba(125,231,255,0.22) 92%, rgba(125,231,255,0.5));
          border-bottom: 1px solid rgba(125,231,255,0.7);
          animation: evSmBeam 4.5s ease-in-out infinite;
          will-change: transform; pointer-events: none;
        }
        @keyframes evSmBeam {
          0%, 100% { transform: translateY(-45%); opacity: 0.2; }
          50% { transform: translateY(165%); opacity: 0.9; }
        }
        @media (prefers-reduced-motion: reduce) {
          .ev-sm-reticle, .ev-sm-beam { animation: none !important; }
          .ev-sm-beam { display: none; }
        }
      `}</style>
    </section>
  );
}
