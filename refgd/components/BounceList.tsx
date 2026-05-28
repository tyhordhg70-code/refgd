"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { isMobileLike } from "@/lib/iosCheck";
import EditableText from "./EditableText";
import { useEditContext } from "@/lib/edit-context";

type Accent =
  | "violet"
  | "cyan"
  | "amber"
  | "rose"
  | "emerald"
  | "indigo"
  | string;

type Props = {
  items: string[];
  accent?: Accent;
  className?: string;
  insert?: Record<number, React.ReactNode>;
  editIdPrefix?: string;
  details?: Record<number, string>;
  detailsEditIdPrefix?: string;
};

const ACCENT: Record<string, { num: string; rgb: string; rgb2: string; rim: string }> = {
  violet:  { num: "text-violet-200",  rgb: "167,139,250", rgb2: "139,92,246",  rim: "rgba(167,139,250,0.55)" },
  cyan:    { num: "text-cyan-200",    rgb: "103,232,249", rgb2: "34,211,238",  rim: "rgba(103,232,249,0.55)" },
  amber:   { num: "text-amber-200",   rgb: "252,211,77",  rgb2: "245,158,11",  rim: "rgba(252,211,77,0.55)"  },
  rose:    { num: "text-rose-200",    rgb: "251,113,133", rgb2: "244,63,94",   rim: "rgba(251,113,133,0.55)" },
  emerald: { num: "text-emerald-200", rgb: "110,231,183", rgb2: "16,185,129",  rim: "rgba(110,231,183,0.55)" },
  indigo:  { num: "text-indigo-200",  rgb: "165,180,252", rgb2: "129,140,248", rim: "rgba(165,180,252,0.55)" },
};

export default function BounceList({
  items, accent = "violet", className = "", insert,
  editIdPrefix, details, detailsEditIdPrefix,
}: Props) {
  const tokens = useMemo(() => ACCENT[accent] ?? ACCENT.violet, [accent]);
  const reduce = useReducedMotion();

  return (
    <ul className={`mt-10 space-y-4 ${className}`} data-testid="bounce-list">
      {items.map((text, i) => (
        <Row
          key={i}
          index={i}
          text={text}
          tokens={tokens}
          reduce={!!reduce}
          afterNode={insert?.[i + 1]}
          editId={editIdPrefix ? `${editIdPrefix}.${i}` : undefined}
          detail={details?.[i]}
          detailEditId={
            detailsEditIdPrefix && details?.[i] != null
              ? `${detailsEditIdPrefix}.${i}`
              : undefined
          }
        />
      ))}
    </ul>
  );
}

