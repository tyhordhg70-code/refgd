"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import EditableText from "./EditableText";
import { useEditContext } from "@/lib/edit-context";

/**
 * KineticText (keyframes edition)
 *
 * Same iOS-compositor fix as Reveal/SafeReveal keyframes edition.
 *
 * Words previously animated via a CSS transition on inline transform
 * (translateY(120%) -> ""). iOS Safari's GPU compositor cached the
 * primed transform and ignored the cascade when the inline style was
 * cleared, leaving words stuck below the mask (invisible) until tapped.
 *
 * This version uses a CSS @keyframes animation with
 * animation-fill-mode:both. Each word gets the same animation with a
 * staggered animation-delay. The compositor holds the `to` state
 * (transform:none) forever after completion — no cascade fallback,
 * no stale GPU layer possible.
 */

function ensureKeyframes() {
  if (typeof document === "undefined") return;
  if (document.getElementById("kt-keyframes")) return;
  const s = document.createElement("style");
  s.id = "kt-keyframes";
  s.textContent =
    "@keyframes kt-rise{from{transform:translateY(120%)}to{transform:none}}";
  document.head.appendChild(s);
}

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
    ensureKeyframes();
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;

    const ktRevealed: WeakSet<Element> =
      (window as any).__ktRevealed ??
      ((window as any).__ktRevealed = new WeakSet());
    if (ktRevealed.has(root)) return;

    const words = Array.from(root.querySelectorAll<HTMLSpanElement>(".kt-word"));
    if (!words.length) return;

    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      ktRevealed.add(root);
      return;
    }

    // Already in view on mount — skip animation, keep words at natural state.
    const initialRect = root.getBoundingClientRect();
    if (initialRect.top < window.innerHeight) {
      ktRevealed.add(root);
      return;
    }

    // Prime words to off-screen below mask. Inline transform here will
    // be overridden by the animation once it starts (animations have
    // higher precedence than inline styles for animated properties).
    words.forEach((w) => {
      w.style.transform = "translateY(120%)";
    });

    let triggered = false;
    let active = true;
    let rafId = 0;

    const trigger = () => {
      if (triggered) return;
      triggered = true;
      ktRevealed.add(root);

      words.forEach((w, i) => {
        const d = delay + i * stagger;
        // animation-fill-mode:both holds `from` during the delay phase
        // and `to` (transform:none) forever after completion. The
        // compositor tracks the animation lifecycle — no opportunity
        // to revert to a cached stale layer.
        w.style.animation = `kt-rise 0.45s cubic-bezier(0.25,0.4,0.25,1) ${d}s both`;
        // Clear the primed inline transform so the animation has full
        // control. (Animations override inline styles, so this just
        // avoids leaving stale inline styles around.)
        w.style.transform = "";
      });
    };

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
      if (!triggered) {
        // Reset primed styles so element is visible at natural state.
        words.forEach((w) => {
          w.style.transform = "";
        });
      }
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
