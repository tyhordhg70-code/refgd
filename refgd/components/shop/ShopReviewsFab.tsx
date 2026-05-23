"use client";

  import { useEffect, useState } from "react";
  import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";

  export default function ShopReviewsFab() {
    const [phase, setPhase] = useState<"hidden" | "reviews" | "top">("hidden");
    const { scrollYProgress } = useScroll();
    const dashOffset = useTransform(scrollYProgress, (v) => 100 - v * 100);

    useEffect(() => {
      const onScroll = () => {
        const y = window.scrollY;
        const el = document.getElementById("reviews");
        if (y < 400) { setPhase("hidden"); return; }
        if (el) {
          const top = el.getBoundingClientRect().top + window.scrollY;
          setPhase(y > top - 100 ? "top" : "reviews");
        } else {
          setPhase("reviews");
        }
      };
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }, []);

    const click = () => {
      if (phase === "top") window.scrollTo({ top: 0, behavior: "smooth" });
      else document.getElementById("reviews")?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    return (
      <AnimatePresence>
        {phase !== "hidden" && (
          <motion.button
            key="fab"
            onClick={click}
            initial={{ opacity: 0, scale: 0.6, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.6, y: 20 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
            aria-label={phase === "top" ? "Back to top" : "Jump to reviews"}
            className="fixed right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_12px_40px_-10px_rgba(34,211,238,0.7)] sm:right-8 sm:h-16 sm:w-16"
            style={{
                bottom: "max(1.25rem, env(safe-area-inset-bottom, 0px))",
                background: phase === "top"
                  ? "linear-gradient(135deg, #a855f7, #3b82f6)"
                  : "linear-gradient(135deg, #06b6d4, #3b82f6)",
              }}
          >
            <svg viewBox="0 0 36 36" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden>
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="2" />
              <motion.circle
                cx="18" cy="18" r="15" fill="none"
                stroke="rgba(255,255,255,0.85)" strokeWidth="2" strokeLinecap="round"
                strokeDasharray="94.25"
                style={{ strokeDashoffset: dashOffset }}
              />
            </svg>
            <span className="relative text-xl">{phase === "top" ? "↑" : "★"}</span>
            <span className="sr-only">{phase === "top" ? "Back to top" : "Jump to reviews"}</span>
          </motion.button>
        )}
      </AnimatePresence>
    );
  }
  