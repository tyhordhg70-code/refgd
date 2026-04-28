"use client";
import { ReactNode } from "react";
import { useEditContext } from "@/lib/edit-context";
import MagneticButton from "@/components/MagneticButton";

/**
 * EditableLinkButton — a MagneticButton whose `href` is admin-editable.
 *
 * In normal mode it renders a regular MagneticButton.
 * In admin edit mode it renders a small input strip above the button
 * so the admin can paste a new URL; the new value is persisted through
 * the standard EditContext setValue pipeline (Save / Discard / Undo
 * all just work, same as EditableText).
 */
export default function EditableLinkButton({
  id,
  defaultUrl,
  variant = "primary",
  external = true,
  className = "",
  children,
}: {
  id: string;
  defaultUrl: string;
  variant?: "primary" | "ghost" | "outline";
  external?: boolean;
  className?: string;
  children: ReactNode;
}) {
  const ctx = useEditContext();
  const url = ctx.getValue(id, defaultUrl);
  const adminEditing = ctx.isAdmin && ctx.editMode;

  return (
    <div>
      {adminEditing ? (
        <div className="mb-2 flex items-center gap-2 rounded-lg border border-amber-300/40 bg-amber-300/[0.06] px-3 py-2 text-xs">
          <span className="font-semibold uppercase tracking-[0.2em] text-amber-300">
            ✎ URL
          </span>
          <input
            type="text"
            defaultValue={url}
            placeholder="https://..."
            className="flex-1 rounded-md border border-amber-300/30 bg-black/40 px-2 py-1 font-mono text-xs text-white outline-none focus:ring-2 focus:ring-amber-300/70"
            onBlur={(e) => {
              const v = e.currentTarget.value.trim();
              if (v && v !== url) ctx.setValue(id, v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                (e.currentTarget as HTMLInputElement).blur();
              }
            }}
          />
        </div>
      ) : null}
      <MagneticButton href={url} external={external} variant={variant} className={className}>
        {children}
      </MagneticButton>
    </div>
  );
}
