"use client";
  import { useEffect, useRef, type CSSProperties } from "react";
  import EditableText from "./EditableText";
  import { useEditContext } from "@/lib/edit-context";

  /**
   * KineticText v8 — same three fixes as SafeReveal v11.
   *
   * FIX 1: Wipe stale inline styles at top of every effect run + clear in
   *   cleanup when trigger has not yet fired. Prevents stuck-at-opacity:0 ghosts
   *   when React re-runs the effect while the heading is already in the viewport.
   *
   * FIX 2: Capture-phase scroll listener using getBoundingClientRect() as a
   *   secondary trigger that works correctly with Lenis transform-based scroll.
   *
   * FIX 3: WeakSet (window.__ktRevealed) only updated AFTER trigger fires.
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

      // Skip permanently-revealed headings.
      const ktRevealed: WeakSet<Element> =
        (window as any).__ktRevealed ??
        ((window as any).__ktRevealed = new WeakSet());
      if (ktRevealed.has(root)) return;

      const reduced =
        typeof window.matchMedia === "function" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (reduced) { ktRevealed.add(root); return; }

      const words = Array.from(root.querySelectorAll<HTMLSpanElement>(".kt-word"));
      if (!words.length) return;

      // FIX 1: Wipe any stale inline styles from a previous interrupted run.
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

      const rect = root.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        ktRevealed.add(root);
        return;
      }

      words.forEach((w) => {
        w.style.transform = "translateY(120%)";
        w.style.filter = "blur(6px)";
        w.style.willChange = "transform, filter";
      });

      let triggered = false;
      let mounted = true;

      const trigger = () => {
        if (triggered) return;
        triggered = true;
        ktRevealed.add(root); // Only mark AFTER trigger fires.

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
            words.forEach((w) => { w.style.transform = ""; w.style.filter = ""; });
            window.setTimeout(clearAll, totalMs);
          });
        });
      };

      const safety = window.setTimeout(trigger, 4000);

      // IO (native scroll).
      let io: IntersectionObserver | null = null;
      if (typeof IntersectionObserver !== "undefined") {
        io = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                trigger();
                window.clearTimeout(safety);
                io!.disconnect();
                break;
              }
            }
          },
          { threshold: 0.1 },
        );
        io.observe(root);
      }

      // FIX 2: Scroll listener for Lenis (getBoundingClientRect sees transforms).
      const onScroll = () => {
        if (triggered) return;
        const r = root.getBoundingClientRect();
        if (r.top < window.innerHeight * 0.95 && r.bottom > 0) {
          trigger();
          window.clearTimeout(safety);
          io?.disconnect();
        }
      };
      window.addEventListener("scroll", onScroll, { passive: true, capture: true });

      return () => {
        mounted = false;
        io?.disconnect();
        window.clearTimeout(safety);
        window.removeEventListener("scroll", onScroll, true);
        // FIX 1 cont: if trigger never fired, reset so next run starts clean.
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
  