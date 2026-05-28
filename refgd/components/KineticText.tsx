"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import EditableText from "./EditableText";
import { useEditContext } from "@/lib/edit-context";

/**
 * KineticText — bulletproof CSS-transition reveal.
 * See Reveal.tsx for full doc. Per-word stagger via transition-delay
 * computed in JSX per word.
 */

function ensureCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("kt-css")) return;
  const s = document.createElement("style");
  s.id = "kt-css";
  s.textContent = `
.kt-word{transform:none;transition:transform 0.55s cubic-bezier(0.25,0.4,0.25,1)}
.kt-word.kt-hidden{transform:translate3d(0,120%,0)}
@media (prefers-reduced-motion: reduce){
  .kt-word{transition:none}
  .kt-word.kt-hidden{transform:none}
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
  const [revealed, setRevealed] = useState(false);

  const rawValue = editId ? ctx.getValue(editId, text) : text;
  const value: string =
    typeof rawValue === "string" && rawValue.trim().length > 0
      ? rawValue
      : text;

  useEffect(() => {
    ensureCSS();
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;

    const r = root.getBoundingClientRect();
    if (r.top < (window.innerHeight || 0) * 0.95 && r.bottom > 0) {
      requestAnimationFrame(() => setRevealed(true));
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setRevealed(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "0px 0px -5% 0px", threshold: 0.05 },
    );
    io.observe(root);
    return () => io.disconnect();
  }, [value]);

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
      {words.map((w: string, i: number) => {
        const d = delay + i * stagger;
        return (
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
            <span
              className={`kt-word ${revealed ? "" : "kt-hidden"} inline-block`}
              style={d > 0 ? { transitionDelay: `${d}s` } : undefined}
            >
              {w}
              {i < words.length - 1 ? "\u00A0" : ""}
            </span>
          </span>
        );
      })}
    </Tg>
  );
}
