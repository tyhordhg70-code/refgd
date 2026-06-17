"use client";

import { useEffect } from "react";

/**
 * MobilePathsTelegramHandoff — mobile-only downward auto-scroll that glides
 * the page from the path-cards section (#paths) to the telegram box
 * (#telegram) once the visitor has finished with the cards.
 *
 * Why this exists
 * ───────────────
 * On DESKTOP the path cards live in a tall grid and the scroll from the cards
 * down to the telegram CTA reads naturally. On MOBILE the cards are a single
 * fixed-height 3D prism (PathsHorizontalReveal → MobilePrismStage): there is
 * no "scrolling cube" consuming vertical distance, so a plain native scroll
 * from the prism down to the telegram box feels abrupt / lands in dead space.
 * The owner asked: "after scrolling past pathcard 5 it should autoscroll down
 * to the telegram box area, smooth, and not look weird since there is no
 * scrolling cube occurring." This component supplies that single smooth glide.
 *
 * Design (mirrors the hero→#paths hand-off philosophy, kept SEPARATE)
 * ──────────────────────────────────────────────────────────────────
 *   • This is a standalone, render-nothing client component. It does NOT
 *     touch CosmicJourney's hero state machine, so the (already shipped and
 *     accepted) hero→#paths auto-scroll cannot regress.
 *
 *   • iOS-robust mechanism: on the FIRST qualifying downward touchmove we
 *     preventDefault() so the browser never gets a chance to spin up native
 *     momentum, then issue ONE `window.scrollTo({ behavior: "smooth" })` to a
 *     fixed landing. We deliberately avoid a per-frame rAF window.scrollTo
 *     loop here — a programmatic per-frame writer fights the iOS compositor
 *     mid-page and is the known cause of "freeze / can't stop it" reports.
 *
 *   • A NEW finger always wins: a fresh touchstart while a glide is in flight
 *     drops us back to idle so the user's own scroll takes over (the in-flight
 *     native smooth scroll is interrupted by the user's touch input on iOS).
 *
 *   • Narrow trigger zone so we NEVER hijack:
 *       – horizontal prism swipes  → require vertical-dominant intent
 *         (|dyUp| > |dx| · 1.25) and a real downward pull (dyUp > 22px).
 *       – small vertical reading adjustments while still on the cards →
 *         only fire once the bottom of #paths is near/above the fold AND the
 *         #telegram top is approaching from just below (or just entered).
 *
 *   • DOWN-ONLY. No reverse telegram→#paths hand-off: an upward auto-scroll
 *     here would recreate the banned "a light swipe up forces me back down"
 *     behaviour. Scrolling back up is left fully native.
 *
 *   • MOBILE-ONLY (≤768px) and disabled under prefers-reduced-motion. On
 *     desktop no touch listeners are ever attached, so desktop is byte-for-
 *     byte unchanged.
 */
export default function MobilePathsTelegramHandoff() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const mqMobile = window.matchMedia("(max-width: 768px)");
    const mqReduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    // The fixed landing margin matches the telegram section's existing
    // `[scroll-margin-top:12vh]` so the headline clears the iOS status bar.
    const LANDING_MARGIN = 0.12;
    const DOWN_INTENT_PX = 22; // deliberate downward pull before we engage
    const VERTICAL_DOMINANCE = 1.25; // ignore horizontal prism swipes
    const GLIDE_RESET_MS = 900; // ~smooth-scroll duration + buffer

    let detach = () => {};

    const attach = () => {
      detach();
      if (!mqMobile.matches || mqReduced.matches) return;

      let state: "idle" | "gliding" = "idle";
      let startX = 0;
      let startY = 0;
      let gestureFired = false;
      let resetTimer: ReturnType<typeof setTimeout> | null = null;

      const clearReset = () => {
        if (resetTimer) {
          clearTimeout(resetTimer);
          resetTimer = null;
        }
      };

      const maxScroll = () =>
        Math.max(
          0,
          document.documentElement.scrollHeight - window.innerHeight,
        );

      const onTouchStart = (ev: TouchEvent) => {
        const t = ev.touches[0];
        startX = t?.clientX ?? 0;
        startY = t?.clientY ?? 0;
        gestureFired = false;
        // A new finger interrupts any in-flight glide so the user's own
        // scroll wins immediately — never a locked "yank".
        if (state === "gliding") {
          state = "idle";
          clearReset();
        }
      };

      const onTouchMove = (ev: TouchEvent) => {
        const t = ev.touches[0];
        if (!t) return;

        // Once we've taken over this gesture, keep swallowing its moves so the
        // continuing finger-drag can't fight the smooth scroll.
        if (gestureFired) {
          if (state === "gliding" && ev.cancelable) ev.preventDefault();
          return;
        }
        if (state !== "idle") return;

        const dyUp = startY - t.clientY; // > 0 ⇒ swiping up ⇒ intent to scroll DOWN
        const dx = Math.abs(t.clientX - startX);

        // Must be a deliberate, vertical-dominant downward pull.
        if (dyUp <= DOWN_INTENT_PX) return;
        if (dyUp <= dx * VERTICAL_DOMINANCE) return;

        const telegram = document.getElementById("telegram");
        const paths = document.getElementById("paths");
        if (!telegram || !paths) return;

        const vh = window.innerHeight;
        const telegramTop = telegram.getBoundingClientRect().top;
        const pathsBottom = paths.getBoundingClientRect().bottom;

        // Fire only when the cards are essentially behind us and the telegram
        // box is approaching from just below the fold (or has just entered the
        // lower viewport) — never while the user is mid-cards.
        const cardsDone = pathsBottom < vh * 1.25;
        const telegramApproaching =
          telegramTop > vh * 0.45 && telegramTop < vh * 1.15;
        if (!cardsDone || !telegramApproaching) return;

        gestureFired = true;
        state = "gliding";
        if (ev.cancelable) ev.preventDefault(); // own the gesture, kill momentum

        const target = Math.max(
          0,
          Math.min(
            window.scrollY + telegramTop - vh * LANDING_MARGIN,
            maxScroll(),
          ),
        );
        window.scrollTo({ top: target, behavior: "smooth" });

        clearReset();
        resetTimer = setTimeout(() => {
          if (state === "gliding") state = "idle";
          resetTimer = null;
        }, GLIDE_RESET_MS);
      };

      const onTouchEnd = () => {
        // Let any in-flight glide finish; just re-arm per-gesture latch.
        gestureFired = false;
      };

      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: false });
      window.addEventListener("touchend", onTouchEnd, { passive: true });
      window.addEventListener("touchcancel", onTouchEnd, { passive: true });

      detach = () => {
        clearReset();
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
        window.removeEventListener("touchend", onTouchEnd);
        window.removeEventListener("touchcancel", onTouchEnd);
        detach = () => {};
      };
    };

    attach();
    // Re-evaluate if the viewport crosses the mobile/desktop or reduced-motion
    // boundary so desktop never carries the touch listeners.
    mqMobile.addEventListener("change", attach);
    mqReduced.addEventListener("change", attach);

    return () => {
      detach();
      mqMobile.removeEventListener("change", attach);
      mqReduced.removeEventListener("change", attach);
    };
  }, []);

  return null;
}
