"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useMemo } from "react";
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
  /**
   * Optional inline element (image / illustration) to splice between
   * specific list items. The map's keys are 1-based item indices —
   * the inline node renders AFTER that item. e.g. `{ 4: <img /> }`
   * inserts the node between cards 4 and 5.
   */
  insert?: Record<number, React.ReactNode>;
  /**
   * When set, every list item becomes inline-editable for admins.
   * Each item resolves to `${editIdPrefix}.${index}`.
   */
  editIdPrefix?: string;
};

const ACCENT: Record<
  string,
  { num: string; rgb: string; rgb2: string; rim: string }
> = {
  violet: {
    num: "text-violet-200",
    rgb: "167,139,250",
    rgb2: "139,92,246",
    rim: "rgba(167,139,250,0.55)",
  },
  cyan: {
    num: "text-cyan-200",
    rgb: "103,232,249",
    rgb2: "34,211,238",
    rim: "rgba(103,232,249,0.55)",
  },
  amber: {
    num: "text-amber-200",
    rgb: "252,211,77",
    rgb2: "245,158,11",
    rim: "rgba(252,211,77,0.55)",
  },
  rose: {
    num: "text-rose-200",
    rgb: "251,113,133",
    rgb2: "244,63,94",
    rim: "rgba(251,113,133,0.55)",
  },
  emerald: {
    num: "text-emerald-200",
    rgb: "110,231,183",
    rgb2: "16,185,129",
    rim: "rgba(110,231,183,0.55)",
  },
  indigo: {
    num: "text-indigo-200",
    rgb: "165,180,252",
    rgb2: "129,140,248",
    rim: "rgba(165,180,252,0.55)",
  },
};

/**
 * Numbered list with one-shot bounce-in entrance.
 *  – Each row enters with a short fly-up + bounce, completing in
 *    ~0.7s after viewport entry. Cannot freeze mid-scroll.
 *  – Subtle holographic rim glow on hover. No scroll-linked transforms.
 */
export default function BounceList({
  items,
  accent = "violet",
  className = "",
  insert,
  editIdPrefix,
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
        />
      ))}
    </ul>
  );
}

function Row({
  index,
  text,
  tokens,
  reduce,
  afterNode,
  editId,
}: {
  index: number;
  text: string;
  tokens: (typeof ACCENT)[string];
  reduce: boolean;
  afterNode?: React.ReactNode;
  editId?: string;
}) {
  const ctx = useEditContext();
  const editing = !!editId && ctx.isAdmin && ctx.editMode;
  const value = editId ? ctx.getValue(editId, text) : text;
  return (
    <>
      <motion.li
        initial={
          reduce
            ? { opacity: 0 }
            : { opacity: 0, y: 30, scale: 0.96 }
        }
        whileInView={
          reduce
            ? { opacity: 1 }
            : {
                opacity: 1,
                y: [30, -8, 0],
                scale: [0.96, 1.02, 1],
                transition: {
                  duration: 0.7,
                  delay: Math.min(index * 0.06, 0.28),
                  times: [0, 0.6, 1],
                  ease: [0.22, 1, 0.36, 1],
                },
              }
        }
        viewport={{ once: true, margin: "-60px" }}
        className="group relative isolate"
        suppressHydrationWarning
        data-testid={`bounce-list-item-${index}`}
      >
        {/* Holographic rim glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute -inset-px rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
          style={{
            background: `conic-gradient(from 180deg at 50% 50%, rgba(${tokens.rgb},0) 0deg, rgba(${tokens.rgb},0.55) 90deg, rgba(${tokens.rgb2},0.55) 180deg, rgba(${tokens.rgb},0) 270deg)`,
            filter: "blur(12px)",
          }}
        />

        {/* Card body */}
        <div
          className="relative flex items-start gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.035] px-5 py-4 backdrop-blur-md transition-shadow duration-500 group-hover:shadow-[0_24px_60px_-20px_rgba(0,0,0,0.6)] sm:gap-6 sm:px-6 sm:py-5"
          style={{
            boxShadow: `0 12px 30px -18px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)`,
          }}
        >
          {/* Index */}
          <div className="relative shrink-0">
            <span
              className={`heading-display block text-[0.7rem] font-bold uppercase tracking-[0.35em] ${tokens.num}`}
              style={{
                textShadow: `0 0 18px ${tokens.rim}, 0 0 2px ${tokens.rim}`,
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div
              aria-hidden
              className="mt-1 h-px w-8"
              style={{
                background: `linear-gradient(90deg, rgba(${tokens.rgb},0.9), transparent)`,
              }}
            />
          </div>

          {/* Body */}
          <p className="relative text-[0.98rem] leading-relaxed text-white/85 sm:text-lg">
            {editing ? (
              <EditableText
                id={editId!}
                defaultValue={text}
                as="span"
                multiline
              />
            ) : (
              value
            )}
          </p>
        </div>
      </motion.li>
      {afterNode ? (
        <li
          aria-hidden="true"
          className="list-none pt-2"
          data-testid={`bounce-list-insert-${index + 1}`}
        >
          {afterNode}
        </li>
      ) : null}
    </>
  );
}
