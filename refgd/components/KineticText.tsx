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

  // Plain heading tag (NOT a motion component). The previous
  // implementation made the heading a motion.* element with named
  // variants ("hidden"/"show") and relied on parent→child variant
  // propagation + `whileInView` (and later `animate="show"`) to
  // drive the per-word reveal. Both approaches were fragile:
  //
  //   1. `whileInView` on the heading often never fired when the
  //      heading was nested inside another <motion.div> that was
  //      itself transforming (ServiceSection hero wraps the title
  //      in a motion.div with initial:{opacity:0, y:36, scale:0.98}
  //      and a 0.95s entrance). The IntersectionObserver race left
  //      every KineticText headline (Get rewarded…, The Store List,
  //      Select your region., Stop wasting time…) stuck at
  //      {opacity:0, filter:blur(8px), translateY(110%)} forever.
  //
  //   2. Switching to `animate="show"` did not help because
  //      framer-motion v11 named-variant propagation is broken when
  //      an ANCESTOR motion component uses OBJECT-form initial/animate
  //      (no named variants). The "show" state never reached the
  //      child motion.span words — confirmed by inspecting the DOM:
  //      the inner spans kept their SSR `style="opacity:0;..."`
  //      attribute and never updated.
  //
  // Fix: drive each word's animation INDEPENDENTLY with its own
  // `initial` + `animate` object-form props and a per-word delay
  // computed from `delay + i * stagger`. No variant propagation, no
  // viewport observers, no parent state required. Each word is a
  // self-contained tween that always plays on mount and always
  // reaches its final visible state. The stagger + duration + ease
  // produce the exact same editorial reveal as before.
  const HeadingTag = Tag as any;
  return (
    <HeadingTag
      className={className}
      style={{ lineHeight: 1.08, ...style }}
      aria-label={value}
    >
      {words.map((w, i) => (
        <span
          key={i}
          // pb/pt give descenders + ascenders breathing room. Side
          // padding stops italic glyphs from being clipped at the
          // word edges. align-top keeps the mask box anchored from
          // the top so the visible cap line stays in place when font
          // sizes wrap to multiple lines.
          className="inline-block overflow-hidden align-top"
          style={{
            paddingBottom: "0.22em",
            paddingTop: "0.1em",
            paddingLeft: "0.06em",
            paddingRight: "0.06em",
            marginLeft: "-0.06em",
            marginRight: "-0.06em",
          }}
          aria-hidden="true"
        >
          <motion.span
            className="inline-block"
            initial={{ y: "110%", opacity: 0, filter: "blur(8px)" }}
            animate={{ y: "0%", opacity: 1, filter: "blur(0px)" }}
            transition={{
              duration: 0.85,
              delay: delay + i * stagger,
              ease: [0.25, 0.4, 0.25, 1],
            }}
            // SSR emits the `initial` prop as a `style="opacity:0;…"`
            // attribute. The client re-formats the same values when
            // framer-motion mounts → benign string diff React reports
            // as a hydration warning. Suppress.
            suppressHydrationWarning
          >
            {w}
            {i < words.length - 1 ? "\u00A0" : ""}
          </motion.span>
        </span>
      ))}
    </HeadingTag>
  );
}
