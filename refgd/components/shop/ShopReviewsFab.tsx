"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { openVouches } from "@/components/shop/ShopVouchesModal";

/**
 * ShopReviewsFab — floating "Read vouches" button that opens the community
 * vouches popup ({@link openVouches}).
 *
 * Liquid-glass redesign: a frosted translucent pill with a slow-drifting
 * gradient sheen inside (the "liquid"), a soft gradient halo, and a thin
 * scroll-progress arc traced over the top. Distinct from the previous solid
 * violet→blue circle.
 */
export default function ShopReviewsFab() {
  const [show, setShow] = useState(false);
  const { scrollYProgress } = useScroll();
  const dashOffset = useTransform(scrollYProgress, (v) => 100 - v * 100);

  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 350);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {show && (
        <motion.button
          key="vouches-fab"
          onClick={() => openVouches()}
          initial={{ opacity: 0, scale: 0.6, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.6, y: 20 }}
          transition={{ type: "spring", stiffness: 200, damping: 18 }}
          aria-label="Read community vouches"
          className="group fixed right-4 z-[60] flex items-center gap-2.5 overflow-hidden rounded-full px-4 py-3 text-white sm:right-8 sm:px-5 sm:py-3.5"
          style={{
            bottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
            background: "rgba(255,255,255,0.07)",
            backdropFilter: "blur(18px) saturate(170%)",
            WebkitBackdropFilter: "blur(18px) saturate(170%)",
            border: "1px solid rgba(255,255,255,0.22)",
            boxShadow:
              "0 14px 44px -12px rgba(124,58,237,0.65), 0 0 34px -10px rgba(34,211,238,0.5), inset 0 1px 0 rgba(255,255,255,0.40), inset 0 -10px 26px -10px rgba(167,139,250,0.45)",
          }}
        >
          {/* Drifting liquid gradient sheen */}
          <motion.span
            aria-hidden
            className="pointer-events-none absolute -inset-8"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(167,139,250,0.55), rgba(34,211,238,0.50), rgba(236,72,153,0.45), rgba(99,102,241,0.55), rgba(167,139,250,0.55))",
              filter: "blur(18px)",
              mixBlendMode: "screen",
            }}
            animate={{ rotate: 360 }}
            transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
          />

          {/* Glassy icon disc with scroll-progress arc */}
          <span className="relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/30 bg-white/10">
            <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="2.5" />
              <motion.circle
                cx="18"
                cy="18"
                r="15.9"
                fill="none"
                stroke="url(#fabArc)"
                strokeWidth="2.5"
                strokeLinecap="round"
                pathLength={100}
                strokeDasharray="100"
                style={{ strokeDashoffset: dashOffset }}
              />
              <defs>
                <linearGradient id="fabArc" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" />
                  <stop offset="50%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
            </svg>
            <span className="relative text-base leading-none">★</span>
          </span>

          <span className="relative pr-0.5 text-xs font-bold uppercase tracking-[0.18em] sm:text-sm">
            Read vouches
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
