"use client";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Animated illustration for the Telegram CTA box. Replaces the static
 * /images/telegram-cta-bg.png image. Pure SVG + framer-motion: spinning
 * orbital ring, pulsing planet, trails of paper-plane chips drifting
 * upward like Telegram message glyphs.
 */
export default function AnimatedTelegramBox() {
  const reduced = useReducedMotion();
  return (
    <div
      aria-hidden="true"
      className="absolute inset-0 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse at 30% 50%, rgba(167,139,250,0.28), transparent 55%)," +
          "radial-gradient(ellipse at 75% 60%, rgba(34,211,238,0.32), transparent 55%)," +
          "linear-gradient(135deg, #0a0c14 0%, #1a1228 60%, #0a0c14 100%)",
      }}
    >
      {/* drifting message-plane glyphs */}
      {!reduced && (
        <div className="absolute inset-0">
          {Array.from({ length: 7 }).map((_, i) => {
            const left = 8 + i * 13;
            const dur = 9 + (i % 4) * 2.2;
            const delay = (i * 1.1).toFixed(2);
            return (
              <motion.svg
                key={i}
                width="22"
                height="22"
                viewBox="0 0 24 24"
                className="absolute opacity-60"
                style={{ left: `${left}%`, bottom: "-12%" }}
                animate={{ y: ["0%", "-720%"], opacity: [0, 0.85, 0.65, 0] }}
                transition={{ duration: dur, delay: parseFloat(delay), repeat: Infinity, ease: "easeOut" }}
              >
                <path d="M22 2 11 13" stroke="#7be7ff" strokeWidth="1.6" strokeLinecap="round" />
                <path d="M22 2 15 22 11 13 2 9z" stroke="#b196ff" strokeWidth="1.6" strokeLinejoin="round" fill="none" />
              </motion.svg>
            );
          })}
        </div>
      )}

      {/* orbital ring around right side */}
      <motion.div
        className="absolute right-[10%] top-1/2 h-[90%] w-[90%] -translate-y-1/2 rounded-full border border-white/10"
        style={{ aspectRatio: "1/1", maxHeight: "520px", maxWidth: "520px" }}
        animate={reduced ? {} : { rotate: 360 }}
        transition={reduced ? {} : { duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <span className="absolute left-1/2 top-0 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-300 shadow-[0_0_30px_#67e8f9]" />
        <span className="absolute right-0 top-1/2 h-2 w-2 -translate-y-1/2 translate-x-1/2 rounded-full bg-violet-300 shadow-[0_0_22px_#a78bfa]" />
        <span className="absolute bottom-0 left-1/2 h-2.5 w-2.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-amber-300 shadow-[0_0_24px_#ffd06b]" />
      </motion.div>

      {/* central planet */}
      <motion.div
        className="absolute right-[16%] top-1/2 h-40 w-40 -translate-y-1/2 rounded-full sm:h-52 sm:w-52"
        animate={reduced ? {} : { scale: [1, 1.06, 1], opacity: [0.85, 1, 0.85] }}
        transition={reduced ? {} : { duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{
          background:
            "radial-gradient(circle at 30% 28%, rgba(255,255,255,0.95), rgba(167,139,250,0.55) 40%, rgba(34,211,238,0.35) 70%, transparent 100%)",
          boxShadow:
            "0 0 80px 30px rgba(167,139,250,0.35), 0 0 140px 60px rgba(34,211,238,0.18), inset 0 0 40px rgba(255,255,255,0.4)",
        }}
      />

      {/* tilted gradient overlay so text reads */}
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950/95 via-ink-950/55 to-transparent" />
    </div>
  );
}
