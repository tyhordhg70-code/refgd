"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import { openVouches } from "@/components/shop/ShopVouchesModal";

/**
 * ShopReviewsFab — floating action button that opens the community vouches
 * popup ({@link openVouches}). Appears once the user has scrolled a little;
 * the ring tracks page scroll progress.
 */
export default function ShopReviewsFab() {
  const [show, setShow] = useState(false);
  const { scrollYProgress } = useScroll();
  const dashOffset = useTransform(scrollYProgress, (v) => 94.25 - v * 94.25);

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
          aria-label="Open community vouches"
          className="fixed right-4 z-[60] flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_12px_40px_-10px_rgba(167,139,250,0.7)] sm:right-8 sm:h-16 sm:w-16"
          style={{
            bottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
            background: "linear-gradient(135deg, #a855f7, #3b82f6)",
          }}
        >
          <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
            <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
            <motion.circle
              cx="18"
              cy="18"
              r="15"
              fill="none"
              stroke="rgba(255,255,255,0.85)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="94.25"
              style={{ strokeDashoffset: dashOffset }}
            />
          </svg>
          <span className="relative text-xl">★</span>
          <span className="sr-only">Open community vouches</span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}
