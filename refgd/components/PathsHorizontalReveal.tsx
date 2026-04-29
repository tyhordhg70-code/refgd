"use client";

import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";

/**
 * PathsHorizontalReveal — responsive path-card stage.
 *
 *   ── How it plays ──────────────────────────────────────────────
 *   • Desktop / tablet (≥ 768px): all cards render together in a
 *     5-column grid. Each PathCard's own (md-size) reveal handles the
 *     cinematic 3D fly-in (opacity + lift + scale + rotateX with a
 *     per-card stagger), and PathCard's CSS `floatSlow` animation
 *     keeps every card gently bobbing once it's settled. We just
 *     provide a wide stage container — no extra wrapper that would
 *     fight with the per-card animations.
 *
 *   • Mobile (< 768px): the section is a TALL container whose inner
 *     stage is `position: sticky; top: 0; height: 100vh`. As the user
 *     scrolls down, the cards slide horizontally driven by scroll
 *     progress (canonical Framer Motion scroll pattern). One viewport
 *     of vertical scroll advances roughly one card. When the last
 *     card has slid in, the section ends and the page continues
 *     vertically into the next section — natural, smooth, no body-
 *     lock, no snap-back, no jump. Each mobile card sits inside a
 *     subtle floating wrapper so the visual matches desktop.
 *
 *   Both modes use `transform` and `opacity` only (GPU-accelerated)
 *   and rely on the browser's native scroll loop. No wheel hijacking,
 *   no `position: fixed` body, no JavaScript polling.
 *
 *   Props:
 *     • `cards` — full-size card nodes used for the mobile slide
 *       stage. Also used as the SSR / no-JS desktop fallback if no
 *       `desktopFallback` is supplied.
 *     • `desktopFallback` — a pre-built grid (typically 5 small
 *       cards) used for the desktop layout. Rendered as-is so its
 *       child PathCards keep their built-in entrance + float anims.
 */
export default function PathsHorizontalReveal({
  cards,
  desktopFallback,
}: {
  cards: ReactNode[];
  desktopFallback?: ReactNode;
}) {
  // SSR-safe viewport detection. We render the desktop layout by
  // default (matches the server output) and only switch to the mobile
  // stage after mount once we know the real viewport. This avoids the
  // hydration mismatch that previously left the desktop view stuck on
  // the mobile single-card stepper.
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

  return <MobileHorizontalStage cards={cards} />;
}

/* ------------------------------------------------------------------ */
/*  Desktop                                                           */
/* ------------------------------------------------------------------ */

