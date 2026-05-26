"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import EditableText from "./EditableText";
import { useEditContext } from "@/lib/edit-context";

/**
 * KineticText v4 — bulletproof CSS-transition word reveal.
 *
 * Why v4:
 *   v3 used WAAPI with `fill: backwards`. With `fill:backwards`,
 *   words with a non-zero delay are INVISIBLE during the delay
 *   window — even after the animation should have started. For
 *   "Our comprehensive solutions." last word delay ~0.18s; for
 *   longer titles, words were briefly invisible.
 *   Also: animations fired on first observe — for above-fold
 *   titles that immediately become IO-intersecting at mount,
 *   the word would briefly jump to its `from` state (y:60%
 *   masked by parent overflow:hidden = MASKED INVISIBLE) before
 *   animating back. That's the "title vanishes on page load".
 *
 * v4 design:
 *   1. SSR + initial client paint: every word is at REST
 *      (transform:none, no blur). Inside the kt-mask parent
 *      (overflow:hidden) they're at y:0 = fully visible.
 *      If JS never loads, the title is fully readable.
 *   2. At mount: measure root bounding rect.
 *        • Above-fold: leave words at rest. No mask reveal, no
 *          per-word stagger. Title is solid from frame 1.
 *        • Below-fold: prime each word inline to y:60%/blur(6px),
 *          attach native IO. On entry: apply transition + clear
 *          inline styles, words slide up + sharpen in sequence.
 *          After full animation, all inline styles cleared so the
 *          words sit at natural rest (can never stay stuck masked).
 *   3. 6 s safety timer force-clears all primed inline styles if
 *      IO never fires — title never stays masked forever.
 *   4. Reduced-motion: skip entirely.
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

    // Above-fold: leave at rest forever — no per-word animation.
    const rect = root.getBoundingClientRect();
    const inViewport =
      rect.top < window.innerHeight && rect.bottom > 0;
    if (inViewport) return;

    const words = Array.from(
      root.querySelectorAll<HTMLSpanElement>(".kt-word"),
    );
    if (!words.length) return;

    // Prime: hide masked + blurred
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
        w.style.transition = `transform 0.85s cubic-bezier(0.25,0.4,0.25,1), filter 0.85s cubic-bezier(0.25,0.4,0.25,1)`;
        const d = delay + i * stagger;
        if (d > 0) w.style.transitionDelay = `${d}s`;
      });
      requestAnimationFrame(() => {
        words.forEach((w) => {
          w.style.transform = "";
          w.style.filter = "";
        });
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
