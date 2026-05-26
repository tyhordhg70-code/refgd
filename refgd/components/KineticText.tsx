"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import EditableText from "./EditableText";
import { useEditContext } from "@/lib/edit-context";

/**
 * KineticText v5 — per-word CSS-transition reveal with forced-reflow fix.
 *
 * Root cause of "words don't animate" in v4:
 *   Same batch-paint problem as SafeReveal v7. Setting transition +
 *   clearing transform in the same task let the browser skip the
 *   transition entirely. v5 inserts `void el.getBoundingClientRect()`
 *   between applying the transition and clearing the inline styles to
 *   force a committed layout snapshot, so the transition has a real
 *   "from" state to animate away from.
 *
 * Design:
 *   • SSR + initial: words at rest (transform:none, no blur) inside
 *     kt-mask (overflow:hidden). Title fully visible immediately.
 *   • Above-fold titles: stay at rest, no prime, no flash.
 *   • Below-fold: words primed to translateY(60%) + blur(6px), IO
 *     observes root. On entry: forced reflow → transition → words
 *     slide up + sharpen in sequence. After animation: all inline
 *     styles cleared — words permanently at natural rest.
 *   • 6 s safety timer prevents permanent masking if IO fails.
 *   • Reduced-motion: instant reveal on mount.
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

    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    // Above-fold: leave at rest forever.
    const rect = root.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) return;

    const words = Array.from(
      root.querySelectorAll<HTMLSpanElement>(".kt-word"),
    );
    if (!words.length) return;

    words.forEach((w) => {
      w.style.transform = "translateY(60%)";
      w.style.filter = "blur(6px)";
      w.style.willChange = "transform, filter";
    });

    const clearAll = () => {
      words.forEach((w) => {
        w.style.transition = "";
        w.style.transitionDelay = "";
        w.style.transform = "";
        w.style.filter = "";
        w.style.willChange = "";
      });
    };

    let triggered = false;
    const trigger = () => {
      if (triggered) return;
      triggered = true;

      words.forEach((w, i) => {
        w.style.transition =
          "transform 0.85s cubic-bezier(0.25,0.4,0.25,1), filter 0.85s cubic-bezier(0.25,0.4,0.25,1)";
        const d = delay + i * stagger;
        if (d > 0) w.style.transitionDelay = `${d}s`;
      });

      // *** THE FIX ***
      // Force a layout commit so the browser sees the primed state
      // (translateY 60% / blur 6px) before we clear it. Without this
      // the browser batches transition + clear and shows final state
      // instantly — no animation fires.
      void root.getBoundingClientRect();

      // Clear — browser animates from committed primed state to rest.
      words.forEach((w) => {
        w.style.transform = "";
        w.style.filter = "";
      });

      const totalMs =
        (delay + (words.length - 1) * stagger + 0.85) * 1000 + 250;
      window.setTimeout(clearAll, totalMs);
    };

    const safety = window.setTimeout(trigger, 6000);

    if (typeof IntersectionObserver === "undefined") {
      trigger();
      window.clearTimeout(safety);
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            trigger();
            window.clearTimeout(safety);
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.1 },
    );
    io.observe(root);

    return () => {
      io.disconnect();
      window.clearTimeout(safety);
      clearAll();
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
