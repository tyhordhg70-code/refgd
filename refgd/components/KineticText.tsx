"use client";
import { motion, useReducedMotion } from "framer-motion";
import { type CSSProperties } from "react";
import EditableText from "./EditableText";
import { useEditContext } from "@/lib/edit-context";

/**
 * Word-by-word kinetic reveal. Each word fades + lifts + un-blurs in
 * sequence — DeSo / noomoagency editorial entrance.
 *
 * Pass `editId` to make the headline inline-editable for admins.
 * In edit mode, the animated render is bypassed and a plain
 * `<EditableText>` element is shown instead so the admin can click
 * straight in and rewrite the title.
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
}) {
  const reduced = useReducedMotion();
  const ctx = useEditContext();
  const editing = !!editId && ctx.isAdmin && ctx.editMode;

  // In edit mode, swap the animated heading for a plain editable one so
  // the admin can click and rewrite. Once they exit edit mode, the
  // animated version returns with the new text.
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

  const value = editId ? ctx.getValue(editId, text) : text;
  const words = value.split(" ");

  if (reduced) {
    const Plain = Tag as any;
    return <Plain className={className} style={style}>{value}</Plain>;
  }

  const M = motion[Tag as keyof typeof motion] as any;
  return (
    <M
      className={className}
      style={style}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-50px" }}
      transition={{ staggerChildren: stagger, delayChildren: delay }}
      aria-label={value}
    >
      {words.map((w, i) => (
        <span
          key={i}
          // pb/pt give descenders + ascenders breathing room. Side
          // padding stops italic glyphs from being clipped at the
          // word edges (fixes "Stop paying for other BS…" italic
          // pull-quote letters touching / cropping).
          className="inline-block overflow-hidden align-bottom"
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
          <motion.span
            className="inline-block"
            variants={{
              hidden: { y: "110%", opacity: 0, filter: "blur(8px)" },
              show: { y: "0%", opacity: 1, filter: "blur(0px)", transition: { duration: 0.85, ease: [0.25, 0.4, 0.25, 1] } },
            }}
            // SSR emits the `hidden` variant as a `style="opacity:0;…"`
            // attribute. The client immediately re-formats the same values
            // when framer-motion mounts, producing a benign string diff
            // that React's reconciler reports as a hydration warning.
            suppressHydrationWarning
          >
            {w}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </M>
  );
}
