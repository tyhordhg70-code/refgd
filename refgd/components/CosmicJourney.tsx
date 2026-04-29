"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef } from "react";
import KineticText from "./KineticText";

/**
 * CosmicJourney — load-once welcome scene.
 *
 *   ── Why this is so much simpler than before ──────────────────
 *   The previous incarnations of this section all tried to be
 *   *scroll-driven* (sticky pin + `useScroll` + `useSpring` + a long
 *   runway) so the warp would react to the user's wheel/finger. That
 *   approach proved fragile in practice:
 *
 *     • blank dead-zones at the end of the runway,
 *     • the "warp doesn't complete in one scroll" complaint,
 *     • visual breakage when the user scrolled back up to the top
 *       (sticky elements re-projecting under reverse scroll),
 *     • compositor-thrash on weaker GPUs causing sustained lag.
 *
 *   This version takes the opposite stance: the warp now plays
 *   ONCE on mount as a self-contained ~2.4s sequence — exactly how
 *   a short video would behave. The section is a normal-flow
 *   `100svh` block (no sticky, no useScroll), so a single scroll
 *   gesture carries the user past it into the paths section, and
 *   scrolling back up just shows the finished scene as a static
 *   poster (no breakage).
 *
 *   To make that "single scroll → paths" feeling explicit, the
 *   first wheel/touch event while the user is still at the top of
 *   the page programmatically smooth-scrolls the page to `#paths`.
 *   It is fired exactly once, then unbinds itself.
 */
export default function CosmicJourney({ kicker }: { kicker: string }) {
  const reduced = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);

  // ── One-shot auto-snap to the paths section ────────────────
  // The very first scroll attempt while the user is still parked
  // at the top of the page smooth-scrolls them all the way to
  // `#paths`. This delivers the "one scroll = next section" UX the
  // user explicitly asked for, without any of the sticky-pin
  // mechanics that previously caused the breakage.
  useEffect(() => {
    let consumed = false;
    let armed = false;
    // Arm after the welcome animation has had a chance to play, so
    // the snap doesn't fire before the user has even seen the scene.
    const armTimer = window.setTimeout(() => {
      armed = true;
    }, 1500);

    const trigger = () => {
      if (consumed || !armed) return;
      if (window.scrollY > 16) return; // user already past the top
      const target = document.querySelector<HTMLElement>("#paths");
      if (!target) return;
      consumed = true;
      // Allow the browser's native scroll impulse to start, then
      // take over with a smooth ease to the paths section.
      requestAnimationFrame(() => {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    };

    const onWheel = () => trigger();
    const onTouch = () => trigger();
    const onKey = (e: KeyboardEvent) => {
      if (
        e.key === "PageDown" ||
        e.key === "ArrowDown" ||
        e.key === " " ||
        e.key === "End"
      ) {
        trigger();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(armTimer);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      data-testid="cosmic-journey"
      className="relative grid w-full place-items-center overflow-hidden"
      // Plain 100svh hero. No sticky, no inflated runway. Scrolling
      // past it behaves like any other normal-flow section.
      style={{
        height: "100svh",
        contain: "layout paint",
        transform: "translate3d(0,0,0)",
      }}
    >
      {/* ── 1. Static cosmic backdrop (cheap radial gradients) ── */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 28% 30%, rgba(167,139,250,0.45) 0%, transparent 45%)," +
            "radial-gradient(ellipse at 75% 60%, rgba(34,211,238,0.40) 0%, transparent 50%)," +
            "radial-gradient(ellipse at 50% 85%, rgba(245,185,69,0.32) 0%, transparent 50%)",
          filter: "blur(40px)",
        }}
      />

      {/* ── 2. Planet — single big glow, plays a one-time bloom in. ── */}
      <motion.div
        className="absolute h-[64vmin] w-[64vmin] rounded-full"
        initial={reduced ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.55 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 1.6, ease: [0.16, 1, 0.3, 1], delay: 0.05 }
        }
        style={{
          background:
            "radial-gradient(circle at 30% 28%, rgba(255,237,180,1) 0%, rgba(245,185,69,0.85) 22%, rgba(167,139,250,0.62) 55%, rgba(34,211,238,0.32) 85%, transparent 100%)",
          boxShadow:
            "0 0 140px 50px rgba(245,185,69,0.40), 0 0 260px 90px rgba(167,139,250,0.28)",
          willChange: "transform, opacity",
        }}
        suppressHydrationWarning
      />

      {/* ── 3. Soft halo ring, a single very subtle pulse. ── */}
      {!reduced && (
        <motion.div
          aria-hidden="true"
          className="absolute h-[88vmin] w-[88vmin] rounded-full"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: [0, 0.6, 0.45], scale: 1 }}
          transition={{ duration: 2.0, ease: "easeOut", times: [0, 0.6, 1] }}
          style={{
            border: "1px solid rgba(255,225,140,0.35)",
            boxShadow:
              "inset 0 0 90px rgba(245,185,69,0.18), 0 0 140px rgba(167,139,250,0.20)",
            willChange: "opacity, transform",
          }}
          suppressHydrationWarning
        />
      )}

      {/* ── 4. WELCOME headline. ── */}
      <motion.div
        className="container-wide pointer-events-none relative z-[5] flex flex-col items-center justify-center text-center"
        initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.45 }
        }
        suppressHydrationWarning
      >
        <KineticText
          as="h1"
          text={kicker}
          className="editorial-display text-balance uppercase text-white text-[clamp(2.5rem,9vw,7rem)] leading-[0.95] tracking-[-0.015em]"
          style={{
            textShadow:
              "0 4px 50px rgba(0,0,0,0.95), 0 0 60px rgba(245,185,69,0.45), 0 2px 14px rgba(0,0,0,0.95)",
          }}
          stagger={0.08}
          delay={0.55}
        />
      </motion.div>

      {/* ── 5. Scroll hint — fades in last so the user knows what to do. ── */}
      <motion.div
        className="absolute bottom-12 z-[6] flex flex-col items-center gap-3 text-white"
        data-testid="hero-scroll-indicator"
        initial={reduced ? { opacity: 1 } : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 0.7, ease: "easeOut", delay: 1.5 }
        }
        suppressHydrationWarning
      >
        <span
          className="heading-display text-xs font-bold uppercase tracking-[0.5em] sm:text-sm"
          style={{
            textShadow:
              "0 2px 14px rgba(0,0,0,0.95), 0 0 22px rgba(255,237,180,0.65)",
          }}
        >
          scroll
        </span>
        <span
          className="block h-14 w-[2px] animate-pulseGlow rounded-full bg-gradient-to-b from-amber-200 via-white/80 to-transparent"
          style={{ boxShadow: "0 0 14px rgba(255,237,180,0.7)" }}
        />
      </motion.div>
    </section>
  );
}
