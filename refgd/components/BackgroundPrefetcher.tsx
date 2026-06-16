"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { prefetchOtherRouteMedia } from "@/lib/asset-preloader";

/**
 * Warms every OTHER route's heavy hero video into the browser's immutable HTTP
 * cache while the user is on the current page, so navigating to a video page
 * later plays instantly — no buffering, no loading-screen wait. Mounted once in
 * the root layout and re-evaluated on every route change. Idle-scheduled,
 * sequential, and connection-aware (skips Data Saver / 2g) so it never competes
 * with the active page or burns a metered mobile plan. Renders nothing.
 */
export default function BackgroundPrefetcher() {
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window === "undefined") return;
    let cancelled = false;
    let timer = 0;

    const kick = () => {
      if (!cancelled) void prefetchOtherRouteMedia(pathname ?? "/");
    };

    // Hold off until the current page has settled, then start warming the
    // others during idle. First load waits for the `load` event; client-side
    // navigations (readyState already "complete") just wait out a short delay.
    if (document.readyState === "complete") {
      timer = window.setTimeout(kick, 2500);
      return () => {
        cancelled = true;
        window.clearTimeout(timer);
      };
    }

    const onLoad = () => {
      timer = window.setTimeout(kick, 2500);
    };
    window.addEventListener("load", onLoad, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", onLoad);
      window.clearTimeout(timer);
    };
  }, [pathname]);

  return null;
}
