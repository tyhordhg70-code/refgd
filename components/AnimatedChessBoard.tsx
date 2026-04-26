"use client";
import { motion, useReducedMotion } from "framer-motion";

/**
 * Animated chess composition for the mentorships intro. Floating king +
 * pawn pieces over an isometric board with a violet aurora glow. Pure
 * inline SVG so it scales crisply at any DPR.
 */
export default function AnimatedChessBoard({ className = "" }: { className?: string }) {
  const reduced = useReducedMotion();
  return (
    <div className={`relative ${className}`} aria-hidden="true">
      <svg viewBox="0 0 480 360" className="h-full w-full">
        <defs>
          <radialGradient id="chess-aura" cx="50%" cy="55%" r="55%">
            <stop offset="0%" stopColor="#b196ff" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#7be7ff" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#0a0c14" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="chess-piece" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#a78bfa" stopOpacity="0.95" />
          </linearGradient>
          <filter id="chess-glow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        <ellipse cx="240" cy="200" rx="220" ry="120" fill="url(#chess-aura)" />
        {/* isometric board */}
        <g transform="translate(240 220)">
          {Array.from({ length: 4 }).map((_, r) =>
            Array.from({ length: 4 }).map((_, col) => {
              const x = (col - r) * 38;
              const y = (col + r) * 19;
              const dark = (r + col) % 2 === 0;
              return (
                <motion.path
                  key={`${r}-${col}`}
                  d={`M${x} ${y - 6} L${x + 38} ${y + 13} L${x} ${y + 32} L${x - 38} ${y + 13} Z`}
                  fill={dark ? "rgba(167,139,250,0.32)" : "rgba(255,255,255,0.07)"}
                  stroke="rgba(167,139,250,0.45)"
                  strokeWidth="1"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * (r + col), duration: 0.6 }}
                />
              );
            })
          )}
        </g>
        {/* king floating */}
        <motion.g
          transform="translate(240 130)"
          animate={reduced ? {} : { y: [0, -10, 0] }}
          transition={reduced ? {} : { duration: 6, repeat: Infinity, ease: "easeInOut" }}
        >
          <ellipse cx="0" cy="80" rx="42" ry="8" fill="#a78bfa" opacity="0.35" filter="url(#chess-glow)" />
          <path
            d="M-26 70 Q0 -20 26 70 L34 75 L-34 75 Z"
            fill="url(#chess-piece)"
            stroke="white"
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path d="M0 -28 L0 -8 M-10 -18 L10 -18" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" />
          <circle cx="0" cy="-32" r="3.5" fill="#ffe28a" />
        </motion.g>
        {/* satellite pawns */}
        {[
          { x: 110, y: 165, d: 0 },
          { x: 370, y: 165, d: 0.6 },
          { x: 150, y: 235, d: 1.2 },
          { x: 330, y: 235, d: 1.8 },
        ].map((p) => (
          <motion.g
            key={`${p.x}-${p.y}`}
            transform={`translate(${p.x} ${p.y})`}
            animate={reduced ? {} : { y: [0, -6, 0] }}
            transition={reduced ? {} : { duration: 5, delay: p.d, repeat: Infinity, ease: "easeInOut" }}
          >
            <ellipse cx="0" cy="22" rx="14" ry="3" fill="#a78bfa" opacity="0.3" />
            <path d="M-8 22 Q0 -14 8 22 Z" fill="url(#chess-piece)" stroke="white" strokeWidth="0.8" />
            <circle cx="0" cy="-10" r="6" fill="#ffffff" stroke="#a78bfa" strokeWidth="1" />
          </motion.g>
        ))}
      </svg>
    </div>
  );
}
