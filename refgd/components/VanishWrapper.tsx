"use client";
import { motion, useReducedMotion } from "framer-motion";
import { type ReactNode } from "react";

/**
 * VanishWrapper — wraps a block of cards / content with a one-shot
 * scroll-into-view ENTRANCE only.
 *
 * Earlier versions of this wrapper were tied to scroll progress and
 * faded the wrapped block back OUT once the section scrolled past
 * mid-screen. That caused the "What's Included" boxcards on the
 * mentorship page to vanish + reappear every time the user scrolled
 * past the section, which the user explicitly does not want — they
 * want the entrance only. Now this is a thin wrapper around a single
 * `whileInView` fade-in: the cards slide / fade in once and stay put
 * forever after.
 *
 * `drift` and `minScale` are kept in the API for backwards-compat with
 * existing callers (`drift={50} minScale={0.92}`) so the props don't
 * have to be removed everywhere.
 */
export default function VanishWrapper({
  children,
  className = "",
  drift = 36,
  minScale = 0.94,
}: {
  children: ReactNode;
  className?: string;
  drift?: number;
  minScale?: number;
}) {
  const reduce = useReducedMotion();

  if (reduce) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: drift, scale: minScale }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: "0px 0px -10% 0px" }}
      transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
      style={{ willChange: "opacity, transform" }}
      suppressHydrationWarning
    >
      {children}
    </motion.div>
  );
}
