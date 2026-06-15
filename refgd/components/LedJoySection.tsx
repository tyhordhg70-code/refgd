"use client";

import { motion, useReducedMotion, useInView } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// Single gold $100 bill (SVG). `pfx` keeps each instance's gradient ids
// unique so stacked bills never share (and clobber) one another's <defs>.
function CashBill({ pfx, size }: { pfx: string; size: number }) {
  return (
    <svg viewBox="0 0 120 60" width={size} height={size * 0.5} className="jb3-bill-svg">
      <defs>
        <linearGradient id={`${pfx}bill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#114f24" />
          <stop offset="40%" stopColor="#1a7437" />
          <stop offset="100%" stopColor="#0d3d1b" />
        </linearGradient>
        <linearGradient id={`${pfx}trim`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffe28a" />
          <stop offset="60%" stopColor="#f5b945" />
          <stop offset="100%" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id={`${pfx}glow`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(123, 224, 168, 0.4)" />
          <stop offset="100%" stopColor="transparent" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="116" height="56" rx="6" fill={`url(#${pfx}bill)`} stroke={`url(#${pfx}trim)`} strokeWidth="1.5" />
      <rect x="8" y="8" width="104" height="44" rx="4" fill="none" stroke={`url(#${pfx}trim)`} strokeWidth="1" opacity="0.8" />
      <circle cx="60" cy="30" r="14" fill="#0f3d20" stroke={`url(#${pfx}trim)`} strokeWidth="1.5" />
      <text x="60" y="38" textAnchor="middle" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="900" fontSize="22" fill={`url(#${pfx}trim)`}>$</text>
      <text x="14" y="18" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="10" fill="#7be0a8">100</text>
      <text x="106" y="52" textAnchor="end" fontFamily="system-ui, -apple-system, sans-serif" fontWeight="800" fontSize="10" fill="#7be0a8">100</text>
      <rect x="3" y="3" width="114" height="20" rx="5" fill={`url(#${pfx}glow)`} pointerEvents="none" />
    </svg>
  );
}

/**
 * LedJoySection — "Happy Shoppers" cosmic cashback beat.
 * ─────────────────────────────────────────────────────────────────
 * A full-screen beat that plays once when the visitor scrolls into it:
 *   1) "AHHHH" — five gold-3D letters fly in horizontally with a tiny
 *      stagger so it reads like a marquee.
 *   2) "feel the joy of cashback" — words slide in from the right.
 * Below the headline the owner's transparent shopper illustration
 * floats gently under a soft glow halo, with a full-width money rain
 * drifting down behind the scene. Visual is a deep cosmic starfield
 * with amber + violet bloom. Section is min-h-100svh so the beat owns
 * the screen during playback. All infinite CSS keyframes live inside
 * this [data-anim-section] root so OffscreenGlowPauser freezes them
 * when the section scrolls out of view (iOS compositor perf).
 */
export default function LedJoySection() {
  const ref = useRef<HTMLElement | null>(null);
  const reduce = useReducedMotion();
  const [played, setPlayed] = useState(false);
  const [rainFaded, setRainFaded] = useState(false);
  /* When loaded with ?debug=1 the section renders a fixed-position pill
     showing live play state / intersectionRatio / scroll position so we
     can see why the IO is (not) firing. Gated on the query param. */
  const [debug, setDebug] = useState<{
    enabled: boolean;
    ratio: number;
    isIntersecting: boolean;
    rectTop: number;
    rectBottom: number;
    vh: number;
    scrollY: number;
    fired: boolean;
  }>({ enabled: false, ratio: 0, isIntersecting: false, rectTop: 0, rectBottom: 0, vh: 0, scrollY: 0, fired: false });

  useEffect(() => {
    /* Robust one-shot play trigger. iOS Safari + Android Chrome can drop
       the IO callback on fast scrolls into the section, stranding the
       letters at opacity:0. So two independent triggers both flip the
       same one-shot `played` flag: (1) IntersectionObserver, and
       (2) a scroll-listener fallback. The fly-in still plays once. */
    const el = ref.current;
    if (typeof window === "undefined") return;
    const sp = new URLSearchParams(window.location.search);
    const debugOn = sp.get("debug") === "1";
    if (debugOn) setDebug((d) => ({ ...d, enabled: true }));

    let done = false;
    const fire = () => {
      if (done) return;
      done = true;
      setPlayed(true);
      if (debugOn) setDebug((d) => ({ ...d, fired: true }));
    };

    if (!el) {
      fire();
      return;
    }

    // 1) IntersectionObserver — low threshold for reliable trigger.
    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (debugOn) {
              const r = e.boundingClientRect;
              setDebug((d) => ({
                ...d,
                ratio: e.intersectionRatio,
                isIntersecting: e.isIntersecting,
                rectTop: Math.round(r.top),
                rectBottom: Math.round(r.bottom),
                vh: window.innerHeight,
                scrollY: Math.round(window.scrollY),
              }));
            }
            if (e.isIntersecting && e.intersectionRatio >= 0.50) {
              fire();
              io?.disconnect();
              break;
            }
          }
        },
        { threshold: [0, 0.05, 0.10, 0.15, 0.25, 0.50], rootMargin: "0px 0px 0px 0px" },
      );
      io.observe(el);
    }

    // 2) Scroll-listener fallback — if IO misses, fire when section
    //    top is within 35 % of the viewport.
    const onScroll = () => {
      if (done) return;
      const r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.35 && r.bottom > 0) {
        fire();
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      io?.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  /* Money rain is an entrance flourish, not a permanent loop. Once the
     beat has played, let it rain for a few seconds, then gently fade the
     whole rain layer out so the bills don't drift forever. */
  useEffect(() => {
    if (!played) return;
    const t = setTimeout(() => setRainFaded(true), 5200);
    return () => clearTimeout(t);
  }, [played]);

  const play = played;

  const ahhLetters = "AHHHH".split("");
  const taglineChars = "feel the joy of cashback".split("");

  // Gentle money rain — bills drift down the full width behind the scene.
  // Delays are NEGATIVE so every bill starts already mid-fall at load (no
  // pile-up at the top before the first cycle). Vars feed jb3-rain-fall.
  const rainBills = [
    { left: "8%",  size: 64, delay: "-3.2s", dur: "4s",   sway: "2vw",    r0: "-12deg", r1: "200deg" },
    { left: "18%", size: 82, delay: "-1.1s", dur: "4.6s", sway: "-3vw",   r0: "8deg",   r1: "-220deg" },
    { left: "28%", size: 56, delay: "-3.9s", dur: "4.8s", sway: "2.5vw",  r0: "-18deg", r1: "240deg" },
    { left: "40%", size: 74, delay: "-0.7s", dur: "4.3s", sway: "-2vw",   r0: "14deg",  r1: "-260deg" },
    { left: "52%", size: 60, delay: "-2.5s", dur: "5s",   sway: "3vw",    r0: "-10deg", r1: "210deg" },
    { left: "62%", size: 86, delay: "-4s",   dur: "4.4s", sway: "-2.5vw", r0: "16deg",  r1: "-200deg" },
    { left: "72%", size: 58, delay: "-1.8s", dur: "4.9s", sway: "2vw",    r0: "-14deg", r1: "230deg" },
    { left: "82%", size: 78, delay: "-3.3s", dur: "4.2s", sway: "-3vw",   r0: "10deg",  r1: "-240deg" },
    { left: "90%", size: 54, delay: "-0.9s", dur: "5.2s", sway: "2.5vw",  r0: "-16deg", r1: "220deg" },
    { left: "13%", size: 50, delay: "-2.8s", dur: "5.3s", sway: "-2vw",   r0: "12deg",  r1: "-210deg" },
    { left: "47%", size: 52, delay: "-4.4s", dur: "5s",   sway: "2vw",    r0: "-12deg", r1: "200deg" },
    { left: "67%", size: 48, delay: "-1.4s", dur: "5.4s", sway: "-2.5vw", r0: "14deg",  r1: "-230deg" },
  ];

  return (
    <section
      ref={ref}
      aria-label="Ahhh, feel the joy of cashback"
      className="relative isolate flex min-h-[100svh] w-full items-start justify-center pt-[4vh] pb-12 sm:pt-[6vh] sm:pb-16"
      style={{ perspective: "1200px" }}
      data-anim-section
      data-storelist-build="joy-shoppers-1"
    >
      {/* debug overlay (only renders when ?debug=1). */}
      {debug.enabled && (
        <div
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 8,
            right: 8,
            zIndex: 99999,
            padding: "8px 12px",
            background: "rgba(0,0,0,0.85)",
            color: debug.fired ? "#86efac" : "#fbbf24",
            border: `2px solid ${debug.fired ? "#22c55e" : "#f59e0b"}`,
            borderRadius: 8,
            fontFamily: "ui-monospace, monospace",
            fontSize: 11,
            lineHeight: 1.4,
            whiteSpace: "pre",
            pointerEvents: "none",
            boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
          }}
        >
          {[
            `LedJoy debug`,
            `played   : ${played}`,
            `fired    : ${debug.fired}`,
            `isInView : ${debug.isIntersecting}`,
            `ratio    : ${debug.ratio.toFixed(3)}`,
            `rect.top : ${debug.rectTop}px`,
            `rect.bot : ${debug.rectBottom}px`,
            `viewportH: ${debug.vh}px`,
            `scrollY  : ${debug.scrollY}px`,
            `threshold: 0.50 (must hit)`,
          ].join("\n")}
        </div>
      )}

      {/* All decorative layers (starfield, glow orbs, money rain) live in
          ONE absolutely-positioned, overflow-hidden box so they stay
          clipped to the section WITHOUT clipping the content. The section
          itself is no longer overflow-hidden, so the tall shopper
          illustration can never be sliced in half on scroll. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
      {/* cosmic starfield + ambient glow orbs (offscreen-pausable). */}
      <div aria-hidden="true" className="jb3-stars" />
      <div
        aria-hidden="true"
        className="jb3-glow-orb"
        style={{ width: "55vw", height: "55vw", top: "-5%", left: "5%", background: "radial-gradient(circle, rgba(245,185,69,0.18) 0%, transparent 65%)" }}
      />
      <div
        aria-hidden="true"
        className="jb3-glow-orb"
        style={{ width: "45vw", height: "45vw", bottom: "10%", right: "-5%", background: "radial-gradient(circle, rgba(167,139,250,0.12) 0%, transparent 65%)", animationDelay: "-3s" }}
      />

      {/* gentle money rain — full width, behind the headline + illustration.
          Fades out a few seconds after the beat plays (see rainFaded). */}
      <div
        className="jb3-rain"
        aria-hidden="true"
        style={{ opacity: rainFaded ? 0 : 1, transition: "opacity 1.6s ease-out" }}
      >
        {rainBills.map((r, i) => (
          <div
            key={i}
            className="jb3-rain-bill"
            style={{
              left: r.left,
              ["--delay" as string]: r.delay,
              ["--dur" as string]: r.dur,
              ["--sway" as string]: r.sway,
              ["--r0" as string]: r.r0,
              ["--r1" as string]: r.r1,
            }}
          >
            <CashBill pfx={`r${i}`} size={r.size} />
          </div>
        ))}
      </div>
      </div>

      <div className="container-wide relative z-10 grid place-items-center text-center">
        {/* AHHHH — gold 3D letters fly in horizontally fast */}
        <h2
          aria-hidden="true"
          className="jb3-text-3d relative z-[2] flex justify-center gap-1 sm:gap-2"
          style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: 900,
            letterSpacing: "0.02em",
            fontSize: "clamp(4.5rem, 22vw, 18rem)",
            lineHeight: 0.92,
          }}
        >
          {ahhLetters.map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, x: 240, skewX: -22 }}
              animate={play ? { opacity: 1, x: 0, skewX: 0 } : { opacity: 0, x: 240, skewX: -22 }}
              transition={{ type: "spring", stiffness: 620, damping: 18, mass: 0.65, delay: play ? i * 0.05 : 0 }}
              className="inline-block"
              suppressHydrationWarning
            >
              {ch}
            </motion.span>
          ))}
        </h2>
        {/* Visually-hidden equivalent for screen readers */}
        <span className="sr-only">Ahhh — feel the joy of cashback.</span>

        {/* feel the joy of cashback — word by word fast */}
        <p
          aria-hidden="true"
          className="relative z-[2] mt-6 flex flex-wrap justify-center gap-x-0 gap-y-0 text-[#ffe28a] sm:mt-10"
          style={{
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontWeight: 700,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontSize: "clamp(1rem, 3.4vw, 2.6rem)",
            textShadow: "0 0 16px rgba(245,185,69,0.8), 0 0 36px rgba(245,140,40,0.5)",
          }}
        >
          {taglineChars.map((ch, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, x: 110 }}
              animate={play ? { opacity: 1, x: 0 } : { opacity: 0, x: 110 }}
              transition={{ type: "spring", stiffness: 540, damping: 24, delay: play ? 0.48 + i * 0.022 : 0 }}
              className="inline-block"
              suppressHydrationWarning
            >
              {ch === " " ? "\u00A0" : ch}
            </motion.span>
          ))}
        </p>

        {/* owner's Happy Shoppers illustration — soft glow halo + gentle float */}
        <div aria-hidden="true" className="jb3-actor relative z-[1] mt-2 sm:mt-4">
          <div className="jb3-jumper-stage">
            <div className="jb3-img-human-wrap">
              <div className="jb3-img-glow" />
              <img src="/illustrations/joy-shoppers.png" alt="" className="jb3-img-human" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
