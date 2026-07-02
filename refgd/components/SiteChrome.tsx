"use client";

/**
 * Renders the site's decorative / navigational chrome everywhere EXCEPT the
 * /community section.
 *
 * /community is a 1:1 Telegram Web replica that must look and behave like a
 * standalone app: no cosmic galaxy background, no Nav, no announcement
 * banner, no custom cursor, no background music, no Lenis smooth scrolling
 * (the page has no page scroll — only native internal scroll containers)
 * and no route-transition splash. Gating happens by pathname at render time;
 * Next.js knows the pathname during SSR so there is no hydration mismatch,
 * and unmounting on client-side navigation runs each component's cleanup
 * (Lenis destroy, cursor class removal, music pause).
 */
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function isChromelessPath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/community" || pathname.startsWith("/community/");
}

export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  if (isChromelessPath(pathname)) return null;
  return <>{children}</>;
}
