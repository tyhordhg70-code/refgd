"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import EditableText from "./EditableText";
import { useEditContext } from "@/lib/edit-context";

/**
 * KineticText v11
 *
 * Same root-cause fix as SafeReveal v13: safety timer removed.
 *
 * The 3-second safety timer was firing while the LoadingScreen overlay
 * was still blocking the page — triggering all heading animations
 * invisibly behind the splash screen. When the screen lifted, all
 * headings were already at their natural state and no animation played.
 *
 * With the timer gone the rAF poll (getBoundingClientRect, visual
 * position) is the sole trigger. Headings animate exactly when they
 * enter the visible viewport after the loading screen dismisses.
 */
export default function KineticText({
  text,
  className = "",
  delay = 0,
  stagger = 0.025,
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

    const ktRevealed: WeakSet<Element> =
      (window as any).__ktRevealed ??
      ((window as any).__ktRevealed = new WeakSet());
    if (ktRevealed.has(root)) return;

    const words = Array.from(root.querySelectorAll<HTMLSpanElement>(".kt-word"));
    if (!words.length) return;

    const clearAll = () => {
      words.forEach((w) => {
        w.style.transition = "";
        w.style.transitionDelay = "";
        w.style.transform = "";
        w.style.willChange = "";
      });
    };
    clearAll(); // wipe any stale styles from previous interrupted run

    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      ktRevealed.add(root);
      return;
    }

    const initialRect = root.getBoundingClientRect();
    if (initialRect.top < window.innerHeight) {
      ktRevealed.add(root);
      return;
    }

    words.forEach((w) => {
      w.style.transform = "translateY(120%)";
      w.style.willChange = "transform";
    });

    let triggered = false;

    const trigger = () => {
      if (triggered) return;
      triggered = true;
      ktRevealed.add(root);

      words.forEach((w, i) => {
        w.style.transition =
          "transform 0.45s cubic-bezier(0.25,0.4,0.25,1)";
        const d = delay + i * stagger;
        if (d > 0) w.style.transitionDelay = `${d}s`;
      });

      const totalMs = (delay + (words.length - 1) * stagger + 0.45) * 1000 + 250;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          words.forEach((w) => {
            w.style.transform = "";
          });
          window.setTimeout(clearAll, totalMs);
        });
      });
    };

    // rAF poll — no safety timer (see class doc above).
    let active = true;
    let rafId = 0;

    const poll = () => {
      if (!active) return;
      const r = root.getBoundingClientRect();
      if (r.top < window.innerHeight) {
        trigger();
      } else {
        rafId = requestAnimationFrame(poll);
      }
    };
    rafId = requestAnimationFrame(poll);

    return () => {
      active = false;
      cancelAnimationFrame(rafId);
      if (!triggered) clearAll(); // only reset if anim never fired (avoid rescroll-vanish flash)
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
