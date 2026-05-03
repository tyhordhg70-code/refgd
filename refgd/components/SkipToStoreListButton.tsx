"use client";

import { useEffect, useRef, useState } from "react";

/**
 * SkipToStoreListButton
 * ─────────────────────────────────────────────────────────────────
 * Floating bottom-right anchor that jumps the visitor straight to
 * the "Select your region" section (`#region`) of the store-list
 * page.
 *
 * Visibility rules (per user spec, v6.13.34):
 *
 *   – Visible only while the cashback / get-rewarded hero is on
 *     screen (the visitor is still in the opening beat where a
 *     "skip ahead" affordance is most useful).
 *   – Fades OUT once the visitor scrolls past the hero into the
 *     LED beat / rules / payment beats below — the button would
 *     just get in the way of those sections' own content.
 *   – Re-appears (fades back IN) if the visitor scrolls back UP
 *     into the cashback hero.
 *   – Permanently dismissed (fades out and stays out) once the
 *     visitor presses it. We don't want it reappearing in the
 *     visitor's face when they scroll back to verify they ended
 *     up at the region picker — they made their choice.
 *
 * Implementation:
 *
 *   The cashback hero in ServiceSection is tagged with
 *   `data-skip-anchor="cashback"`. We attach an IntersectionObserver
 *   to that element; `entry.isIntersecting` drives the `visible`
 *   state. A separate `dismissed` flag is set on click and gates
 *   visibility forever after.
 */
export default function SkipToStoreListButton() {
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const target = document.querySelector<HTMLElement>(
      '[data-skip-anchor="cashback"]',
    );
    // If the anchor isn't on this page (defensive — the storelist
    // is the only page that mounts this component) we silently
    // never show the button rather than render an orphan affordance.
    if (!target) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        // Use any-pixel intersection rather than a threshold so the
        // button starts fading IN the instant the hero re-enters
        // the viewport during a scroll-back.
        setVisible(entry.isIntersecting);
      },
      { threshold: 0 },
    );
    observerRef.current.observe(target);
    return () => observerRef.current?.disconnect();
  }, []);

  const shown = visible && !dismissed;

  return (
    <a
      href="#region"
      aria-label="Skip to store list — jump to the Select your region section"
      onClick={() => setDismissed(true)}
      className={
        "fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] right-4 z-40 inline-flex items-center gap-2 rounded-full border border-amber-300/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100 shadow-[0_18px_40px_-12px_rgba(245,185,69,0.45)] backdrop-blur-md transition-opacity duration-300 hover:border-amber-300/70 hover:text-white sm:bottom-6 sm:right-6 sm:px-5 sm:py-3 sm:text-sm sm:tracking-[0.22em] " +
        (shown ? "opacity-100" : "pointer-events-none opacity-0")
      }
      style={{
        background:
          "linear-gradient(135deg, rgba(245,185,69,0.22), rgba(15,10,30,0.85))",
      }}
    >
      Skip to store list
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 5v14" />
        <path d="m19 12-7 7-7-7" />
      </svg>
    </a>
  );
}
