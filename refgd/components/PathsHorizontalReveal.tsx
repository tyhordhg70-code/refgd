"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";

/**
 * PathsHorizontalReveal — one-scroll path card stepper for all screens.
 *
 * A wheel flick / vertical phone swipe advances exactly one card and
 * locks until that card lands. This removes the old spring-runway skip
 * where card 1/5 could be missed during a hard scroll. Cards are changed by
 * vertical scroll only; horizontal trackpad motion is ignored. Normal page
 * scroll resumes only before card 1 or after card 5.
 */
export default function PathsHorizontalReveal({
  cards,
  desktopFallback,
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
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

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
    if (!section || count <= 1 || isDesktop) return;

    const syncIndexWhenAway = () => {
      const rect = section.getBoundingClientRect();
      if (rect.top > window.innerHeight * 0.95 && activeRef.current !== 0) {
        activeRef.current = 0;
        setActiveIndex(0);
      }
      if (rect.bottom < window.innerHeight * 0.05 && activeRef.current !== count - 1) {
        activeRef.current = count - 1;
        setActiveIndex(count - 1);
      }
    };

    syncIndexWhenAway();
    window.addEventListener("scroll", syncIndexWhenAway, { passive: true });
    window.addEventListener("resize", syncIndexWhenAway);

    return () => {
      window.removeEventListener("scroll", syncIndexWhenAway);
      window.removeEventListener("resize", syncIndexWhenAway);
    };
  }, [count, isDesktop]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || count <= 1 || isDesktop) return;

    const isFocused = () => {
      const rect = section.getBoundingClientRect();
      return rect.top < window.innerHeight * 0.82 && rect.bottom > window.innerHeight * 0.18;
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
      // Only vertical scrolling changes cards. Sideways trackpad motion must
      // never advance this section or create the feeling of horizontal scroll.
      if (Math.abs(event.deltaY) < 8 || Math.abs(event.deltaY) < Math.abs(event.deltaX)) return;
      const direction = event.deltaY > 0 ? 1 : -1;
      if (maybeStep(direction)) {
        event.preventDefault();
        event.stopPropagation();
      }
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
      if (Math.abs(dy) < 28 || Math.abs(dy) < Math.abs(dx)) return;

      const direction = dy < 0 ? 1 : -1;
      if (maybeStep(direction)) {
        event.preventDefault();
        event.stopPropagation();
        touchStartRef.current = null;
      }
    };

    document.addEventListener("wheel", onWheel, { capture: true, passive: false });
    document.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });
    document.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });

    return () => {
      document.removeEventListener("wheel", onWheel, { capture: true });
      document.removeEventListener("touchstart", onTouchStart, { capture: true });
      document.removeEventListener("touchmove", onTouchMove, { capture: true });
    };
  }, [count, goToCard, isDesktop]);

  if (isDesktop) {
    return <DesktopCameraFlyby>{desktopFallback}</DesktopCameraFlyby>;
  }

  return (
    <section
      ref={sectionRef}
      data-testid="paths-scroll-stepper"
      className="relative mx-auto w-full max-w-6xl py-2 sm:py-4"
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-32 -translate-y-1/2 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="relative overflow-visible px-1 py-4 sm:px-4 sm:py-6">
        <motion.div
          data-testid="paths-card-track"
          className="relative mx-auto flex min-h-[30rem] w-full items-center justify-center sm:min-h-[36rem] lg:min-h-[40rem]"
          style={{ willChange: "transform, opacity" }}
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
        Scroll down once to change path
      </p>
    </section>
  );
}

function DesktopCameraFlyby({ children }: { children: ReactNode }) {
  const sectionRef = useRef<HTMLDivElement | null>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start 92%", "end 8%"],
  });
  const progress = useSpring(scrollYProgress, {
    stiffness: reduce ? 900 : 150,
    damping: reduce ? 90 : 28,
    mass: reduce ? 0.1 : 0.35,
  });

  const x = useTransform(progress, [0, 0.5, 1], reduce ? ["0%", "0%", "0%"] : ["-8%", "0%", "7%"]);
  const y = useTransform(progress, [0, 0.5, 1], reduce ? ["0%", "0%", "0%"] : ["7%", "-1%", "-5%"]);
  const z = useTransform(progress, [0, 0.52, 1], reduce ? [0, 0, 0] : [-340, 90, -80]);
  const scale = useTransform(progress, [0, 0.52, 1], reduce ? [1, 1, 1] : [0.82, 1.04, 0.94]);
  const rotateX = useTransform(progress, [0, 0.52, 1], reduce ? [0, 0, 0] : [12, -1, -7]);
  const rotateY = useTransform(progress, [0, 0.52, 1], reduce ? [0, 0, 0] : [-18, 2, 16]);
  const opacity = useTransform(progress, [0, 0.12, 0.9, 1], [0.68, 1, 1, 0.92]);

  return (
    <section
      ref={sectionRef}
      data-testid="paths-desktop-camera-flyby"
      className="relative mx-auto w-full max-w-[92rem] py-6 md:py-10"
    >
      <div className="pointer-events-none absolute inset-x-6 top-1/2 h-40 -translate-y-1/2 rounded-full bg-amber-300/10 blur-3xl" />
      <div
        className="relative flex min-h-[min(78svh,760px)] w-full items-center justify-center overflow-visible px-2 md:px-4"
        style={{ perspective: 1900 }}
      >
        <motion.div
          data-testid="paths-desktop-card-camera"
          className="w-full"
          style={{
            x,
            y,
            z,
            scale,
            rotateX,
            rotateY,
            opacity,
            transformStyle: "preserve-3d",
            transformOrigin: "50% 50%",
            willChange: "transform, opacity",
          }}
        >
          {children}
        </motion.div>
      </div>
    </section>
  );
}

/**
 * A single full-stage card. Cards change by vertical scroll and cross-fade
 * in place, avoiding the previous sideways carousel movement.
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
      className="absolute inset-0 flex items-center justify-center px-4 sm:px-8 lg:px-14"
      style={{ perspective: 1400, pointerEvents: active ? "auto" : "none" }}
      aria-hidden={!active}
    >
      <motion.div
        className="w-full max-w-[24rem] sm:max-w-[28rem] lg:max-w-[31rem]"
        animate={{
          opacity: active ? 1 : 0,
          scale: active ? 1 : 0.9,
          y: active ? 0 : offset < 0 ? -42 : 42,
          rotateY: 0,
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
