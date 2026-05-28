"use client";
import { useEffect, useState, type ReactNode } from "react";
import { isIOSSafariLike } from "@/lib/iosCheck";

/**
 * IOSHide — renders children on every device EXCEPT iOS Safari
 * (iPhone, iPad including iPadOS-as-Mac).
 *
 * Use this for purely decorative GPU-heavy layers (animated orbs,
 * particles, twinkling stars, large backdrop-filter atmospheres,
 * etc) that overwhelm iOS Safari's compositor budget. When iOS
 * runs out of GPU layer memory it evicts the wrong layers — your
 * actual content layers — and the user sees their content vanish
 * on scroll-back because the decorative animations stayed live.
 *
 * The storelist page in particular had ~320 GPU-animated elements
 * inside a single 1000vh background wrapper (9 orb-mesh layers +
 * 21 pulsating spots + 90 floating particles + 200 twinkling
 * stars), which reliably caused regions, the LED ticker and the
 * submit-order CTA to vanish on rescroll on iPhone Safari no
 * matter what reveal mechanism the foreground used.
 *
 * SSR-friendly: renders children on the server (so SEO/initial
 * paint are unaffected), then removes them on the client if iOS
 * Safari is detected. Brief flash of atmosphere on iOS is
 * acceptable; the alternative is the user's actual content
 * disappearing.
 */
export default function IOSHide({ children }: { children: ReactNode }) {
  const [hide, setHide] = useState(false);

  useEffect(() => {
    if (isIOSSafariLike()) setHide(true);
  }, []);

  if (hide) return null;
  return <>{children}</>;
}
