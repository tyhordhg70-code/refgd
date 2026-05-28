"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import EditableText from "./EditableText";
import { useEditContext } from "@/lib/edit-context";

/**
 * KineticText (IntersectionObserver + iOS replay edition).
 *
 * Words rise from translateY(120%) to none with a stagger. On iOS,
 * the per-word animation replays on every viewport re-entry to
 * defeat the GPU compositor cache (which otherwise leaves words
 * stuck below the mask, requiring a tap to reappear).
 *
 * Re-entry replays use a tighter stagger (1/3 of original) so the
 * re-reveal feels snappier and less repetitive on rescroll.
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

function isIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /iPad|iPhone|iPod/.test(ua) ||
    ((navigator as any).platform === "MacIntel" &&
      (navigator as any).maxTouchPoints > 1)
  );
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
    const root = rootRef.current;
    if (!root || typeof window === "undefined") return;

    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const words = Array.from(
      root.querySelectorAll<HTMLSpanElement>(".kt-word"),
    );
    if (!words.length) return;

    ensureKeyframes();
    const ios = isIOS();

    const initialRect = root.getBoundingClientRect();
    const inViewOnMount =
      initialRect.top < window.innerHeight && initialRect.bottom > 0;

    let firstTrigger = !inViewOnMount;

    if (!inViewOnMount) {
      words.forEach((w) => {
        w.style.transform = "translateY(120%)";
      });
    }

    const play = (baseDelay: number, perWordStagger: number) => {
      // Reset animations on every word so the re-run actually fires.
      words.forEach((w) => {
        w.style.animation = "none";
      });
      // sync reflow
      void root.offsetHeight;
      words.forEach((w, i) => {
        w.style.transform = "";
        const d = baseDelay + i * perWordStagger;
        w.style.animation = `kt-rise 0.45s cubic-bezier(0.25,0.4,0.25,1) ${d}s both`;
      });
    };

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (firstTrigger) {
              firstTrigger = false;
              play(delay, stagger);
            } else if (ios) {
              // Snappier re-reveal: third the stagger, no base delay.
              play(0, stagger / 3);
            }
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
