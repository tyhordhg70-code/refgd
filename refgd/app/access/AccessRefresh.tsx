"use client";

import { useEffect } from "react";

/** Reloads the page periodically while an order is still pending payment. */
export default function AccessRefresh({ seconds = 8 }: { seconds?: number }) {
  useEffect(() => {
    const t = setInterval(() => {
      // Skip hidden tabs — reloading then only churns the server and
      // restarts the page while nobody is looking.
      if (document.hidden) return;
      window.location.reload();
    }, seconds * 1000);
    return () => clearInterval(t);
  }, [seconds]);
  return null;
}