function Row({
  index, text, tokens, reduce, afterNode, editId, detail, detailEditId,
}: {
  index: number;
  text: string;
  tokens: (typeof ACCENT)[string];
  reduce: boolean;
  afterNode?: React.ReactNode;
  editId?: string;
  detail?: string;
  detailEditId?: string;
}) {
  const ctx = useEditContext();
  const editing = !!editId && ctx.isAdmin && ctx.editMode;
  const detailEditing = !!detailEditId && ctx.isAdmin && ctx.editMode;
  const value = editId ? ctx.getValue(editId, text) : text;
  const [open, setOpen] = useState(false);
  const elastic = !!detail && !editing && !detailEditing;
  const showDetail = !!detail && (elastic || detailEditing);

  // v28 — mount-tween cinematic entrance on mobile (no IO).
  // Pre-mount: render the visible end state so nothing is stranded
  // invisible if hydration is delayed.
  const [mounted, setMounted] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => {
    setMobile(isMobileLike());
    setMounted(true);
  }, []);

  const flyX = (index % 2 === 0 ? -1 : 1) * 70;

  let initial: any, animateOrWhileInView: any, useAnimate = false, viewport: any;
  if (reduce) {
    initial = { opacity: 0 };
    animateOrWhileInView = { opacity: 1 };
    useAnimate = true;
  } else if (!mounted) {
    initial = { opacity: 1 };
    animateOrWhileInView = { opacity: 1 };
    useAnimate = true;
  } else if (mobile) {
    initial = { opacity: 0, x: flyX, y: 56 };
    animateOrWhileInView = {
      opacity: 1, x: 0, y: 0,
      transition: {
        duration: 0.85,
        delay: Math.min(index * 0.09, 0.55),
        ease: [0.16, 1, 0.3, 1],
      },
    };
    useAnimate = true;
  } else {
    initial = { opacity: 0.001, y: 24, scale: 0.97 };
    animateOrWhileInView = {
      opacity: 1, y: [24, -6, 0], scale: [0.97, 1.015, 1],
      transition: {
        duration: 0.55,
        delay: Math.min(index * 0.04, 0.18),
        times: [0, 0.6, 1],
        ease: [0.22, 1, 0.36, 1],
      },
    };
    viewport = { once: true, margin: "0px 0px -10% 0px" };
  }

  const motionProps: any = { initial, suppressHydrationWarning: true };
  if (useAnimate) motionProps.animate = animateOrWhileInView;
  else { motionProps.whileInView = animateOrWhileInView; motionProps.viewport = viewport; }

  return (
    <>
      <motion.li
        {...motionProps}
        className="group relative isolate"
        data-testid={`bounce-list-item-${index}`}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `conic-gradient(from 180deg at 50% 50%, rgba(${tokens.rgb},0) 0deg, rgba(${tokens.rgb},0.55) 90deg, rgba(${tokens.rgb2},0.55) 180deg, rgba(${tokens.rgb},0) 270deg)`,
            filter: "blur(12px)",
          }}
        />
        <div
          className={`relative flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.035] px-5 py-4 backdrop-blur-md transition-shadow duration-500 group-hover:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] sm:gap-6 sm:px-6 sm:py-5 ${
            elastic ? `bounce-elastic ${open ? "is-open" : ""}` : ""
          } ${detailEditing ? "bounce-elastic is-open" : ""}`}
          style={{ boxShadow: `0 12px 30px -18px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)` }}
          onClick={elastic ? () => setOpen((o) => !o) : undefined}
          role={elastic ? "button" : undefined}
          tabIndex={elastic ? 0 : undefined}
          onKeyDown={
            elastic
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setOpen((o) => !o);
                  }
                }
              : undefined
          }
          aria-expanded={elastic ? open : undefined}
        >
          <div className="relative shrink-0">
            <span
              className={`heading-display block text-[0.7rem] font-bold uppercase tracking-[0.35em] ${tokens.num}`}
              style={{ textShadow: `0 0 18px ${tokens.rim}, 0 0 2px ${tokens.rim}` }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div
              aria-hidden
              className="mt-1 h-px w-8"
              style={{ background: `linear-gradient(90deg, rgba(${tokens.rgb},0.9), transparent)` }}
            />
          </div>
          <div className="relative flex-1">
            <p className="text-[0.98rem] leading-relaxed text-white/85 sm:text-lg">
              {editId ? (
                <EditableText id={editId} defaultValue={text} as="span" multiline />
              ) : (
                value
              )}
            </p>
            {showDetail ? (
              <div className="bounce-elastic-content">
                {detailEditId ? (
                  <EditableText
                    id={detailEditId}
                    defaultValue={detail || ""}
                    as="p"
                    multiline
                    className="text-[0.92rem] leading-relaxed text-white/65 sm:text-base"
                  />
                ) : (
                  <p className="text-[0.92rem] leading-relaxed text-white/65 sm:text-base">{detail}</p>
                )}
              </div>
            ) : null}
          </div>
          {elastic ? (
            <div className="bounce-elastic-arrow shrink-0 self-center text-white/55">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          ) : null}
        </div>
      </motion.li>
      {afterNode ? (
        <li aria-hidden="true" className="list-none pt-2" data-testid={`bounce-list-insert-${index + 1}`}>
          {afterNode}
        </li>
      ) : null}
    </>
  );
}
