"use client";
  import { useEffect, useRef, type CSSProperties } from "react";
  import EditableText from "./EditableText";
  import { useEditContext } from "@/lib/edit-context";

  /**
   * KineticText v6 — double-rAF fix for per-word CSS-transition reveal.
   *
   * v5 used void root.getBoundingClientRect() to force layout commit
   * before clearing primed word transforms. On Safari/WebKit the forced
   * reflow on the ROOT element sometimes did not flush pending inline
   * style changes on child .kt-word spans — browser batched them and
   * skipped the transition entirely.
   *
   * v6: double requestAnimationFrame (same as SafeReveal v9). First rAF
   * fires after primed state is painted. Second rAF clears inline styles
   * so the browser sees a genuine from→to delta per word.
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

      const rect = root.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) return;

      const words = Array.from(
        root.querySelectorAll<HTMLSpanElement>(".kt-word"),
      );
      if (!words.length) return;

      words.forEach((w) => {
        w.style.transform = "translateY(120%)";
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
      let mounted = true;

      const trigger = () => {
        if (triggered) return;
        triggered = true;

        words.forEach((w, i) => {
          w.style.transition =
            "transform 0.85s cubic-bezier(0.25,0.4,0.25,1), filter 0.85s cubic-bezier(0.25,0.4,0.25,1)";
          const d = delay + i * stagger;
          if (d > 0) w.style.transitionDelay = `${d}s`;
        });

        const totalMs = (delay + (words.length - 1) * stagger + 0.85) * 1000 + 250;

        requestAnimationFrame(() => {
          if (!mounted) return;
          requestAnimationFrame(() => {
            if (!mounted) return;
            words.forEach((w) => {
              w.style.transform = "";
              w.style.filter = "";
            });
            window.setTimeout(clearAll, totalMs);
          });
        });
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
        mounted = false;
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
  