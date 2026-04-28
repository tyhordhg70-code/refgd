"use client";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Animated illustration for the Telegram CTA box. Pure SVG + framer-motion.
 * Layers (back→front):
 *   1. Soft mesh gradient backdrop
 *   2. A field of slowly drifting twinkle stars
 *   3. Two counter-rotating concentric orbital rings with chip beads
 *   4. Central pulsating planet with light highlight
 *   5. Trails of paper-plane glyphs that float upward, plus blue chat
 *      bubble glyphs that drift in from the side
 *   6. A short ambient sweep of light across the box every few seconds
 * The whole composition is more dimensional & alive than the previous
 * version, which only had a single ring + planet.
 */
export default function AnimatedTelegramBox() {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
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
      {Array.from({ length: 36 }).map((_, i) => {
        const left = (i * 37) % 100;
        const top = (i * 53) % 100;
        const size = 1 + (i % 3);
        const dur = 2 + (i % 5) * 0.6;
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
            animate={reduced ? {} : { opacity: [0.2, 0.95, 0.2], scale: [0.6, 1.3, 0.6] }}
            transition={reduced ? {} : { duration: dur, repeat: Infinity, delay: (i % 7) * 0.3, ease: "easeInOut" }}
          />
        );
      })}

      {/* ───── 2. CHAT BUBBLES drifting from left ───── */}
      {!reduced &&
        Array.from({ length: 4 }).map((_, i) => {
          const top = 20 + i * 20;
          const dur = 11 + i * 1.5;
          const delay = i * 2.4;
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
      {!reduced && (
        <div className="absolute inset-0">
          {Array.from({ length: 9 }).map((_, i) => {
            const left = 6 + i * 11;
            const dur = 8 + (i % 4) * 2.2;
            const delay = (i * 0.9).toFixed(2);
            const sway = i % 2 === 0 ? 18 : -22;
            return (
              <motion.svg
                key={`pp-${i}`}
                width="24"
                height="24"
                viewBox="0 0 24 24"
                className="absolute"
                style={{
                  left: `${left}%`,
                  bottom: "-14%",
                  filter: "drop-shadow(0 0 6px rgba(123,231,255,0.55))",
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

      {/* ───── 4. OUTER ORBITAL RING — clockwise ───── */}
      <motion.div
        className="absolute right-[6%] top-[68%] h-[80%] w-[80%] -translate-y-1/2 rounded-full border border-white/10 sm:right-[10%] sm:top-1/2 sm:h-[100%] sm:w-[100%]"
        style={{ aspectRatio: "1/1", maxHeight: "560px", maxWidth: "560px" }}
        animate={reduced ? {} : { rotate: 360 }}
        transition={reduced ? {} : { duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_30px_#67e8f9]" />
        <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-violet-300 shadow-[0_0_22px_#a78bfa]" />
        <span className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_24px_#ffd06b]" />
        <span className="absolute left-0 top-1/2 h-2 w-2 -translate-y-1/2 -translate-x-1/2 rounded-full bg-fuchsia-300 shadow-[0_0_22px_#f0abfc]" />
      </motion.div>

      {/* ───── INNER ORBITAL RING — counter-clockwise ───── */}
      <motion.div
        className="absolute right-[12%] top-[68%] h-[52%] w-[52%] -translate-y-1/2 rounded-full border border-white/10 sm:right-[16%] sm:top-1/2 sm:h-[64%] sm:w-[64%]"
        style={{ aspectRatio: "1/1", maxHeight: "360px", maxWidth: "360px" }}
        animate={reduced ? {} : { rotate: -360 }}
        transition={reduced ? {} : { duration: 38, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200 shadow-[0_0_18px_#ffe28a]" />
        <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-cyan-200 shadow-[0_0_18px_#7be7ff]" />
      </motion.div>

      {/* ───── 5. CENTRAL PLANET — pulses + holds steady ───── */}
      <motion.div
        className="absolute right-[12%] top-[68%] h-32 w-32 -translate-y-1/2 rounded-full sm:right-[16%] sm:top-1/2 sm:h-44 sm:w-44 md:h-56 md:w-56"
        animate={reduced ? {} : { scale: [1, 1.07, 1], opacity: [0.85, 1, 0.85] }}
        transition={reduced ? {} : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.95), rgba(167,139,250,0.62) 40%, rgba(34,211,238,0.40) 75%, transparent 100%)",
          boxShadow:
            "0 0 90px 36px rgba(167,139,250,0.40), 0 0 160px 70px rgba(34,211,238,0.22), inset 0 0 50px rgba(255,255,255,0.5)",
        }}
      />
      {/* highlight */}
      <motion.div
        className="absolute right-[16%] top-[64%] h-8 w-8 rounded-full sm:right-[18%] sm:top-[44%] sm:h-12 sm:w-12"
        animate={reduced ? {} : { opacity: [0.6, 1, 0.6] }}
        transition={reduced ? {} : { duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background: "radial-gradient(circle, rgba(255,255,255,0.95), transparent 70%)",
          mixBlendMode: "screen",
        }}
      />

      {/* ───── 6. AMBIENT SWEEP OF LIGHT every few seconds ───── */}
      {!reduced && (
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
