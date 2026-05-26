"use client";
import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState, type CSSProperties } from "react";
import EditableText from "./EditableText";
import { useEditContext } from "@/lib/edit-context";

/**
 * Word-by-word kinetic reveal. Each word slides up from behind a mask
 * and un-blurs. Crucially: opacity stays 1 throughout — the visible
 * reveal comes from the parent's `overflow: hidden` mask that hides
 * each word's y:60% start position, NOT from opacity. This eliminates
 * the "headline vanishes on hydration" failure mode where animations
 * stall mid-flight and leave words at opacity:0 forever.
 *
 * Two-phase render:
 *   Phase 1 (SSR + first paint): plain static text — always visible.
 *   Phase 2 (after first rAF): swaps to motion container with
 *     key="play" so the kinetic entrance plays from masked-down→0.
 */
export default function KineticText({
  text,
  className = "",
  delay = 0,
  stagger = 0.06,
  as: Tag = "h1",
  style,
  editId,
  mountTrigger,
}: {
  text: string;
  className?: string;
  delay?: number;
  stagger?: number;
  as?: keyof JSX.IntrinsicElements;
  style?: CSSProperties;
  editId?: string;
  mountTrigger?: boolean;
}) {
  const reduced = useReducedMotion();
  const ctx = useEditContext();
  const editing = !!editId && ctx.isAdmin && ctx.editMode;

  const [phase, setPhase] = useState<"static" | "play">("static");
  useEffect(() => {
    const raf = requestAnimationFrame(() => setPhase("play"));
    return () => cancelAnimationFrame(raf);
  }, []);

  if (editing) {
    return (
      <EditableText
        id={editId!}
        defaultValue={text}
        as={Tag}
        className={className}
      />
    );
  }

  const rawValue = editId ? ctx.getValue(editId, text) : text;
  const isBlank = (v: unknown): boolean =>
    v == null || (typeof v === "string" && v.trim() === "");
  const value: string =
    !isBlank(rawValue) && typeof rawValue === "string" ? rawValue : text;
  const words = value.split(" ");

  if (phase === "static" || reduced) {
    const Plain = Tag as any;
    return (
      <Plain className={className} style={style} aria-label={value}>
        {value}
      </Plain>
    );
  }

  const M = (motion as any)[Tag as keyof typeof motion];
  const useMountMode = mountTrigger !== undefined;
  return (
    <M
      key="play"
      className={className}
      style={style}
      initial="hidden"
      {...(useMountMode
        ? { animate: mountTrigger ? "show" : "hidden" }
        : { animate: "show" })}
      transition={{ staggerChildren: stagger, delayChildren: delay }}
      aria-label={value}
    >
      {words.map((w, i) => (
        <span
          key={i}
          className="inline-block overflow-hidden align-bottom"
          style={{
            paddingBottom: "0.18em",
            paddingTop: "0.06em",
            paddingLeft: "0.05em",
            paddingRight: "0.05em",
            marginLeft: "-0.05em",
            marginRight: "-0.05em",
          }}
          aria-hidden="true"
        >
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: "60%", opacity: 1, filter: "blur(6px)" },
              show: {
                y: "0%",
                opacity: 1,
                filter: "blur(0px)",
                transition: { duration: 0.85, ease: [0.25, 0.4, 0.25, 1] },
              },
            }}
            suppressHydrationWarning
          >
            {w}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </M>
  );
}
