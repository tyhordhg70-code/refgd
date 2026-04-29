"use client";

import {
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * PathsHorizontalReveal — responsive path-card stage.
 *
 *   ── Layouts ──────────────────────────────────────────────────
 *   • Desktop / tablet (≥ 768px): all cards rendered together in
 *     the responsive grid supplied by the page (`desktopFallback`).
 *     The grid container itself does a single fade-and-lift on
 *     enter, and each card animates in with a staggered 3D fly-in
 *     so the entrance is unmistakeable.
 *
 *   • Mobile (< 768px): a simple vertical stack — one card after
 *     the other — with the same staggered fly-in entrance. The
 *     prior sticky-pinned horizontal-scroll stage was removed
 *     entirely: it was the source of the "scrolling back up breaks
 *     the page" symptom and made the first scroll feel laggy.
 *
 *   Both layouts use `whileInView` with `amount: 0.15` (no negative
 *   margin), which is the most reliable trigger across browsers
 *   regardless of the parent element's transform context.
 *
 *   Both layouts use only `transform` and `opacity` (GPU-accelerated)
 *   and rely entirely on the browser's native scroll loop. No wheel
 *   hijacking, no `position: sticky`, no JavaScript scroll polling.
 */
export default function PathsHorizontalReveal({
  cards,
  desktopFallback,
}: {
  cards: ReactNode[];
  desktopFallback?: ReactNode;
}) {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  if (!mounted || !isMobile) {
    return <DesktopGrid cards={cards} desktopFallback={desktopFallback} />;
  }

  return <MobileVerticalStack cards={cards} />;
}

/* ------------------------------------------------------------------ */
/*  Desktop / tablet                                                  */
/* ------------------------------------------------------------------ */

function DesktopGrid({
  cards,
  desktopFallback,
}: {
  cards: ReactNode[];
  desktopFallback?: ReactNode;
}) {
  const reduced = useReducedMotion();

  return (
    <section
      data-testid="paths-desktop-grid"
      className="relative mx-auto w-full py-6"
      style={{ perspective: "1600px" }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 rounded-full bg-amber-300/10 blur-3xl" />

      <motion.div
        className="relative px-2 sm:px-4"
        initial={reduced ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.15 }}
        transition={
          reduced
            ? { duration: 0 }
            : { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
        }
      >
        {desktopFallback ?? (
          <div className="mx-auto grid w-full max-w-[1500px] grid-cols-2 items-stretch gap-4 sm:grid-cols-3 md:gap-5 xl:grid-cols-5 xl:gap-6">
            {cards.map((c, i) => (
              <FlyInCard key={i} index={i}>
                {c}
              </FlyInCard>
            ))}
          </div>
        )}
        <p className="heading-display mt-8 text-center text-[10px] font-semibold uppercase tracking-[0.38em] text-white/55 sm:text-xs">
          Choose your door
        </p>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile — simple vertical stack                                    */
/* ------------------------------------------------------------------ */

function MobileVerticalStack({ cards }: { cards: ReactNode[] }) {
  return (
    <section
      data-testid="paths-mobile-stage"
      className="relative w-full px-4 pb-6"
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 bg-amber-300/10 blur-3xl" />
      <div className="relative mx-auto flex w-full max-w-md flex-col gap-6">
        {cards.map((card, i) => (
          <FlyInCard
            key={i}
            index={i}
            data-testid={`paths-card-slide-${i + 1}`}
          >
            {card}
          </FlyInCard>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  FlyInCard — shared per-card cinematic entrance                    */
/* ------------------------------------------------------------------ */

/**
 * Wraps each card with a one-shot 3D fly-in entrance — fires the
 * moment 15% of the card has entered the viewport. Index-based delay
 * stages adjacent cards into a visible cascade.
 *
 * Rendered ON TOP of any animation PathCard does internally; both
 * are pure transform/opacity work and they read as a single layered
 * effect, not as fighting animations.
 */
function FlyInCard({
  children,
  index,
  ...rest
}: {
  children: ReactNode;
  index: number;
} & Record<string, unknown>) {
  const reduced = useReducedMotion();
  if (reduced) return <div {...rest}>{children}</div>;
  return (
    <motion.div
      {...(rest as Record<string, unknown>)}
      initial={{ opacity: 0, y: 80, scale: 0.85, rotateX: 18 }}
      whileInView={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration: 0.95,
        delay: index * 0.12,
        ease: [0.16, 1, 0.3, 1],
      }}
      style={{
        transformStyle: "preserve-3d",
        willChange: "transform, opacity",
      }}
    >
      {children}
    </motion.div>
  );
}
