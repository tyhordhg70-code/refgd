"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/**
 * Animated illustration for the Telegram CTA box. Pure SVG + framer-motion.
 *
 * ── Mobile philosophy ────────────────────────────────────────────
 *
 * The previous mobile path tried to keep almost every desktop layer
 * running concurrently — twinkling stars, two counter-rotating
 * orbital rings with halos, a pulsating planet, drifting chat
 * bubbles, paper-plane trails, an ambient sweep — AND mounted two
 * scroll-jacking handlers (a wheel anti-skip + a 1.5 s rAF touch
 * monitor). The result on real iOS Safari was visible jankiness:
 * the box appeared late, animations stuttered, and a fast scroll
 * could blow past the box because the scroll-jacker's smooth-
 * scrollTo competed with the OS compositor.
 *
 * This rewrite:
 *   • Removes BOTH JS scroll handlers entirely. The page uses
 *     CSS scroll-snap on the telegram <section> instead (see
 *     globals.css `#telegram-snap`), which is hardware-accelerated
 *     and never fights the OS scroll.
 *   • Drops the per-frame mobile animations: chat bubbles, paper
 *     planes and the ambient sweep are off on mobile. The single
 *     remaining motion layer is the OUTER orbital ring, slowed to
 *     a 120 s rotation. Twinkle stars are kept but cut from 14 to
 *     8 with a longer base period.
 *   • Planet is static on mobile (no infinite pulse); the radial
 *     gradient + a smaller box-shadow give the same "glowing
 *     planet" feel without paying the per-frame compositor cost.
 *
 * Reduced-motion users still get the static `lite` variant.
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

  // `lite` covers prefers-reduced-motion. Mobile is its own slim
  // path that still uses framer-motion for one or two layers.
  const lite = reduced;
  const starCount = isMobile ? 8 : 36;
  const bubbleCount = isMobile ? 0 : 4;
  const planeCount = isMobile ? 0 : 9;

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
        const dur = 3.5 + (i % 5) * 0.9;
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
              boxShadow: `0 0 ${size * 4}px rgba(255,255,255,0.65)`,
            }}
            animate={{ opacity: [0.25, 0.9, 0.25] }}
            transition={{ duration: dur, repeat: Infinity, delay: (i % 7) * 0.4, ease: "easeInOut" }}
          />
        );
      })}

      {/* ───── 2. CHAT BUBBLES — desktop only ───── */}
      {!lite && bubbleCount > 0 &&
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

      {/* ───── 3. PAPER-PLANE GLYPHS — desktop only ───── */}
      {!lite && planeCount > 0 && (
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
           Mobile: kept (one ring is fine on the GPU) but slowed to
           120s rotation and bead halos trimmed. Desktop unchanged. */}
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
          style={{ aspectRatio: "1/1", maxHeight: "560px", maxWidth: "560px" }}
          animate={{ rotate: 360 }}
          transition={{ duration: isMobile ? 120 : 60, repeat: Infinity, ease: "linear" }}
        >
          <span className={`absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 ${isMobile ? "shadow-[0_0_12px_#67e8f9]" : "shadow-[0_0_30px_#67e8f9]"}`} />
          <span className={`absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-violet-300 ${isMobile ? "shadow-[0_0_10px_#a78bfa]" : "shadow-[0_0_22px_#a78bfa]"}`} />
          <span className={`absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-amber-300 ${isMobile ? "shadow-[0_0_12px_#ffd06b]" : "shadow-[0_0_24px_#ffd06b]"}`} />
          <span className={`absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-fuchsia-300 ${isMobile ? "shadow-[0_0_10px_#f0abfc]" : "shadow-[0_0_22px_#f0abfc]"}`} />
        </motion.div>
      )}

      {/* ───── INNER ORBITAL RING — desktop only ─────
           On mobile we drop the inner ring entirely. With the outer
           ring + planet + 8 stars there's already enough visual life
           and one rotating ring is all the GPU should be asked for. */}
      {lite ? (
        <div
          className="absolute right-[12%] top-[68%] h-[52%] w-[52%] -translate-y-1/2 rounded-full border border-white/10 sm:right-[16%] sm:top-1/2 sm:h-[64%] sm:w-[64%]"
          style={{ aspectRatio: "1/1", maxHeight: "360px", maxWidth: "360px" }}
        >
          <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200 shadow-[0_0_18px_#ffe28a]" />
          <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-cyan-200 shadow-[0_0_18px_#7be7ff]" />
        </div>
      ) : (
        !isMobile && (
          <motion.div
            className="absolute right-[12%] top-[68%] h-[52%] w-[52%] -translate-y-1/2 rounded-full border border-white/10 sm:right-[16%] sm:top-1/2 sm:h-[64%] sm:w-[64%]"
            style={{ aspectRatio: "1/1", maxHeight: "360px", maxWidth: "360px" }}
            animate={{ rotate: -360 }}
            transition={{ duration: 38, repeat: Infinity, ease: "linear" }}
          >
            <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200 shadow-[0_0_18px_#ffe28a]" />
            <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-cyan-200 shadow-[0_0_18px_#7be7ff]" />
          </motion.div>
        )
      )}

      {/* ───── 5. CENTRAL PLANET ─────
           Mobile: STATIC. The radial-gradient + a tight box-shadow
           do all the visual work. No infinite scale animation =
           zero per-frame paint cost on phones. */}
      {(lite || isMobile) ? (
        <div
          className="absolute right-[12%] top-[68%] h-28 w-28 -translate-y-1/2 rounded-full sm:right-[16%] sm:top-1/2 sm:h-44 sm:w-44 md:h-56 md:w-56"
          style={{
            background:
              "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.95), rgba(167,139,250,0.62) 40%, rgba(34,211,238,0.40) 75%, transparent 100%)",
            boxShadow:
              "0 0 50px 14px rgba(167,139,250,0.32), inset 0 0 25px rgba(255,255,255,0.4)",
          }}
        />
      ) : (
        <motion.div
          className="absolute right-[12%] top-[68%] h-32 w-32 -translate-y-1/2 rounded-full sm:right-[16%] sm:top-1/2 sm:h-44 sm:w-44 md:h-56 md:w-56"
          animate={{ scale: [1, 1.07, 1], opacity: [0.85, 1, 0.85] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
          style={{
            background:
              "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.95), rgba(167,139,250,0.62) 40%, rgba(34,211,238,0.40) 75%, transparent 100%)",
            boxShadow:
              "0 0 90px 36px rgba(167,139,250,0.40), 0 0 160px 70px rgba(34,211,238,0.22), inset 0 0 50px rgba(255,255,255,0.5)",
            willChange: "transform, opacity",
          }}
        />
      )}

      {/* highlight — desktop only (mix-blend-mode is expensive on
          mobile compositors). */}
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

      {/* ───── 6. AMBIENT SWEEP — desktop only ───── */}
      {!lite && !isMobile && (
        <motion.div
          className="absolute inset-0"
          animate={{ x: ["-30%", "130%"], opacity: [0, 0.55, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", repeatDelay: 2 }}
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
