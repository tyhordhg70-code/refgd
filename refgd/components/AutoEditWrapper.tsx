"use client";

/**
 * Auto-editor that walks the DOM under it and makes every visible text
 * node and image clickable-to-edit when an admin is in edit mode.
 *
 * Why a runtime DOM walker?
 *   The site has dozens of hard-coded copy strings spread across many
 *   pages and components (headings, paragraphs, button labels, image
 *   `src`s). Wrapping each one in `<EditableText>` / `<EditableImage>`
 *   with a stable id is fine for new code but laborious to retrofit
 *   across every existing page. This wrapper gives admins
 *   "click-anywhere-to-edit" coverage with zero per-element work.
 *
 * What it does (only when admin && editMode):
 *   - Walks every descendant of the wrapper element.
 *   - For each "leaf-with-text" element (a Text-only or short-mixed-text
 *     element), it adds `data-editable-id="auto.<pathname>.<route-stable-index>"`
 *     plus contentEditable=true and a hover outline. Click the element →
 *     it becomes editable. Blur commits to the EditContext.
 *   - For every <img>, it adds the same outline behaviour and a small
 *     "↗ Edit image" badge on hover; clicking the badge opens the same
 *     popover used by EditableImage.
 *
 * What it does NOT touch:
 *   - Anything that already has `data-editable-id` (those are explicitly
 *     wrapped in <EditableText> / <EditableImage> and we leave them
 *     alone).
 *   - Form controls (input/textarea/select), code/pre blocks, SVG
 *     internals, anything inside `[data-editable-skip]`.
 *
 * Persistence:
 *   - Resolved values come from the EditContext, same as
 *     <EditableText>. A successful "Publish" pushes them to
 *     /api/admin/content. The next page render then sees the saved
 *     copy via the existing content_blocks → display map.
 *
 * Stable id generation:
 *   - For each candidate element, we walk up to the nearest ancestor
 *     with id/data-section/role and combine that with the element's
 *     index amongst its siblings of the same tag, plus its tag and a
 *     short hash of its current text. This is stable enough for
 *     normal page edits — if a admin re-orders sections drastically,
 *     the IDs would still re-resolve to the new positions; admins can
 *     always re-open "Publish" on the toolbar.
 */
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useEditContext } from "@/lib/edit-context";

type Props = {
  children: React.ReactNode;
};

const SHORT_HASH_LEN = 8;

function shortHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  // base36, padded
  const v = Math.abs(h).toString(36).padStart(SHORT_HASH_LEN, "0");
  return v.slice(0, SHORT_HASH_LEN);
}

/** True if this element is a "leaf" we should treat as editable text. */
function isEditableLeaf(el: Element): boolean {
  if (el.hasAttribute("data-editable-id")) return false;
  if (el.hasAttribute("data-editable-skip")) return false;
  // skip form controls + code/pre + interactive button-with-svg-only nodes
  const t = el.tagName.toLowerCase();
  if (
    t === "input" || t === "textarea" || t === "select" ||
    t === "code" || t === "pre" || t === "svg" || t === "img" ||
    t === "video" || t === "iframe" || t === "canvas" ||
    t === "script" || t === "style" || t === "meta" || t === "link"
  ) return false;
  if (el.closest("[data-editable-skip], [data-editable-id]") !== el && el.closest("[data-editable-skip], [data-editable-id]")) {
    // a parent already opted out / already manually editable
    return false;
  }
  // Has direct text content that's worth editing.
  const directText = Array.from(el.childNodes)
    .filter((n) => n.nodeType === Node.TEXT_NODE)
    .map((n) => (n.textContent || "").trim())
    .join(" ")
    .trim();
  if (!directText) return false;
  // Skip pure whitespace / single punctuation
  if (directText.length < 2) return false;
  // Skip if children include ANY block-level elements (we'd rather edit
  // those individually).
  for (const c of Array.from(el.children)) {
    if (c.hasAttribute("data-editable-id")) continue;
    if (c.tagName.toLowerCase() === "br") continue;
    if (c.tagName.toLowerCase() === "span" && (c.textContent || "").length < 60) continue;
    if (c.tagName.toLowerCase() === "em" || c.tagName.toLowerCase() === "strong" || c.tagName.toLowerCase() === "b" || c.tagName.toLowerCase() === "i") continue;
    return false;
  }
  return true;
}

/**
 * Generates a stable structural id for this element within its page.
 *
 * Previously this appended shortHash(text) so the ID included a hash of
 * the element's current text content. That caused an orphan-edit bug:
 *   1. Admin edits text and queues the value (pending but not published).
 *   2. Admin refreshes before hitting Publish.
 *   3. The element now renders with the saved (pre-edit) text, producing a
 *      different text hash → different ID → the queued edit is lost.
 *
 * Fix: the ID is now derived entirely from structural position —
 * pathname + sequential counter + tag — which never changes regardless of
 * what the text contains. Two identical strings on the same page get
 * different IDs (different counter values), so there is no collision risk.
 */
