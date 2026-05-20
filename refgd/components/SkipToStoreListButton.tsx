"use client";

  import { useEffect, useRef, useState } from "react";

  /**
   * SkipToStoreListButton
   * ─────────────────────────────────────────────────────────────────
   * Floating bottom-LEFT anchor that jumps the visitor straight to the
   * "Select your region" section (`#region`) of the store-list page.
   *
   * Visibility (v6.13.72):
   *   – Visible from the moment the page loads until the visitor reaches
   *     the region picker (`#region` enters the viewport).
   *   – Hides automatically once the region picker is on screen — the
   *     button has done its job at that point.
   *   – Re-appears if the visitor scrolls back UP above the region
   *     picker (useful on mobile where the page is long).
   *
   * Position is bottom-LEFT so it never collides with the music mute
   * button (fixed top-right) on either mobile or desktop.
   */
  export default function SkipToStoreListButton() {
    const [hidden, setHidden] = useState(false);
    const observerRef = useRef<IntersectionObserver | null>(null);

    useEffect(() => {
      /* Re-query on every effect run; the #region anchor is rendered
         further down the page so it may not exist on first paint. We
         poll for up to ~3 s, then attach the IO once it's available. */
      let attached = false;
      let pollId: number | undefined;

      const attach = () => {
        const target = document.querySelector<HTMLElement>("#region");
        if (!target) return false;
        observerRef.current = new IntersectionObserver(
          (entries) => {
            const entry = entries[0];
            if (!entry) return;
            // Hide as soon as the region picker has ANY part on screen.
            setHidden(entry.isIntersecting);
          },
          { threshold: 0, rootMargin: "0px 0px -10% 0px" },
        );
        observerRef.current.observe(target);
        attached = true;
        return true;
      };

      if (!attach()) {
        let tries = 0;
        pollId = window.setInterval(() => {
          if (attach() || ++tries > 30) {
            if (pollId) window.clearInterval(pollId);
          }
        }, 100);
      }

      return () => {
        if (pollId) window.clearInterval(pollId);
        if (attached) observerRef.current?.disconnect();
      };
    }, []);

    return (
      <a
        href="#region"
        aria-label="Skip to store list — jump to the Select your region section"
        className={
          "fixed bottom-[max(1.25rem,env(safe-area-inset-bottom))] left-4 z-40 inline-flex items-center gap-2 rounded-full border border-amber-300/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100 shadow-[0_18px_40px_-12px_rgba(245,185,69,0.45)] backdrop-blur-md transition-opacity duration-300 hover:border-amber-300/70 hover:text-white sm:bottom-6 sm:left-6 sm:px-5 sm:py-3 sm:text-sm sm:tracking-[0.22em] " +
          (hidden ? "pointer-events-none opacity-0" : "opacity-100")
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
  