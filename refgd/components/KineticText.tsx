"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import EditableText from "./EditableText";
import { useEditContext } from "@/lib/edit-context";

/**
 * KineticText v9 — rAF-poll scroll detection (Lenis-safe).
 *
 * Same root-cause fixes as SafeReveal v12:
 *  1. IntersectionObserver and window scroll listener both fail with Lenis.
 *     Replaced with rAF polling using getBoundingClientRect() which sees the
 *     post-transform (visual) position that Lenis shifts around.
 *  2. `if (!mounted) return` inside trigger's double-rAF killed the animation
 *     when the effect re-ran (admin-context dep change) between the two frames.
 *     Removed — a triggered animation always completes.
 *  3. clearAll() called at TOP of every effect run to wipe stale inline styles
 *     from any previous interrupted run (prevents stuck-at-opacity:0 ghosts).
 *  4. cleanup resets styles only when trigger has not yet fired.
 *  5. WeakSet entry written only after trigger fires, never speculatively.
 */
export default function KineticText({
  text,
  className = "",
  delay = 0,
  stagger = 0.06,
  as: Tag = "h1",
  style,
  editId,
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
  const ctx = useEditContext();
  const editing = !!editId && ctx.isAdmin && ctx.editMode;
  const rootRef = useRef<HTMLElement | null>(null);

  const rawValue = editId ? ctx.getValue(editId, text) : text;
  const value: string =
    typeof rawValue === "string" && rawValue.trim().length > 0
      ? rawValue
      : text;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;

    // Persistent reveal guard.
    const ktRevealed: WeakSet<Element> =
      (window as any).__ktRevealed ??
      ((window as any).__ktRevealed = new WeakSet());
    if (ktRevealed.has(root)) return;

    const words = Array.from(root.querySelectorAll<HTMLSpanElement>(".kt-word"));
    if (!words.length) return;

    // Wipe stale inline styles from any previous interrupted run.
    const clearAll = () => {
      words.forEach((w) => {
        w.style.transition = "";
        w.style.transitionDelay = "";
        w.style.transform = "";
        w.style.filter = "";
        w.style.willChange = "";
      });
    };
    clearAll();

    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      ktRevealed.add(root);
      return;
    }

    // Already in view on mount — mark revealed, leave visible.
    const initialRect = root.getBoundingClientRect();
    if (initialRect.top < window.innerHeight && initialRect.bottom > 0) {
      ktRevealed.add(root);
      return;
    }

    words.forEach((w) => {
      w.style.transform = "translateY(120%)";
      w.style.filter = "blur(6px)";
      w.style.willChange = "transform, filter";
    });

    let triggered = false;

    const trigger = () => {
      if (triggered) return;
      triggered = true;
      ktRevealed.add(root);

      words.forEach((w, i) => {
        w.style.transition =
          "transform 0.85s cubic-bezier(0.25,0.4,0.25,1), filter 0.85s cubic-bezier(0.25,0.4,0.25,1)";
        const d = delay + i * stagger;
        if (d > 0) w.style.transitionDelay = `${d}s`;
      });

      const totalMs = (delay + (words.length - 1) * stagger + 0.85) * 1000 + 250;

      // No mounted guard — triggered animation always completes.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          words.forEach((w) => {
            w.style.transform = "";
            w.style.filter = "";
          });
          window.setTimeout(clearAll, totalMs);
        });
      });
    };

    const safety = window.setTimeout(trigger, 3000);

    // rAF poll — visual (post-Lenis-transform) position check every frame.
    let active = true;
    let rafId = 0;

    const poll = () => {
      if (!active) return;
      const r = root.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.92 && r.bottom > 0) {
        trigger();
        window.clearTimeout(safety);
      } else {
        rafId = requestAnimationFrame(poll);
      }
    };
    rafId = requestAnimationFrame(poll);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      window.clearTimeout(safety);
      if (!triggered) clearAll();
    };
  }, [value, delay, stagger]);

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

  const words = value.split(" ");
  const Tg = Tag as any;

  return (
    <Tg
      ref={rootRef}
      className={className}
      style={style}
      aria-label={value}
      suppressHydrationWarning
    >
      {words.map((w: string, i: number) => (
        <span
          key={i}
          className="kt-mask inline-block overflow-hidden align-bottom"
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
          <span className="kt-word inline-block">
            {w}
            {i < words.length - 1 ? "\u00A0" : ""}
          </span>
        </span>
      ))}
    </Tg>
  );
}