function DesktopGrid({
  cards,
  desktopFallback,
}: {
  cards: ReactNode[];
  desktopFallback?: ReactNode;
}) {
  return (
    <section
      data-testid="paths-desktop-grid"
      className="relative mx-auto w-full py-6"
      style={{ perspective: "1600px" }}
    >
      {/* Soft amber backdrop glow. */}
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 rounded-full bg-amber-300/10 blur-3xl" />

      <div className="relative px-2 sm:px-4">
        {desktopFallback ?? (
          <div className="grid grid-cols-5 items-stretch gap-4 md:gap-5 xl:gap-6">
            {cards.map((c, i) => (
              <div key={i}>{c}</div>
            ))}
          </div>
        )}
        <p className="heading-display mt-8 text-center text-[10px] font-semibold uppercase tracking-[0.38em] text-white/55 sm:text-xs">
          Choose your door
        </p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile — sticky pinned horizontal scroll                          */
/* ------------------------------------------------------------------ */

function MobileHorizontalStage({ cards }: { cards: ReactNode[] }) {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement | null>(null);
  const count = cards.length;
  const [activeIndex, setActiveIndex] = useState(0);

  // Total scroll runway: roughly one viewport per card. The browser
  // handles all scrolling natively — no JS lock, no wheel hijacking,
  // no body fixed.
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end end"],
  });

  // Spring-smooth so the slide feels deliberate but never lagged
  // behind the finger. Light spring on mobile keeps it crisp.
  const smoothed = useSpring(scrollYProgress, {
    stiffness: 180,
    damping: 30,
    mass: 0.25,
  });

  // Map progress 0 → 1 to translateX 0% → -((count-1) * 100)%.
  // For 5 cards: 0 → 0%, 0.25 → -100%, 0.5 → -200%, 1 → -400%.
  const x = useTransform(
    reduce ? scrollYProgress : smoothed,
    [0, 1],
    ["0%", `-${(count - 1) * 100}%`],
  );

  // Active-dot indicator follows the progress.
  useEffect(() => {
    const unsub = scrollYProgress.on("change", (v) => {
      const idx = Math.round(v * (count - 1));
      const clamped = Math.max(0, Math.min(count - 1, idx));
      setActiveIndex((cur) => (cur === clamped ? cur : clamped));
    });
    return () => unsub();
  }, [scrollYProgress, count]);

  return (
    <section
      ref={sectionRef}
      data-testid="paths-mobile-stage"
      className="relative w-full"
      // Tall container = scroll runway. Inner stage is sticky.
      // Use svh so iOS Safari address-bar shrink doesn't change the
      // total runway mid-scroll.
      style={{ height: `${count * 100}svh` }}
    >
      <div
        className="sticky top-0 flex h-[100svh] w-full flex-col items-center justify-center overflow-hidden"
        style={{
          contain: "layout paint",
          willChange: "transform",
        }}
      >
        {/* Soft glow backdrop. */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 h-40 -translate-y-1/2 bg-amber-300/10 blur-3xl" />

        {/* Horizontal track. translateX driven by scroll progress. */}
        <motion.div
          data-testid="paths-card-track"
          className="flex h-full w-full items-center"
          style={{ x, willChange: "transform" }}
        >
          {cards.map((card, i) => (
            <div
              key={i}
              data-testid={`paths-card-slide-${i + 1}`}
              className="flex h-full flex-shrink-0 items-center justify-center px-5"
              style={{ width: "100%" }}
            >
              <FloatingCard index={i}>
                <div className="w-full max-w-[26rem]">{card}</div>
              </FloatingCard>
            </div>
          ))}
        </motion.div>

        {/* Stepper indicator. Click jumps to that card by scrolling
            the page to the matching point inside the section. */}
        <div
          className="pointer-events-auto absolute bottom-8 left-0 right-0 flex flex-col items-center gap-3"
          data-testid="paths-stepper-controls"
        >
          <div className="flex items-center justify-center gap-2">
            {cards.map((_, i) => {
              const active = i === activeIndex;
              return (
                <button
                  key={i}
                  type="button"
                  data-testid={`paths-stepper-dot-${i + 1}`}
                  aria-label={`Show path card ${i + 1}`}
                  aria-current={active ? "true" : undefined}
                  onClick={() => {
                    const sec = sectionRef.current;
                    if (!sec) return;
                    const rect = sec.getBoundingClientRect();
                    const total = sec.offsetHeight - window.innerHeight;
                    const target =
                      window.scrollY + rect.top + (i / (count - 1)) * total;
                    window.scrollTo({ top: target, behavior: "smooth" });
                  }}
                  className="group rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-amber-200/80"
                >
                  <span
                    className={`block rounded-full transition-[width,background-color,box-shadow] duration-300 ${
                      active
                        ? "h-2 w-8 bg-amber-300"
                        : "h-2 w-2 bg-white/35 group-hover:bg-white/65"
                    }`}
                    style={
                      active
                        ? { boxShadow: "0 0 16px rgba(255,237,180,0.85)" }
                        : undefined
                    }
                  />
                </button>
              );
            })}
          </div>
          <p
            data-testid="paths-stepper-hint"
            className="heading-display text-center text-[10px] font-semibold uppercase tracking-[0.38em] text-white/55"
          >
            Scroll to reveal each path
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Subtle vertical bob applied to each mobile card. PathCard already
 * runs a `floatSlow` CSS animation for `md`-size cards, so on mobile
 * we just stagger the phase a little so adjacent cards don't bob in
 * lockstep when they peek in from the side.
 */
function FloatingCard({
  children,
  index,
}: {
  children: ReactNode;
  index: number;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <>{children}</>;
  return (
    <motion.div
      animate={{ y: [0, -10, 0] }}
      transition={{
        duration: 7 + (index % 3) * 0.6,
        delay: index * 0.55,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{ willChange: "transform" }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
}
