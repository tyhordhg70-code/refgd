"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import EditableText from "./EditableText";
import { useEditContext } from "@/lib/edit-context";

/**
 * KineticText (glass-card-reveal pattern — iOS-eviction-safe).
 * See Reveal.tsx for full strategy. Per-word stagger via inline
 * animation-delay on each .kt-word.
 */

function ensureCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("kt-css")) return;
  const s = document.createElement("style");
  s.id = "kt-css";
  s.textContent = `
.kt-word{transform:none}
.kt-word.kt-pending{transform:translate3d(0,120%,0)}
@keyframes kt-rise{from{transform:translateY(120%)}to{transform:none}}
.kt-word.kt-go{animation:kt-rise 0.45s cubic-bezier(0.25,0.4,0.25,1) backwards}
@media (prefers-reduced-motion: reduce){
  .kt-word.kt-pending{transform:none}
  .kt-word.kt-go{animation:none}
}`;
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
    ensureCSS();
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;

    const done: WeakSet<Element> =
      (window as any).__ktDone ??
      ((window as any).__ktDone = new WeakSet());
    if (done.has(root)) return;

    const words = Array.from(
      root.querySelectorAll<HTMLSpanElement>(".kt-word"),
    );
    if (!words.length) return;

    const initialRect = root.getBoundingClientRect();
    const inViewOnMount =
      initialRect.top < window.innerHeight && initialRect.bottom > 0;

    if (inViewOnMount) {
      done.add(root);
      return;
    }

    words.forEach((w) => w.classList.add("kt-pending"));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            done.add(root);
            words.forEach((w, i) => {
              const d = delay + i * stagger;
              if (d > 0) w.style.animationDelay = `${d}s`;
              w.classList.remove("kt-pending");
              w.classList.add("kt-go");
            });
            observer.disconnect();
          }
        }
      },
      { threshold: 0.01 },
    );

    observer.observe(root);
    return () => observer.disconnect();
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
