"use client";
  import { motion, useReducedMotion } from "framer-motion";
  import { useEffect, useState, type CSSProperties } from "react";
  import EditableText from "./EditableText";
  import { useEditContext } from "@/lib/edit-context";

  /**
   * Word-by-word kinetic reveal. Each word fades + lifts + un-blurs in
   * sequence — DeSo / noomoagency editorial entrance.
   *
   * v6.14.1 — Restored kinetic animation with a two-phase render:
   *   Phase 1 (SSR + first paint): plain static text — always visible,
   *   zero opacity-0 in HTML. Eliminates the "vanishing on hydration"
   *   / "headers gone on slow connection" issue.
   *   Phase 2 (after first rAF): swaps to animated motion container
   *   with key="play" so it mounts fresh and the kinetic entrance plays
   *   from hidden→show without any hydration mismatch.
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

    // Phase switch: start static (SSR-safe), trigger animation after
    // first browser paint so the kinetic effect always fires visibly.
    const [phase, setPhase] = useState<"static" | "play">("static");
    useEffect(() => {
      const raf = requestAnimationFrame(() => setPhase("play"));
      return () => cancelAnimationFrame(raf);
    }, []);

    // In edit mode, swap the animated heading for a plain editable one.
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
    // Robust blank check: null/undefined/whitespace-only → fall back.
      const isBlank = (v: unknown): boolean =>
        v == null || (typeof v === "string" && v.trim() === "");
      const value: string =
        !isBlank(rawValue) && typeof rawValue === "string" ? rawValue : text;
    const words = value.split(" ");

    // Phase 1 (SSR + first paint) and reduced-motion: plain visible text.
    if (phase === "static" || reduced) {
      const Plain = Tag as any;
      return (
        <Plain className={className} style={style} aria-label={value}>
          {value}
        </Plain>
      );
    }

    // Phase 2: kinetic word-by-word animation.
    const M = motion[Tag as keyof typeof motion] as any;
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
                hidden: { y: "110%", opacity: 0, filter: "blur(8px)" },
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
  