"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";

/**
 * PathsHorizontalReveal — one-scroll path card stepper for all screens.
 *
 * A wheel flick / vertical phone swipe advances exactly one card and
 * locks until that card lands. This removes the old spring-runway skip
 * where card 1/5 could be missed during a hard scroll. Normal page scroll
 * resumes only before card 1 or after card 5.
 */
export default function PathsHorizontalReveal({
  cards,
  desktopFallback: _desktopFallback,
}: {
  /** Pre-built card React nodes, in order. Should be 5 for the
   *  current home page but the component is resilient to any count. */
  cards: ReactNode[];
  /** What to render on tablet / desktop. Typically the existing grid. */
  desktopFallback: ReactNode;
}) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const lockRef = useRef(false);
  const activeRef = useRef(0);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const reduce = useReducedMotion();
  const count = cards.length;
  const [activeIndex, setActiveIndex] = useState(0);

  const goToCard = useCallback(
    (nextIndex: number) => {
      const next = Math.max(0, Math.min(count - 1, nextIndex));
      if (next === activeRef.current || lockRef.current) return false;
      activeRef.current = next;
      setActiveIndex(next);
      lockRef.current = true;
      window.setTimeout(() => {
        lockRef.current = false;
      }, reduce ? 120 : 760);
      return true;
    },
    [count, reduce],
  );

  useEffect(() => {
    activeRef.current = activeIndex;
  }, [activeIndex]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || count <= 1) return;

    const isFocused = () => {
      const rect = section.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.78 && rect.bottom > window.innerHeight * 0.22;
    };

    const maybeStep = (direction: 1 | -1) => {
      if (!isFocused()) return false;
      if (lockRef.current) return true;

      const current = activeRef.current;
      if (direction > 0 && current < count - 1) return goToCard(current + 1);
      if (direction < 0 && current > 0) return goToCard(current - 1);
      return false;
    };

    const onWheel = (event: WheelEvent) => {
      const primaryDelta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
      if (Math.abs(primaryDelta) < 8) return;
      const direction = primaryDelta > 0 ? 1 : -1;
      if (maybeStep(direction)) event.preventDefault();
    };

    const onTouchStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      touchStartRef.current = touch ? { x: touch.clientX, y: touch.clientY } : null;
    };

    const onTouchMove = (event: TouchEvent) => {
      const start = touchStartRef.current;
      const touch = event.touches[0];
      if (!start || !touch) return;

      const dx = touch.clientX - start.x;
      const dy = touch.clientY - start.y;
      const dominant = Math.abs(dy) >= Math.abs(dx) ? -dy : -dx;
      if (Math.abs(dominant) < 28) return;

      const direction = dominant > 0 ? 1 : -1;
      if (maybeStep(direction)) {
        event.preventDefault();
        touchStartRef.current = null;
      }
    };

    section.addEventListener("wheel", onWheel, { passive: false });
    section.addEventListener("touchstart", onTouchStart, { passive: true });
    section.addEventListener("touchmove", onTouchMove, { passive: false });

    return () => {
      section.removeEventListener("wheel", onWheel);
      section.removeEventListener("touchstart", onTouchStart);
      section.removeEventListener("touchmove", onTouchMove);
    };
  }, [count, goToCard]);

  return (
    <section
      ref={sectionRef}
      data-testid="paths-scroll-stepper"
      className="relative mx-auto w-full max-w-6xl py-2 sm:py-4"
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-32 -translate-y-1/2 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-[2.25rem] border border-white/10 bg-black/10 px-1 py-4 shadow-[0_40px_140px_-70px_rgba(245,185,69,0.75)] sm:px-4 sm:py-6">
        <motion.div
          data-testid="paths-card-track"
          className="flex items-stretch"
          animate={{ x: `-${activeIndex * 100}%` }}
          transition={reduce ? { duration: 0 } : { duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
          style={{ willChange: "transform" }}
        >
          {cards.map((card, i) => (
            <CardSlide key={i} index={i} activeIndex={activeIndex}>
              {card}
            </CardSlide>
          ))}
        </motion.div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-center gap-2" data-testid="paths-stepper-controls">
        {cards.map((_, i) => {
          const active = i === activeIndex;
          return (
            <button
              key={i}
              type="button"
              data-testid={`paths-stepper-dot-${i + 1}`}
              aria-label={`Show path card ${i + 1}`}
              aria-current={active ? "true" : undefined}
              onClick={() => goToCard(i)}
              className="group rounded-full p-2 focus:outline-none focus:ring-2 focus:ring-amber-200/80"
            >
              <span
                className={`block rounded-full transition-[width,background-color,box-shadow] duration-300 ${
                  active ? "h-2 w-8 bg-amber-300" : "h-2 w-2 bg-white/35 group-hover:bg-white/65"
                }`}
                style={active ? { boxShadow: "0 0 16px rgba(255,237,180,0.85)" } : undefined}
              />
            </button>
          );
        })}
      </div>

      <p
        data-testid="paths-stepper-hint"
        className="heading-display mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.38em] text-white/55 sm:text-xs"
      >
        Scroll once to change path
      </p>
    </section>
  );
}

/**
 * A single card-width "slide" inside the horizontal track. Each
 * slide also gets its own tilt / zoom keyed to the master scroll
 * progress so the reveal feels like a cinematic camera fly-by, not
 * a flat carousel.
 */
function CardSlide({
  index,
  activeIndex,
  children,
}: {
  index: number;
  activeIndex: number;
  children: ReactNode;
}) {
  const offset = index - activeIndex;
  const active = offset === 0;

  return (
    <div
      data-testid={`paths-card-slide-${index + 1}`}
      className="flex w-full shrink-0 items-center justify-center px-4 sm:px-8 lg:px-14"
      style={{ perspective: 1400 }}
    >
      <motion.div
        className="w-full max-w-[24rem] sm:max-w-[28rem] lg:max-w-[31rem]"
        animate={{
          opacity: active ? 1 : 0.38,
          scale: active ? 1 : 0.78,
          x: active ? 0 : offset < 0 ? -110 : 110,
          y: active ? 0 : offset < 0 ? -34 : 34,
          rotateY: active ? 0 : offset < 0 ? -22 : 22,
          rotateX: active ? 0 : offset < 0 ? 8 : -8,
        }}
        transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
        style={{
          transformStyle: "preserve-3d",
          transformOrigin: "50% 50%",
          willChange: "transform, opacity",
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