function makeId(el: Element, pathname: string, counter: { n: number }): string {
  const tag = el.tagName.toLowerCase();
  const path = (pathname || "/").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
  const idx = counter.n++;
  return `auto.${path}.${idx}.${tag}`;
}

export default function AutoEditWrapper({ children }: Props) {
  const { isAdmin, editMode, getValue, setValue } = useEditContext();
  const pathname = usePathname() || "/";
  const rootRef = useRef<HTMLDivElement | null>(null);
  // refs to currently-tagged elements so we can clean up on exit
  // We track each decorated element along with its previously attached
  // listeners so we can call `removeEventListener` on them when edit
  // mode is toggled off (or this effect re-runs). Without this, the
  // listeners pile up across edit-mode toggles, causing duplicate save
  // calls on a single blur and growing input lag.
  type Tag = {
    id: string;
    original: string;
    onBlur?: (e: FocusEvent) => void;
    onKeyDown?: (e: KeyboardEvent) => void;
    onClick?: (e: MouseEvent) => void;
  };
  const taggedRef = useRef<Map<Element, Tag>>(new Map());

  // Image editor popover state
  const [imgPopover, setImgPopover] = useState<{ id: string; el: HTMLImageElement; rect: DOMRect } | null>(null);
  const [imgDraft, setImgDraft] = useState("");

  // ── Scan DOM and decorate when entering edit mode ────────────────
  useEffect(() => {
    if (!isAdmin || !editMode) {
      // Cleanup any existing decorations
      const tagged = taggedRef.current;
      tagged.forEach((info, el) => {
        try {
          el.removeAttribute("contenteditable");
          el.removeAttribute("data-editable-auto");
          el.removeAttribute("data-editable-id");
          (el as HTMLElement).style.outline = "";
          (el as HTMLElement).style.cursor = "";
          // We attached these via addEventListener — they MUST be
          // removed via removeEventListener (nulling onblur/onkeydown
          // doesn't unbind addEventListener handlers, which would leak
          // and fire repeatedly across edit-mode toggles).
          if (info.onBlur) el.removeEventListener("blur", info.onBlur as EventListener);
          if (info.onKeyDown) el.removeEventListener("keydown", info.onKeyDown as EventListener);
          if (info.onClick) el.removeEventListener("click", info.onClick as EventListener, true);
        } catch {}
      });
      tagged.clear();
      setImgPopover(null);
      return;
    }

    const root = rootRef.current;
    if (!root) return;

    const counter = { n: 0 };
    const tagged = taggedRef.current;

    const decorate = () => {
      // 1) Text-bearing leaves
      const all = root.querySelectorAll<HTMLElement>("*:not([data-editable-id]):not([data-editable-skip] *)");
      all.forEach((el) => {
        if (tagged.has(el)) return;
        if (!isEditableLeaf(el)) return;
        const id = makeId(el, pathname, counter);
        // Apply current saved/queued value if different from DOM text.
        const original = (el.textContent || "").trim();
        const stored = getValue(id, original);
        if (stored !== original) el.textContent = stored;

        el.setAttribute("data-editable-auto", "1");
        el.setAttribute("data-editable-id", id);
        // Make editable
        el.contentEditable = "true";
        el.spellcheck = true;
        el.style.outline = "";
        el.style.cursor = "text";

          // Preserve newlines: when the admin presses Enter inside a
        // contentEditable element, browsers wrap the new line in a
        // <div> / <br>. textContent alone strips those structural
        // tags, collapsing everything onto one line on save. We
        // convert them back to \n before persisting, then render the
        // saved value with `white-space: pre-line` so the breaks
        // survive across reloads.
        const onBlur = () => {
          const html = (el as HTMLElement).innerHTML
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/(div|p)>/gi, "\n")
            .replace(/<[^>]+>/g, "");
          const tmp = document.createElement("textarea");
          tmp.innerHTML = html;
          const next = tmp.value.replace(/\u00A0/g, " ").replace(/\n+$/, "");
          if (next !== getValue(id, original)) {
            setValue(id, next);
            // Make line breaks immediately visible in the live DOM so
            // the admin sees the same layout they previewed.
            (el as HTMLElement).style.whiteSpace = "pre-line";
            (el as HTMLElement).textContent = next;
          }
        };
        const onKeyDown = (e: KeyboardEvent) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            (el as HTMLElement).blur();
          }
          if (e.key === "Escape") {
            e.preventDefault();
            el.textContent = stored;
            (el as HTMLElement).blur();
          }
        };
        el.addEventListener("blur", onBlur);
        el.addEventListener("keydown", onKeyDown);

        // Store handler refs so the cleanup block above can call
        // removeEventListener with the exact same function references.
        tagged.set(el, { id, original, onBlur, onKeyDown });
      });

      // 2) Images: tag with id, hover outline + click-to-edit handler
      const imgs = root.querySelectorAll<HTMLImageElement>("img:not([data-editable-id])");
      imgs.forEach((img) => {
        if (tagged.has(img)) return;
        const stored = img.getAttribute("src") || "";
        const id = `auto.${(pathname || "/").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home"}.img.${counter.n++}.${shortHash(stored)}`;
        const savedSrc = getValue(id, stored);
        if (savedSrc !== stored) img.setAttribute("src", savedSrc);

        img.setAttribute("data-editable-auto", "1");
        img.setAttribute("data-editable-id", id);
        img.style.cursor = "pointer";
        img.style.outline = "";

        const onClick = (e: MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          setImgDraft(getValue(id, stored));
          setImgPopover({ id, el: img, rect: img.getBoundingClientRect() });
        };
        img.addEventListener("click", onClick, true);

        tagged.set(img, { id, original: stored, onClick });
      });
    };

    decorate();

    // Re-scan on mutations so admin sees newly-rendered nodes (route
    // changes, framer-motion mounts, etc.) become editable.
    const obs = new MutationObserver(() => {
      // Throttle via rAF
      requestAnimationFrame(decorate);
    });
    obs.observe(root, { childList: true, subtree: true });
    return () => {
      obs.disconnect();
      // Tear down every listener and decoration we attached during this
      // effect run. Without this, switching pages while in edit mode
      // (or toggling edit mode rapidly) would leave dangling listeners
      // on detached / re-rendered nodes.
      const live = taggedRef.current;
      live.forEach((info, el) => {
        try {
          if (info.onBlur) el.removeEventListener("blur", info.onBlur as EventListener);
          if (info.onKeyDown) el.removeEventListener("keydown", info.onKeyDown as EventListener);
          if (info.onClick) el.removeEventListener("click", info.onClick as EventListener, true);
        } catch {}
      });
      live.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, editMode, pathname]);

  // ── Style: hover outline only inside the wrapper ──────────────────
  return (
    <div
      ref={rootRef}
      data-edit-scope=""
      className={isAdmin && editMode ? "edit-scope-active" : ""}
    >
      {children}
      {/* Inline styles for the auto-editor outlines so we don't have
          to register them globally. */}
      {isAdmin && editMode && (
        <style jsx global>{`
          .edit-scope-active [data-editable-auto]:hover,
          .edit-scope-active [data-editable-auto]:focus {
            outline: 2px solid rgba(252, 211, 77, 0.85);
            outline-offset: 3px;
            border-radius: 4px;
          }
          .edit-scope-active [data-editable-auto]:focus {
            outline-color: rgba(245, 158, 11, 0.95);
          }
        `}</style>
      )}

      {/* Image editor popover (rendered above everything in edit mode) */}
      {isAdmin && editMode && imgPopover && (
        <div
          role="dialog"
          aria-label="Edit image"
          style={{
            position: "fixed",
            top: Math.min(imgPopover.rect.bottom + 8, window.innerHeight - 160),
            left: Math.min(imgPopover.rect.left, window.innerWidth - 340),
            zIndex: 90,
          }}
          className="w-80 rounded-xl border border-white/15 bg-ink-900/95 p-3 text-xs shadow-2xl backdrop-blur-xl"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="mb-1 text-[10px] uppercase tracking-widest text-white/45">
            Image · {imgPopover.id.split(".").slice(-2).join(".")}
          </div>
          <input
            value={imgDraft}
            onChange={(e) => setImgDraft(e.target.value)}
            placeholder="https://… or paste a data URL"
            autoFocus
            spellCheck={false}
            className="w-full rounded-md border border-white/10 bg-white/5 px-2 py-1.5 text-white outline-none focus:border-amber-300/60"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setValue(imgPopover.id, imgDraft);
                imgPopover.el.setAttribute("src", imgDraft);
                setImgPopover(null);
              }
              if (e.key === "Escape") setImgPopover(null);
            }}
          />
          <div className="mt-2 flex items-center justify-between gap-2">
            <label className="cursor-pointer rounded-md border border-white/10 bg-white/5 px-2 py-1 text-white/80 hover:bg-white/10">
              Upload file…
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  if (f.size > 8 * 1024 * 1024) {
                    alert("Image must be under 8 MB.");
                    return;
                  }
                  // Upload to server endpoint — store a URL, not a data-URI.
                  const form = new FormData();
                  form.append("file", f);
                  try {
                    const res = await fetch("/api/admin/upload", {
                      method: "POST",
                      credentials: "same-origin",
                      body: form,
                    });
                    if (!res.ok) throw new Error(`Upload failed (${res.status})`);
                    const { url } = (await res.json()) as { url: string };
                    setValue(imgPopover!.id, url);
                    imgPopover!.el.setAttribute("src", url);
                    setImgPopover(null);
                  } catch (err) {
                    alert((err as Error).message ?? "Upload failed");
                  }
                }}
              />
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setImgPopover(null)}
                className="rounded-md px-2 py-1 text-white/55 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setValue(imgPopover.id, imgDraft);
                  imgPopover.el.setAttribute("src", imgDraft);
                  setImgPopover(null);
                }}
                className="rounded-md bg-amber-400 px-3 py-1 font-semibold text-ink-950 hover:brightness-110"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
