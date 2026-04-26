"use client";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Animated illustration for the "Stop wasting time and money" line.
 * Visual metaphor: an hourglass whose falling sand morphs into coins;
 * a clock face spins backwards (time reclaimed); cash bills evaporate
 * upward into sparkles. Compact (sized for a side column).
 */
export default function MoneyTimeScene({
  size = 360,
  className = "",
}: {
  size?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none relative ${className}`}
      style={{ width: size, height: size }}
    >
      {/* HALO */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle at 50% 50%, rgba(167,139,250,0.30), rgba(255,208,107,0.14) 40%, transparent 70%)",
          filter: "blur(32px)",
        }}
      />

      {/* CLOCK FACE — slow reverse spin (time reclaimed) */}
      <motion.div
        className="absolute"
        style={{
          left: "12%",
          top: "16%",
          width: "44%",
          height: "44%",
        }}
        animate={reduced ? {} : { rotate: -360 }}
        transition={reduced ? {} : { duration: 28, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          <defs>
            <radialGradient id="mt-clock" cx="50%" cy="40%" r="60%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
              <stop offset="100%" stopColor="rgba(7,6,12,0.92)" />
            </radialGradient>
            <linearGradient id="mt-rim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#ffe28a" />
              <stop offset="100%" stopColor="#a78bfa" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="90" fill="url(#mt-clock)" stroke="url(#mt-rim)" strokeWidth="3" />
          {/* hour ticks — round to fixed precision so SSR/CSR strings
              match exactly (was triggering hydration mismatches like
              y1 "32.4500185048138" vs "32.45001850481381"). */}
          {Array.from({ length: 12 }).map((_, i) => {
            const a = (i / 12) * Math.PI * 2;
            const r = (n: number) => Number(n.toFixed(3));
            const x1 = r(100 + Math.cos(a) * 78);
            const y1 = r(100 + Math.sin(a) * 78);
            const x2 = r(100 + Math.cos(a) * 88);
            const y2 = r(100 + Math.sin(a) * 88);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#ffe28a" strokeWidth={i % 3 === 0 ? 3 : 1.5} />;
          })}
          <circle cx="100" cy="100" r="6" fill="#ffe28a" />
        </svg>
      </motion.div>

      {/* CLOCK HANDS spin backwards faster */}
      <motion.div
        className="absolute"
        style={{ left: "12%", top: "16%", width: "44%", height: "44%" }}
        animate={reduced ? {} : { rotate: -360 * 6 }}
        transition={reduced ? {} : { duration: 14, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          <line x1="100" y1="100" x2="100" y2="40" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" />
        </svg>
      </motion.div>
      <motion.div
        className="absolute"
        style={{ left: "12%", top: "16%", width: "44%", height: "44%" }}
        animate={reduced ? {} : { rotate: -360 }}
        transition={reduced ? {} : { duration: 60, repeat: Infinity, ease: "linear" }}
      >
        <svg viewBox="0 0 200 200" width="100%" height="100%">
          <line x1="100" y1="100" x2="100" y2="56" stroke="#a78bfa" strokeWidth="4" strokeLinecap="round" />
        </svg>
      </motion.div>

      {/* HOURGLASS — right side */}
      <motion.div
        className="absolute"
        style={{ right: "8%", top: "12%", width: "40%", height: "62%" }}
        animate={reduced ? {} : { rotate: [0, 0, 180, 180, 0] }}
        transition={reduced ? {} : { duration: 14, repeat: Infinity, ease: "easeInOut", times: [0, 0.45, 0.5, 0.95, 1] }}
      >
        <svg viewBox="0 0 200 280" width="100%" height="100%">
          <defs>
            <linearGradient id="mt-glass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fff8e6" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.55" />
            </linearGradient>
          </defs>
          {/* frame */}
          <rect x="20" y="10" width="160" height="14" rx="4" fill="#a78bfa" />
          <rect x="20" y="256" width="160" height="14" rx="4" fill="#ffd06b" />
          {/* glass bulbs */}
          <path d="M40 24 L160 24 L110 140 L160 256 L40 256 L90 140 Z"
                fill="url(#mt-glass)" stroke="#ffe28a" strokeWidth="2" />
          {/* Top sand */}
          <path d="M55 32 L145 32 L108 130 L92 130 Z" fill="#ffd06b" opacity="0.9" />
          {/* Bottom coin pile */}
          <ellipse cx="100" cy="240" rx="44" ry="6" fill="#ffd06b" />
          <ellipse cx="100" cy="232" rx="36" ry="5" fill="#f5b945" />
          <ellipse cx="100" cy="225" rx="28" ry="4" fill="#ffd06b" />
        </svg>
      </motion.div>

      {/* FALLING COINS (continuous stream center→bottom-right) */}
      {!reduced &&
        Array.from({ length: 6 }).map((_, i) => {
          const startDelay = i * 0.7;
          return (
            <motion.svg
              key={`coin-fall-${i}`}
              width="22" height="22" viewBox="0 0 24 24"
              className="absolute"
              style={{ left: "55%", top: "30%" }}
              animate={{ y: [0, 130], x: [0, 12 - i * 2], opacity: [0, 1, 0], rotate: [0, 360] }}
              transition={{ duration: 2.2, delay: startDelay, repeat: Infinity, ease: "easeIn" }}
            >
              <circle cx="12" cy="12" r="10" fill="#ffd06b" stroke="#a26815" strokeWidth="1" />
              <text x="12" y="16" textAnchor="middle" fontSize="13" fontWeight="800" fontFamily="Clash Display, system-ui" fill="#3a2204">$</text>
            </motion.svg>
          );
        })}

      {/* RISING SPARKLES (money turning into joy) */}
      {!reduced &&
        Array.from({ length: 10 }).map((_, i) => {
          const left = 10 + i * 9;
          const dur = 4 + (i % 3) * 0.8;
          const delay = (i * 0.4).toFixed(2);
          const color = i % 2 === 0 ? "#ffe28a" : "#a78bfa";
          return (
            <motion.span
              key={`sp-${i}`}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{ left: `${left}%`, bottom: "10%", background: color, boxShadow: `0 0 12px ${color}` }}
              animate={{ y: [0, -180], opacity: [0, 1, 0], scale: [0.6, 1.2, 0.4] }}
              transition={{ duration: dur, delay: parseFloat(delay), repeat: Infinity, ease: "easeOut" }}
            />
          );
        })}
    </div>
  );
}
