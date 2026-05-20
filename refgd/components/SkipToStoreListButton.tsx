"use client";

  import { useEffect, useRef, useState } from "react";

  /**
   * SkipToStoreListButton
   * ─────────────────────────────────────────────────────────────────
   * Floating bottom-LEFT anchor that jumps the visitor straight to the
   * "Select your region" section (`#region`) of the store-list page.
   *
   * Visibility (v6.13.73 — restored one-shot dismissal):
   *   – Visible while the cashback hero (`data-skip-anchor="cashback"`)
   *     is on screen.
   *   – Permanently dismissed once the visitor either:
   *       a) scrolls past the bottom of the hero, OR
   *       b) clicks the button.
   *     After dismissal it never reappears, even on scroll-back.
   *
   * Position is bottom-LEFT so it never collides with the music mute
   * button (fixed top-right) on either mobile or desktop.
   */
  export default function SkipToStoreListButton() {
    const [visible, setVisible] = useState(false);
    const [dismissed, setDismissed] = useState(false);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
      const target = document.querySelector<HTMLElement>(
        '[data-skip-anchor="cashback"]',
      );
      if (!target) return;

      observerRef.current = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          setVisible(entry.isIntersecting);
          // Hero's bottom is now above viewport top → visitor scrolled past.
          if (entry.boundingClientRect.bottom <= 0) {
            setDismissed(true);
          }
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
          "fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-4 z-40 inline-flex items-center gap-2 rounded-full border border-amber-300/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100 shadow-[0_18px_40px_-12px_rgba(245,185,69,0.45)] backdrop-blur-md transition-opacity duration-300 hover:border-amber-300/70 hover:text-white sm:bottom-6 sm:left-6 sm:px-5 sm:py-3 sm:text-sm sm:tracking-[0.22em] " +
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
  