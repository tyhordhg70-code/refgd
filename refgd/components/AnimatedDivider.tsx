"use client";

/**
 * AnimatedDivider
 * ─────────────────────────────────────────────────────────────────
 * Decorative animated divider that lives between two chapters (the
 * "How it works" step-3 card and "Why choose us").
 *
 * v6.14.x redesign — "a current of value". The old version scattered
 * 12 shopping icons across the band, each driven by an always-on
 * Framer infinite loop (12 JS-driven rasterising layers that kept the
 * compositor busy even off-screen). This version is a single cohesive
 * luminous rail carrying a travelling light pulse left→right, with a
 * small curated cluster of cashback glyphs — coins, a sparkle, a bag,
 * a tag — riding the current, bobbing and glow-pulsing on staggered
 * CSS keyframes. Reads as money flowing from one chapter into the next.
 *
 * All motion is pure CSS (see globals.css .dv-*), so it is compositor-
 * cheap and frozen offscreen by OffscreenGlowPauser via the
 * data-anim-section root. prefers-reduced-motion disables it in CSS.
 */

const GLYPHS = {
  bag: "M6 7h12l-1.2 12.3a2 2 0 0 1-2 1.7H9.2a2 2 0 0 1-2-1.7L6 7zM9 7V5a3 3 0 0 1 6 0v2",
  coin: "M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zM12 6v12M9 9h4.5a1.5 1.5 0 0 1 0 3H10a2 2 0 0 0 0 4h5",
  sparkle: "M12 2v6M12 16v6M2 12h6M16 12h6M5 5l4 4M15 15l4 4M5 19l4-4M15 9l4-4",
  tag: "M20.6 12.6 12 21.2 2.8 12V2.8H12L20.6 11.4a1 1 0 0 1 0 1.2zM7.5 7.5h.01",
};

type Floater = {
  d: string;
  leftPct: number;
  topPct: number;
  size: number;
  color: string;
  glow2: string;
  dur: string;
  gdur: string;
  delay: string;
  variant?: "b";
};

const FLOATERS: Floater[] = [
  { d: GLYPHS.coin,    leftPct: 12, topPct: 42, size: 34, color: "#f5b945", glow2: "rgba(245,185,69,0.45)", dur: "6.5s", gdur: "4s",   delay: "0s" },
  { d: GLYPHS.sparkle, leftPct: 26, topPct: 60, size: 22, color: "#22d3ee", glow2: "rgba(34,211,238,0.4)",  dur: "5.5s", gdur: "3.4s", delay: "0.8s", variant: "b" },
  { d: GLYPHS.bag,     leftPct: 39, topPct: 38, size: 30, color: "#a78bfa", glow2: "rgba(167,139,250,0.4)", dur: "7s",   gdur: "4.6s", delay: "0.3s" },
  { d: GLYPHS.coin,    leftPct: 52, topPct: 64, size: 26, color: "#7be0a8", glow2: "rgba(123,224,168,0.4)", dur: "6s",   gdur: "3.8s", delay: "1.2s", variant: "b" },
  { d: GLYPHS.tag,     leftPct: 64, topPct: 40, size: 28, color: "#f5b945", glow2: "rgba(245,185,69,0.45)", dur: "6.8s", gdur: "4.2s", delay: "0.5s" },
  { d: GLYPHS.sparkle, leftPct: 76, topPct: 58, size: 20, color: "#a78bfa", glow2: "rgba(167,139,250,0.4)", dur: "5.2s", gdur: "3.2s", delay: "1.6s", variant: "b" },
  { d: GLYPHS.coin,    leftPct: 88, topPct: 44, size: 32, color: "#22d3ee", glow2: "rgba(34,211,238,0.4)",  dur: "7.2s", gdur: "4.4s", delay: "0.2s" },
];

const TWINKLES = [
  { l: "18%", t: "28%", d: "0s",   dur: "2.8s" },
  { l: "33%", t: "74%", d: "0.7s", dur: "3.4s" },
  { l: "48%", t: "30%", d: "1.3s", dur: "2.6s" },
  { l: "60%", t: "76%", d: "0.4s", dur: "3.1s" },
  { l: "72%", t: "30%", d: "1.8s", dur: "2.9s" },
  { l: "84%", t: "70%", d: "1.0s", dur: "3.5s" },
];

export default function AnimatedDivider() {
  return (
    <section
      aria-hidden="true"
      data-anim-section
      className="relative isolate w-full overflow-hidden"
      style={{
        height: "clamp(180px, 22vh, 280px)",
        background:
          "radial-gradient(ellipse at center, rgba(245,185,69,0.16) 0%, rgba(15,10,30,0) 70%), linear-gradient(90deg, rgba(8,6,18,0) 0%, rgba(15,10,30,0.5) 50%, rgba(8,6,18,0) 100%)",
      }}
    >
      {/* Top + bottom hairline glows */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-300/40 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-300/40 to-transparent" />

      {/* central rail + travelling sweep */}
      <div className="dv-rail" />
      <div className="dv-sweep" />

      {/* twinkles */}
      {TWINKLES.map((t, i) => (
        <span
          key={`tw-${i}`}
          className="dv-twinkle"
          style={{
            left: t.l,
            top: t.t,
            ["--delay" as string]: t.d,
            ["--tdur" as string]: t.dur,
          }}
        />
      ))}

      {/* glyph current */}
      {FLOATERS.map((f, i) => (
        <div
          key={`fl-${i}`}
          className={`dv-floater${f.variant === "b" ? " dv-floater--b" : ""}`}
          style={{
            left: `${f.leftPct}%`,
            top: `${f.topPct}%`,
            width: f.size,
            height: f.size,
            color: f.color,
            ["--g" as string]: f.color,
            ["--g2" as string]: f.glow2,
            ["--dur" as string]: f.dur,
            ["--gdur" as string]: f.gdur,
            ["--delay" as string]: f.delay,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
            <path d={f.d} />
          </svg>
        </div>
      ))}
    </section>
  );
}
