"use client";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";
import EditableImage from "./EditableImage";
import { useEditContext } from "@/lib/edit-context";

/**
 * FloatingArt — small inline animated illustration intended to live
 * INSIDE editorial sections (e.g. "Evade like a PRO", "Comprehensive
 * solutions"). Combines:
 *   - scroll-driven Y drift + scale + rotate (parallax)
 *   - a continuous gentle bob/sway (CSS keyframes via framer)
 *   - one-shot reveal on viewport enter (replays on every entry)
 *
 * No backdrop / halo — the image must already be a transparent PNG/WebP
 * so the page galaxy shows through cleanly.
 *
 * v6.13.15 — Two upgrades from this revision:
 *   1. ADMIN: when `editId` is provided, the image is rendered inside
 *      <EditableImage> so admins can swap it, apply animation
 *      templates, scale, add/remove space below, and reorder. The
 *      framer rotate animation is suppressed in admin mode so the
 *      admin can see the image squarely while editing.
 *   2. USER: rotate amplitude defaults dropped 3° → 1.2° and bob
 *      amplitude 18 → 10 px. The user reported the previous values
 *      read as "distorted illustration" on Evade page. Smaller
 *      values keep the float life without ever appearing to skew
 *      the artwork.
 */
type Props = {
  src: string;
  alt: string;
  size?: number;            // max width in px
  side?: "left" | "right" | "center";
  bobAmplitude?: number;    // px of vertical bob
  spin?: number;            // degrees of gentle continuous rotation
  className?: string;
  /** When set, image becomes admin-editable under this content id. */
  editId?: string;
};

export default function FloatingArt({
  src,
  alt,
  size = 320,
  side = "center",
  bobAmplitude = 10,
  spin = 1.2,
  className = "",
  editId,
}: Props) {
  const { isAdmin, editMode } = useEditContext();
  const editing = isAdmin && editMode && Boolean(editId);
  const ref = useRef<HTMLDivElement | null>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  // v6.7 — TIGHTENED parallax range (was [60, -60] / [0.92,1.05,0.94]).
  // The previous values pushed the artwork ~60 px DOWN at section
  // entry, leaving a huge empty gap above the image (the user
  // reported this as "huge gap above the comprehensive solutions
  // illustration"). New range keeps the image close to its layout
  // position so spacing reads naturally; bob animation still gives
  // it life.
  const y = useTransform(scrollYProgress, [0, 1], [12, -12]);
  // v6.13.4 — REMOVED scroll-driven scale + rotate (same fix as
  // EvadeIllustrationDivider). The pulsing scale 0.98→1.02→0.98
  // visibly squashed the artwork mid-scroll AND, at the 0.98 dip,
  // exposed a thin strip of page-bg above + below the image which
  // the user perceived as a "black bar appearing and disappearing".
  // The infinite bob animation on the inner motion.img below still
  // gives the illustration life without ever shrinking it inside
  // its slot.

  const justify =
    side === "left" ? "justify-start" : side === "right" ? "justify-end" : "justify-center";

  return (
    <div ref={ref} className={`relative flex w-full ${justify} ${className}`}>
      <motion.div
        style={{ y, maxWidth: size }}
        className="relative w-full"
        // v6.7 — softer entrance: was scale:0.7 + blur:12px (a
        // dramatic "fly in from the void" that visibly compressed
        // the image upward leaving an empty top gap). Now: gentle
        // opacity-only fade with a subtle scale settle, so the
        // image holds its slot from the moment it enters view.
        initial={{ opacity: 0, scale: 0.96 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true, amount: 0.2 }}
        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      >
        {editing && editId ? (
          /* In admin edit-mode we render the EditableImage directly
             so the click-to-edit popover works. The ambient bob/
             rotate is suppressed in this mode so the admin can
             see the artwork squarely while changing settings. */
          <EditableImage
            id={editId}
            defaultSrc={src}
            alt={alt}
            wrapperClassName="block w-full"
            className="block w-full h-auto object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.45)]"
          />
        ) : (
          <motion.img
            src={src}
            alt={alt}
            loading="eager"
            decoding="async"
            /* v6.13.15 — softened drop-shadow (was 24/50/0.55).
               The thicker shadow combined with the rotation
               keyframes was reading as "distorted illustration"
               on the Evade page: as the image rotated ±3°, the
               heavy shadow swept along with it and the eye saw
               the artwork shearing. Smaller shadow + smaller
               rotation (now ±1.2°) restores a clean float. */
            className="block w-full h-auto object-contain drop-shadow-[0_18px_36px_rgba(0,0,0,0.45)]"
            data-editable-id={editId}
            animate={{
              y: [0, -bobAmplitude, 0, bobAmplitude * 0.6, 0],
              rotate: [0, spin, 0, -spin, 0],
            }}
            transition={{
              duration: 7,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            suppressHydrationWarning
          />
        )}
      </motion.div>
    </div>
  );
}
