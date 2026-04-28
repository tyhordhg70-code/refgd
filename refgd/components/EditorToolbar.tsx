"use client";

/**
 * Floating bottom-center toolbar for admins.
 *
 * Always renders the "Enter editor" badge when an admin is logged in.
 * In edit mode it expands to show: change-count, undo / redo, save (publish),
 * discard, and an "exit editor" pill. Logout lives in the dropdown menu so
 * we don't accidentally drop the session mid-edit.
 *
 * The toolbar deliberately sits at z-[80] so it is *above* the music
 * player (z-60) and the cosmos (z-0..2) but below modal overlays we may
 * add later (z-[90]+).
 */

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useEditContext } from "@/lib/edit-context";

export default function EditorToolbar() {
  const router = useRouter();
  const {
    isAdmin,
    editMode,
    setEditMode,
    canUndo,
    canRedo,
    undo,
    redo,
    pendingCount,
    dirty,
    flush,
    discard,
  } = useEditContext();

  const [saving, setSaving] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts: Cmd/Ctrl-Z undo, Cmd/Ctrl-Shift-Z redo,
  // Cmd/Ctrl-S save. Only when edit mode is on.
  useEffect(() => {
    if (!editMode) return;
    const onKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const k = e.key.toLowerCase();
      if (k === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((k === "z" && e.shiftKey) || k === "y") {
        e.preventDefault();
        redo();
      } else if (k === "s") {
        e.preventDefault();
        void doSave();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editMode, undo, redo, flush]);

  // Click-outside closes the menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    window.addEventListener("mousedown", onDoc);
    return () => window.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  // Warn before leaving with unsaved edits.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  if (!isAdmin) return null;

  async function doSave() {
    if (saving || !dirty) return;
    setSaving(true);
    const ok = await flush();
    setSaving(false);
    if (ok) {
      setSavedFlash(true);
      setTimeout(() => setSavedFlash(false), 1600);
      // Refresh server components so saved values render on first
      // paint after a hard reload too.
      router.refresh();
    } else {
      alert("Save failed. Check the console for details.");
    }
  }

  async function doLogout() {
    try { window.localStorage.removeItem("refgd:editMode"); } catch {}
    await fetch("/api/admin/logout", { method: "POST", credentials: "same-origin" }).catch(() => void 0);
    window.location.href = "/admin";
  }

  if (!editMode) {
    return (
      <button
        type="button"
        onClick={() => setEditMode(true)}
        className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-full border border-amber-300/40 bg-gradient-to-r from-amber-500/90 to-orange-500/90 px-5 py-3 text-sm font-semibold text-ink-950 shadow-[0_20px_60px_-15px_rgba(245,185,69,0.7)] backdrop-blur-md transition hover:scale-[1.03]"
        aria-label="Enter inline editor"
        data-testid="editor-toolbar-enter"
      >
        ✏️ Edit page
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-[80] -translate-x-1/2" data-testid="editor-toolbar">
      <div
        className="flex items-center gap-1 rounded-full border border-white/15 bg-ink-900/90 p-1.5 text-sm text-white/85 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.85)] backdrop-blur-2xl"
        role="toolbar"
        aria-label="Page editor"
      >
        {/* Status pill */}
        <span
          className={`ml-1 inline-flex h-9 items-center gap-2 rounded-full px-3 text-xs font-semibold ${
            savedFlash
              ? "bg-emerald-400/20 text-emerald-200"
              : dirty
              ? "bg-amber-400/15 text-amber-200"
              : "bg-white/5 text-white/55"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              savedFlash ? "bg-emerald-300" : dirty ? "bg-amber-300 animate-pulse" : "bg-white/40"
            }`}
          />
          {savedFlash ? "Published" : dirty ? `${pendingCount} unsaved` : "All saved"}
        </span>

        <ToolbarBtn label="Undo (⌘Z)" onClick={undo} disabled={!canUndo}>
          <UndoIcon />
        </ToolbarBtn>
        <ToolbarBtn label="Redo (⌘⇧Z)" onClick={redo} disabled={!canRedo}>
          <RedoIcon />
        </ToolbarBtn>

        <span aria-hidden className="mx-1 h-5 w-px bg-white/10" />

        <ToolbarBtn label="Discard changes" onClick={discard} disabled={!dirty} variant="ghost" testId="editor-toolbar-discard">
          Discard
        </ToolbarBtn>
        <button
          type="button"
          onClick={doSave}
          disabled={!dirty || saving}
          className="inline-flex h-9 items-center gap-2 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 px-4 text-xs font-bold text-ink-950 transition disabled:cursor-not-allowed disabled:opacity-40 hover:brightness-110"
          data-testid="editor-toolbar-publish"
        >
          {saving ? "Publishing…" : "Publish"}
        </button>

        <span aria-hidden className="mx-1 h-5 w-px bg-white/10" />

        <ToolbarBtn label="Exit editor" onClick={() => setEditMode(false)} variant="ghost" testId="editor-toolbar-exit">
          Exit
        </ToolbarBtn>

        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="More"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-white/65 transition hover:bg-white/10 hover:text-white"
            onClick={() => setMenuOpen((o) => !o)}
          >
            ⋯
          </button>
          {menuOpen && (
            <div className="absolute bottom-12 right-0 w-44 overflow-hidden rounded-2xl border border-white/10 bg-ink-900/95 p-1 text-xs shadow-xl backdrop-blur-xl">
              <a
                href="/admin/dashboard"
                className="block rounded-lg px-3 py-2 text-white/80 hover:bg-white/5"
              >
                Open admin dashboard
              </a>
              <a
                href="/admin/stores"
                className="block rounded-lg px-3 py-2 text-white/80 hover:bg-white/5"
              >
                Stores manager
              </a>
              <a
                href="/admin/content"
                className="block rounded-lg px-3 py-2 text-white/80 hover:bg-white/5"
              >
                Content manager
              </a>
              <button
                type="button"
                onClick={doLogout}
                className="block w-full rounded-lg px-3 py-2 text-left text-rose-300 hover:bg-rose-500/10"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Helper hint, fades after first interaction */}
      <p className="pointer-events-none mt-2 text-center text-[11px] uppercase tracking-widest text-white/40">
        Click any text to edit · ⌘Z undo · ⌘S publish
      </p>
    </div>
  );
}

function ToolbarBtn({
  label,
  onClick,
  disabled,
  children,
  variant = "icon",
  testId,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "icon" | "ghost";
  testId?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      data-testid={testId}
      className={`inline-flex h-9 items-center justify-center rounded-full px-3 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-30 ${
        variant === "icon" ? "w-9 px-0" : ""
      } text-white/80 hover:bg-white/10 hover:text-white`}
    >
      {children}
    </button>
  );
}

function UndoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 14L4 9l5-5" />
      <path d="M4 9h11a5 5 0 0 1 0 10h-4" />
    </svg>
  );
}
function RedoIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 14l5-5-5-5" />
      <path d="M20 9H9a5 5 0 0 0 0 10h4" />
    </svg>
  );
}
