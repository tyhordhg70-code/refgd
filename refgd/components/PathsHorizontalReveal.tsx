"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { motion, useReducedMotion } from "framer-motion";
import { lockScroll, unlockScroll } from "@/lib/scroll-lock";

/**
 * PathsHorizontalReveal — one-scroll path-card stepper for ALL viewports.
 *
 *   ── How it plays ──────────────────────────────────────────────
 *   • The 5 cards are stacked. Only the active card is visible; the
 *     others are off-stage left/right (horizontal slide feel).
 *   • When the section enters the viewport with its track centered,
 *     the entire body is hard-locked (position:fixed). The previous
 *     `setInterval(scrollTo)` "tug-of-war" against native scroll —
 *     which produced the visible "the page jumps then snaps back"
 *     glitch — is gone for good.
 *   • Each wheel flick / phone swipe advances exactly one card.
 *     There is a short cool-down so a single trackpad gesture cannot
 *     skip multiple cards.
 *   • After the LAST card, the next downward wheel releases the lock
 *     and the user resumes normal page scrolling. Likewise scrolling
 *     up past the FIRST card releases the lock upwards.
 *   • Reverse re-engagement: if the user scrolls back up into the
 *     section after escaping forward (or down after escaping back),
 *     the lock re-engages with the appropriate card so the stepper
 *     never feels "broken" on the second pass.
 *
 *   `desktopFallback` is no longer used — we keep the prop in the
 *   signature for backwards compatibility but ignore it. The user
 *   asked for unified behaviour across viewports.
 */
