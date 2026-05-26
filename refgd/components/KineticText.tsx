"use client";
import {
  useEffect,
  useRef,
  type CSSProperties,
} from "react";
import EditableText from "./EditableText";
import { useEditContext } from "@/lib/edit-context";

/**
 * KineticText v3 — Web Animations API + native IntersectionObserver.
 *
 * Why v3 exists:
 *   v2 used framer-motion variants with `hidden: { y: "60%" }` inside
 *   `<span overflow:hidden>` masks. When framer's variant system
 *   failed to transition `hidden → show` (race on hydration, Lenis
 *   smooth-scroll interfering with whileInView, force-dynamic SSR
 *   hydration mismatch), words stayed at y:60% — completely masked
 *   by the parent overflow:hidden = INVISIBLE TITLE. The "Evade like
 *   a PRO" / "Our comprehensive solutions" / "What you'll master"
 *   vanishing-header bug.
 *
 * v3 design:
 *   • SSR + initial client render: words are at REST (y:0, no blur,
 *     opacity:1). Title is ALWAYS fully visible from first paint.
 *     If JS fails to hydrate, title is still 100% readable.
 *   • Entrance animation is played via WAAPI (`element.animate(...)`),
 *     which is transient. When the animation completes, words return
 *     to their natural rest state. Words can NEVER end up stuck
 *     masked-invisible.
 *   • Scroll trigger uses native IntersectionObserver (not framer's
 *     whileInView wrapper). Native IO is Lenis-safe.
 *   • No two-phase render — single render tree means no DOM swap on
 *     hydration and no class-flip race.
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
  const playedRef = useRef(false);

  const rawValue = editId ? ctx.getValue(editId, text) : text;
  const value: string =
    typeof rawValue === "string" && rawValue.trim().length > 0
      ? rawValue
      : text;

  useEffect(() => {
    const root = rootRef.current;
    if (!root || playedRef.current) return;
    if (typeof window === "undefined") return;
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;

    const play = () => {
      if (playedRef.current) return;
      playedRef.current = true;
      const words = root.querySelectorAll<HTMLSpanElement>(".kt-word");
      words.forEach((wordEl, i) => {
        if (typeof wordEl.animate !== "function") return;
        try {
          wordEl.animate(
            [
              { transform: "translateY(60%)", filter: "blur(6px)" },
              { transform: "translateY(0)", filter: "blur(0)" },
            ],
            {
              duration: 850,
              delay: delay * 1000 + i * stagger * 1000,
              easing: "cubic-bezier(0.25, 0.4, 0.25, 1)",
              fill: "backwards",
            },
          );
        } catch {
          /* word stays at rest — still visible */
        }
      });
    };

    if (typeof IntersectionObserver === "undefined") {
      play();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            play();
            io.disconnect();
            break;
          }
        }
      },
      { threshold: 0.1 },
    );
    io.observe(root);
    return () => io.disconnect();
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
