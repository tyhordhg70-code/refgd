"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Animated illustration for the Telegram CTA box. Pure SVG + framer-motion.
 *
 * Layers (back→front):
 *   1. Soft mesh gradient backdrop
 *   2. A field of slowly drifting twinkle stars
 *   3. Two counter-rotating concentric orbital rings with chip beads
 *   4. Central pulsating planet with light highlight
 *   5. Trails of paper-plane glyphs that float upward, plus blue chat
 *      bubble glyphs that drift in from the side
 *   6. A short ambient sweep of light across the box every few seconds
 *
 * ── Mobile mode (RESTORED at user's explicit request) ────────────
 *
 * The user demanded the telegram box animation be brought back. The
 * previous mobile path stripped almost every animated layer to a
 * static dot field — visually flat. This rewrite RESTORES the rings,
 * the planet pulse, the orbital beads, the paper-plane trail, the
 * chat-bubble drift and the ambient sweep on mobile, with phone-
 * specific cost reductions that keep the box readable & smooth:
 *
 *   • Star count: mobile 14 (was 36 desktop / 4 lite). Stars still
 *     twinkle through framer-motion but with a longer base period
 *     so per-frame React work is light.
 *   • Outer ring: mobile keeps the full rotating ring with all 4
 *     coloured beads — same beads as desktop, slightly smaller
 *     box-shadow halos (16-20 px vs 22-30 px) so the compositor's
 *     repaint area on every spin frame is smaller.
 *   • Inner ring: mobile keeps the counter-rotating ring + 2 beads.
 *     Halo radii also trimmed to 14 px.
 *   • Planet: mobile gets a slower, smaller-amplitude pulse
 *     (scale 1→1.04→1 over 7 s vs 1→1.07→1 over 5 s on desktop)
 *     and a single mid-sized box-shadow (60px/18px) — half the
 *     spread of the desktop double-shadow but visually the same
 *     "glowing planet" feel because the radial gradient on the
 *     planet itself does most of the work.
 *   • Paper planes: mobile keeps 4 (was 9 desktop / 0 lite).
 *   • Chat bubbles: mobile keeps 2 (was 4 desktop / 0 lite).
 *   • Ambient sweep: mobile keeps it. It's a single linear-gradient
 *     translateX which is dirt cheap on the GPU.
 *   • Highlight blob: dropped on mobile only because mix-blend-mode:
 *     screen forces a compositor blend pass that's expensive on
 *     phones for negligible visual gain at this size.
 *
 * Reduced-motion users get the static `lite` variant of every layer.
 */
export default function AnimatedTelegramBox() {
  const reduced = useReducedMotion();
  const [isMobile, setIsMobile] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(max-width: 768px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // ── MOBILE-ONLY SCROLL SNAP TO TELEGRAM SECTION ──────────────
  // The user reported: "hard scroll past cards skips telegram".
  // When a fast wheel burst arrives while the telegram box is
  // even partially in viewport, the browser would otherwise blow
  // straight past it to the footer. We catch that here: if the
  // telegram box is at all visible AND a forward wheel of more
  // than 200 px arrives, we preventDefault and smooth-scroll
  // to land the box exactly in viewport. Subsequent wheel ticks
  // (after a short cooldown) pass through normally so the user
  // can keep scrolling.
  useEffect(() => {
    if (!isMobile) return;
    if (typeof window === "undefined") return;
    let cooldownUntil = 0;
    function onWheel(e: WheelEvent) {
      const root = rootRef.current;
      if (!root) return;
      // Find the actual scroll-target = the nearest <section>
      // ancestor. The section wraps the telegram block in
      // app/page.tsx and has natural padding above the box.
      const section = root.closest("section");
      if (!section) return;
      const r = section.getBoundingClientRect();
      const vh = window.innerHeight;
      // Only intercept when the section is at least partly in
      // view (so we don't disrupt other scrolls on the page).
      const visible = r.bottom > 80 && r.top < vh - 80;
      if (!visible) return;
      // Skip tiny inertia ticks.
      if (Math.abs(e.deltaY) < 200) return;
      const now = performance.now();
      if (now < cooldownUntil) {
        // We're still inside the cooldown after the last snap —
        // absorb so a multi-event hard burst can't blow past.
        e.preventDefault();
        return;
      }
      // Forward burst that would scroll past the section: snap.
      const sectionTop = Math.round(r.top + window.scrollY);
      // Aim for the section's top to sit just below the page
      // header (~ 8 % of viewport leaves room for breathing).
      const targetY = Math.max(0, sectionTop - Math.round(vh * 0.08));
      const dist = Math.abs(window.scrollY - targetY);
      if (dist < 32) return; // already there
      e.preventDefault();
      window.scrollTo({ top: targetY, behavior: "smooth" });
      cooldownUntil = now + 900;
    }
    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [isMobile]);

  // `lite` is now ONLY for prefers-reduced-motion. Mobile users
  // get the full animated experience (with mobile-specific cost
  // reductions baked into each layer below).
  const lite = reduced;
  const starCount = isMobile ? 14 : 36;
  const bubbleCount = isMobile ? 2 : 4;
  const planeCount = isMobile ? 4 : 9;

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      data-testid="animated-telegram-box"
      className="absolute inset-0 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 25% 50%, rgba(167,139,250,0.32), transparent 55%)," +
          "radial-gradient(ellipse at 78% 60%, rgba(34,211,238,0.36), transparent 55%)," +
          "radial-gradient(ellipse at 50% 110%, rgba(245,185,69,0.18), transparent 55%)," +
          "linear-gradient(135deg, #08080f 0%, #1a1228 60%, #08080f 100%)",
      }}
    >
      {/* ───── 1. TWINKLE STAR FIELD ───── */}
      {Array.from({ length: starCount }).map((_, i) => {
        const left = (i * 37) % 100;
        const top = (i * 53) % 100;
        const size = 1 + (i % 3);
        const dur = 2.5 + (i % 5) * 0.8;
        if (lite) {
          return (
            <span
              key={`star-${i}`}
              className="absolute rounded-full bg-white"
              style={{
                left: `${left}%`,
                top: `${top}%`,
                width: size,
                height: size,
                opacity: 0.65,
                boxShadow: `0 0 ${size * 4}px rgba(255,255,255,0.55)`,
              }}
            />
          );
        }
        return (
          <motion.span
            key={`star-${i}`}
            className="absolute rounded-full bg-white"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: size,
              height: size,
              boxShadow: `0 0 ${size * 5}px rgba(255,255,255,0.7)`,
            }}
            animate={{ opacity: [0.2, 0.95, 0.2], scale: [0.6, 1.3, 0.6] }}
            transition={{ duration: dur, repeat: Infinity, delay: (i % 7) * 0.3, ease: "easeInOut" }}
          />
        );
      })}

      {/* ───── 2. CHAT BUBBLES drifting from left ───── */}
      {!lite &&
        Array.from({ length: bubbleCount }).map((_, i) => {
          const top = 22 + i * 30;
          const dur = 12 + i * 2;
          const delay = i * 3;
          return (
            <motion.svg
              key={`bub-${i}`}
              width="34"
              height="28"
              viewBox="0 0 34 28"
              className="absolute opacity-70"
              style={{ top: `${top}%`, left: "-8%" }}
              animate={{ x: ["0%", "1400%"], opacity: [0, 0.85, 0.85, 0] }}
              transition={{ duration: dur, delay, repeat: Infinity, ease: "linear" }}
            >
              <path
                d="M3 4 a3 3 0 0 1 3 -3 h22 a3 3 0 0 1 3 3 v12 a3 3 0 0 1 -3 3 h-13 l-7 6 v-6 h-2 a3 3 0 0 1 -3 -3 z"
                fill="rgba(34,211,238,0.18)"
                stroke="#7be7ff"
                strokeWidth="1.2"
              />
              <circle cx="13" cy="11" r="1.4" fill="#7be7ff" />
              <circle cx="17" cy="11" r="1.4" fill="#7be7ff" />
              <circle cx="21" cy="11" r="1.4" fill="#7be7ff" />
            </motion.svg>
          );
        })}

      {/* ───── 3. PAPER-PLANE GLYPHS rising up ───── */}
      {!lite && (
        <div className="absolute inset-0">
          {Array.from({ length: planeCount }).map((_, i) => {
            const left = 6 + i * (88 / Math.max(1, planeCount - 1));
            const dur = 9 + (i % 4) * 2.2;
            const delay = (i * 1.3).toFixed(2);
            const sway = i % 2 === 0 ? 18 : -22;
            return (
              <motion.svg
                key={`pp-${i}`}
                width="22"
                height="22"
                viewBox="0 0 24 24"
                className="absolute"
                style={{
                  left: `${left}%`,
                  bottom: "-14%",
                  filter: "drop-shadow(0 0 5px rgba(123,231,255,0.50))",
                }}
                animate={{
                  y: ["0%", "-720%"],
                  x: ["0%", `${sway}%`, "0%"],
                  opacity: [0, 0.95, 0.7, 0],
                  rotate: [0, 8, -4, 0],
                }}
                transition={{ duration: dur, delay: parseFloat(delay), repeat: Infinity, ease: "easeOut" }}
              >
                <path d="M22 2 11 13" stroke="#7be7ff" strokeWidth="1.8" strokeLinecap="round" />
                <path d="M22 2 15 22 11 13 2 9z" stroke="#b196ff" strokeWidth="1.8" strokeLinejoin="round" fill="rgba(123,231,255,0.10)" />
              </motion.svg>
            );
          })}
        </div>
      )}

      {/* ───── 4. OUTER ORBITAL RING — clockwise ─────
           Mobile keeps the rotating ring (was static-only in the
           previous "lite" mobile path). Bead halos trimmed to keep
           the per-spin-frame compositor cost down. */}
      {lite ? (
        <div
          className="absolute right-[6%] top-[68%] h-[80%] w-[80%] -translate-y-1/2 rounded-full border border-white/10 sm:right-[10%] sm:top-1/2 sm:h-[100%] sm:w-[100%]"
          style={{ aspectRatio: "1/1", maxHeight: "560px", maxWidth: "560px" }}
        >
          <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_30px_#67e8f9]" />
          <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-violet-300 shadow-[0_0_22px_#a78bfa]" />
          <span className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_24px_#ffd06b]" />
          <span className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-fuchsia-300 shadow-[0_0_22px_#f0abfc]" />
        </div>
      ) : (
        <motion.div
          className="absolute right-[6%] top-[68%] h-[80%] w-[80%] -translate-y-1/2 rounded-full border border-white/10 sm:right-[10%] sm:top-1/2 sm:h-[100%] sm:w-[100%]"
          style={{ aspectRatio: "1/1", maxHeight: "560px", maxWidth: "560px", willChange: "transform" }}
          animate={{ rotate: 360 }}
          transition={{ duration: isMobile ? 80 : 60, repeat: Infinity, ease: "linear" }}
        >
          <span className={`absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 ${isMobile ? "shadow-[0_0_18px_#67e8f9]" : "shadow-[0_0_30px_#67e8f9]"}`} />
          <span className={`absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-violet-300 ${isMobile ? "shadow-[0_0_14px_#a78bfa]" : "shadow-[0_0_22px_#a78bfa]"}`} />
          <span className={`absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-amber-300 ${isMobile ? "shadow-[0_0_16px_#ffd06b]" : "shadow-[0_0_24px_#ffd06b]"}`} />
          <span className={`absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-fuchsia-300 ${isMobile ? "shadow-[0_0_14px_#f0abfc]" : "shadow-[0_0_22px_#f0abfc]"}`} />
        </motion.div>
      )}

      {/* ───── INNER ORBITAL RING — counter-clockwise ───── */}
      {lite ? (
        <div
          className="absolute right-[12%] top-[68%] h-[52%] w-[52%] -translate-y-1/2 rounded-full border border-white/10 sm:right-[16%] sm:top-1/2 sm:h-[64%] sm:w-[64%]"
          style={{ aspectRatio: "1/1", maxHeight: "360px", maxWidth: "360px" }}
        >
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200 shadow-[0_0_18px_#ffe28a]" />
          <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-cyan-200 shadow-[0_0_18px_#7be7ff]" />
        </div>
      ) : (
        <motion.div
          className="absolute right-[12%] top-[68%] h-[52%] w-[52%] -translate-y-1/2 rounded-full border border-white/10 sm:right-[16%] sm:top-1/2 sm:h-[64%] sm:w-[64%]"
          style={{ aspectRatio: "1/1", maxHeight: "360px", maxWidth: "360px", willChange: "transform" }}
          animate={{ rotate: -360 }}
          transition={{ duration: isMobile ? 50 : 38, repeat: Infinity, ease: "linear" }}
        >
          <span className={`absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200 ${isMobile ? "shadow-[0_0_12px_#ffe28a]" : "shadow-[0_0_18px_#ffe28a]"}`} />
          <span className={`absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-cyan-200 ${isMobile ? "shadow-[0_0_12px_#7be7ff]" : "shadow-[0_0_18px_#7be7ff]"}`} />
        </motion.div>
      )}

      {/* ───── 5. CENTRAL PLANET ─────
           Mobile gets a SLOWER, SMALLER pulse (1→1.04→1 over 7 s
           vs the desktop 1→1.07→1 over 5 s) so the per-frame
           recompute area on the planet's box-shadow is smaller
           and the loop completes a full pulse less often. The
           radial gradient on the planet itself does the heavy
           visual lifting. */}
      {lite ? (
        <div
          className="absolute right-[12%] top-[68%] h-28 w-28 -translate-y-1/2 rounded-full sm:right-[16%] sm:top-1/2 sm:h-44 sm:w-44 md:h-56 md:w-56"
          style={{
            background:
              "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.95), rgba(167,139,250,0.62) 40%, rgba(34,211,238,0.40) 75%, transparent 100%)",
            boxShadow:
              "0 0 60px 18px rgba(167,139,250,0.32), inset 0 0 30px rgba(255,255,255,0.4)",
          }}
        />
      ) : (
        <motion.div
          className="absolute right-[12%] top-[68%] h-32 w-32 -translate-y-1/2 rounded-full sm:right-[16%] sm:top-1/2 sm:h-44 sm:w-44 md:h-56 md:w-56"
          animate={
            isMobile
              ? { scale: [1, 1.04, 1], opacity: [0.88, 1, 0.88] }
              : { scale: [1, 1.07, 1], opacity: [0.85, 1, 0.85] }
          }
          transition={{ duration: isMobile ? 7 : 5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background:
              "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.95), rgba(167,139,250,0.62) 40%, rgba(34,211,238,0.40) 75%, transparent 100%)",
            // Mobile: single mid-sized shadow vs desktop's double
            // shadow. Visual delta is small, paint cost ~halved.
            boxShadow: isMobile
              ? "0 0 60px 18px rgba(167,139,250,0.34), inset 0 0 30px rgba(255,255,255,0.5)"
              : "0 0 90px 36px rgba(167,139,250,0.40), 0 0 160px 70px rgba(34,211,238,0.22), inset 0 0 50px rgba(255,255,255,0.5)",
            willChange: "transform, opacity",
          }}
        />
      )}
      {/* highlight — mix-blend-mode: screen is expensive on mobile
           compositors so we drop it there. Desktop visual unchanged. */}
      {!lite && !isMobile && (
        <motion.div
          className="absolute right-[16%] top-[64%] h-8 w-8 rounded-full sm:right-[18%] sm:top-[44%] sm:h-12 sm:w-12"
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background: "radial-gradient(circle, rgba(255,255,255,0.95), transparent 70%)",
            mixBlendMode: "screen",
          }}
        />
      )}

      {/* ───── 6. AMBIENT SWEEP OF LIGHT every few seconds ───── */}
      {!lite && (
        <motion.div
          className="absolute inset-0"
          animate={{ x: ["-30%", "130%"], opacity: [0, 0.55, 0] }}
          transition={{ duration: isMobile ? 8 : 6, repeat: Infinity, ease: "easeInOut", repeatDelay: isMobile ? 3 : 2 }}
          style={{
            background:
              "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
          }}
        />
      )}

      {/* tilted gradient overlay so text reads — vertical fade on
          mobile (text top, planet bottom), horizontal on ≥sm. */}
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/95 via-ink-950/60 to-transparent sm:bg-gradient-to-r sm:from-ink-950/95 sm:via-ink-950/55 sm:to-transparent" />
    </div>
  );
}