export default function PathsHorizontalReveal({
  cards,
}: {
  cards: ReactNode[];
  desktopFallback?: ReactNode;
}) {
  const reduce = useReducedMotion();
  const count = cards.length;

  const sectionRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);

  const stateRef = useRef<"before" | "locked" | "after">("before");
  const lockedRef = useRef(false);
  const activeRef = useRef(0);
  const touchStartRef = useRef<{ y: number } | null>(null);
  const firingDisabledRef = useRef(false);
  const wheelEndTimerRef = useRef<number | null>(null);

  const [activeIndex, setActiveIndex] = useState(0);

  const setActive = useCallback((i: number) => {
    const next = Math.max(0, Math.min(count - 1, i));
    if (next === activeRef.current) return;
    activeRef.current = next;
    setActiveIndex(next);
  }, [count]);

  const lockBody = useCallback(() => {
    if (lockedRef.current) return;
    lockedRef.current = true;
    lockScroll();
  }, []);

  const unlockBody = useCallback((targetY?: number) => {
    if (!lockedRef.current) return;
    lockedRef.current = false;
    unlockScroll(targetY);
  }, []);

  // Engage lock when the cards-track region first enters the viewport.
  // We deliberately DO NOT re-engage from `after` / `before` states —
  // once the user has been through the stepper and released forward
  // or backward, they get free vertical scrolling through this section.
  // Re-locking the moment the track briefly appears again was the
  // source of the "page slightly scrolls then snaps back" glitch.
  useEffect(() => {
    if (count <= 1) return;
    const track = trackRef.current;
    if (!track) return;

    const tryEngage = () => {
      if (lockedRef.current) return;
      if (stateRef.current !== "before") return;
      const rect = track.getBoundingClientRect();
      const viewportH = window.innerHeight;
      const trackCenter = rect.top + rect.height / 2;
      const inFocus =
        trackCenter > viewportH * 0.18 && trackCenter < viewportH * 0.82;
      if (!inFocus) return;
      stateRef.current = "locked";
      activeRef.current = 0;
      setActive(0);
      lockBody();
    };

    // IntersectionObserver fires the moment the track crosses the
    // configured threshold — far faster than waiting for the next
    // scroll event, which previously left a ~250ms window where the
    // user's wheel input was processed as native scroll instead of
    // as a card step.
    const obs = new IntersectionObserver(
      () => tryEngage(),
      { threshold: [0, 0.25, 0.5, 0.75, 1] },
    );
    obs.observe(track);

    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        tryEngage();
      });
    };
    tryEngage();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      obs.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [count, lockBody, setActive]);

  // Wheel + touch + key handling while locked
  useEffect(() => {
    if (count <= 1) return;

    // Wheel-gesture cooldown.
    //
    // We don't fire on a fixed time interval — that previously let a
    // hard trackpad flick (10 wheel events in 300ms) skip multiple
    // cards. Instead, we treat any continuous stream of wheel events
    // as ONE gesture: fire once on the first event, then refuse to
    // fire again until the user STOPS scrolling for `quietGap` ms.
    //
    // The state lives in refs (not closure-local `let`s) so React's
    // StrictMode double-mount in dev doesn't reset it mid-gesture.
    const quietGap = reduce ? 80 : 260;

    const armCooldown = () => {
      firingDisabledRef.current = true;
      if (wheelEndTimerRef.current) {
        window.clearTimeout(wheelEndTimerRef.current);
      }
      wheelEndTimerRef.current = window.setTimeout(() => {
        firingDisabledRef.current = false;
        wheelEndTimerRef.current = null;
      }, quietGap);
    };

    const releaseForward = () => {
      stateRef.current = "after";
      const section = sectionRef.current;
      if (!section) {
        unlockBody();
        return;
      }
      // Scroll well past the section so the user doesn't immediately
      // re-engage with another wheel tick.
      const rect = section.getBoundingClientRect();
      const targetY =
        window.scrollY + rect.bottom - window.innerHeight + 80;
      unlockBody(Math.max(0, targetY));
    };

    const releaseBackward = () => {
      stateRef.current = "before";
      const section = sectionRef.current;
      if (!section) {
        unlockBody();
        return;
      }
      const rect = section.getBoundingClientRect();
      const targetY = window.scrollY + rect.top - 80;
      unlockBody(Math.max(0, targetY));
    };

    const tryStep = (direction: 1 | -1): boolean => {
      if (!lockedRef.current) return false;
      if (firingDisabledRef.current) return true; // consume but don't act

      const current = activeRef.current;
      if (direction > 0) {
        if (current < count - 1) {
          armCooldown();
          setActive(current + 1);
          return true;
        }
        armCooldown();
        releaseForward();
        return true;
      } else {
        if (current > 0) {
          armCooldown();
          setActive(current - 1);
          return true;
        }
        armCooldown();
        releaseBackward();
        return true;
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (!lockedRef.current) return;
      if (Math.abs(e.deltaY) < 6) return;
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
      e.preventDefault();
      e.stopPropagation();
      if (firingDisabledRef.current) {
        // Stretch the quiet-gap so a continuous flick keeps the
        // cooldown alive instead of mid-gesture firing.
        if (wheelEndTimerRef.current) {
          window.clearTimeout(wheelEndTimerRef.current);
        }
        wheelEndTimerRef.current = window.setTimeout(() => {
          firingDisabledRef.current = false;
          wheelEndTimerRef.current = null;
        }, quietGap);
        return;
      }
      tryStep(e.deltaY > 0 ? 1 : -1);
    };

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchStartRef.current = t ? { y: t.clientY } : null;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!lockedRef.current) return;
      const start = touchStartRef.current;
      const t = e.touches[0];
      if (!start || !t) return;
      const dy = t.clientY - start.y;
      if (Math.abs(dy) < 28) return;
      e.preventDefault();
      e.stopPropagation();
      const dir: 1 | -1 = dy < 0 ? 1 : -1;
      if (tryStep(dir)) {
        touchStartRef.current = null;
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (!lockedRef.current) return;
      if (
        e.key === "ArrowDown" ||
        e.key === "PageDown" ||
        e.key === " " ||
        e.key === "Space"
      ) {
        e.preventDefault();
        tryStep(1);
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        tryStep(-1);
      }
    };

    document.addEventListener("wheel", onWheel, {
      capture: true,
      passive: false,
    });
    document.addEventListener("touchstart", onTouchStart, {
      capture: true,
      passive: true,
    });
    document.addEventListener("touchmove", onTouchMove, {
      capture: true,
      passive: false,
    });
    document.addEventListener("keydown", onKey, { capture: true });

    return () => {
      if (wheelEndTimerRef.current) {
        window.clearTimeout(wheelEndTimerRef.current);
        wheelEndTimerRef.current = null;
      }
      document.removeEventListener("wheel", onWheel, { capture: true });
      document.removeEventListener("touchstart", onTouchStart, {
        capture: true,
      });
      document.removeEventListener("touchmove", onTouchMove, {
        capture: true,
      });
      document.removeEventListener("keydown", onKey, { capture: true });
    };
  }, [count, reduce, setActive, unlockBody]);

  // Safety net: if the component unmounts (e.g., route change) while
  // the lock is engaged, release it so the next page is scrollable.
  useEffect(() => {
    return () => {
      if (lockedRef.current) {
        lockedRef.current = false;
        unlockScroll();
      }
    };
  }, []);

  const goToCard = useCallback(
    (i: number) => {
      if (!lockedRef.current) return;
      setActive(i);
    },
    [setActive],
  );

  return (
    <section
      ref={sectionRef}
      data-testid="paths-scroll-stepper"
      className="relative mx-auto w-full max-w-6xl py-2 sm:py-4"
    >
      <div className="pointer-events-none absolute inset-x-0 top-1/2 h-32 -translate-y-1/2 rounded-full bg-amber-300/10 blur-3xl" />
      <div className="relative overflow-hidden px-1 py-4 sm:px-4 sm:py-6">
        <div
          ref={trackRef}
          data-testid="paths-card-track"
          className="relative mx-auto flex min-h-[28rem] w-full items-center justify-center sm:min-h-[34rem] lg:min-h-[40rem]"
          style={{ willChange: "transform, opacity" }}
        >
          {cards.map((card, i) => (
            <CardSlide key={i} index={i} activeIndex={activeIndex}>
              {card}
            </CardSlide>
          ))}
        </div>
      </div>

      <div
        className="mt-5 flex flex-wrap items-center justify-center gap-2"
        data-testid="paths-stepper-controls"
      >
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
        className="heading-display mt-3 text-center text-[10px] font-semibold uppercase tracking-[0.38em] text-white/55 sm:text-xs"
      >
        Scroll down once to change path
      </p>
    </section>
  );
}

/**
 * One full-stage card. The active card sits center; the others are
 * pushed off-stage left or right and faded out — this gives the
 * "smooth horizontal scrolling" feel the user asked for.
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
      style={{ pointerEvents: active ? "auto" : "none" }}
      aria-hidden={!active}
    >
      <motion.div
        className="w-full max-w-[24rem] sm:max-w-[28rem] lg:max-w-[32rem]"
        animate={{
          opacity: active ? 1 : 0,
          x: active ? "0%" : offset < 0 ? "-72%" : "72%",
          scale: active ? 1 : 0.92,
        }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        style={{ willChange: "transform, opacity" }}
      >
        {children}
      </motion.div>
    </div>
  );
}
