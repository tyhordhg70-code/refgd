/**
 * Edit-composer rich-text bridge.
 *
 * The message body is stored as markdown-lite tokens (**bold**, __italic__,
 * ++underline++, ~~strike~~, `mono`, ||spoiler||, [text](url)) plus custom
 * emoji tokens `[ce:<docId>:<alt>]` — exactly what renderBody (format.tsx)
 * parses for display. The edit composer used to seed the contentEditable
 * with the RAW token text, which showed markers/tokens instead of formatting
 * and made emoji look "lost".
 *
 * bodyToEditHtml renders those tokens into real HTML for the contentEditable
 * (styled spans + <img data-document-id> for custom emoji);
 * editHtmlToBody walks the edited DOM back into the exact same token syntax
 * on every input, so saving preserves all formatting and emoji.
 *
 * The two functions are deliberate inverses of format.tsx's INLINE_RULES —
 * keep rule order and token syntax in sync with renderBody.
 */

import { EMOJI_CACHE_VERSION } from "@/lib/custom-emoji";

const ESC: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ESC[c] ?? c);

/** `[ce:<documentId>:<alt>]` — custom emoji token (same as format.tsx). */
const CE_RE = /\[ce:(\d+):([^\]]+)\]/g;

/** Escaped plain text with \n → <br>. */
function textHtml(s: string): string {
  return esc(s).replace(/\n/g, "<br>");
}

/**
 * Leaf segment: plain text + custom-emoji tokens → <img>. Starts at the
 * self-hosted webp (fast, immutable); wireEditCeFallback advances a failed
 * img to the API route (static pack artwork). Animated (.webm/.tgs) ids
 * can't render as a plain <img> — the browser then shows the alt emoji text,
 * and the token still round-trips intact via data-document-id on save.
 */
function leafHtml(s: string): string {
  let out = "";
  let last = 0;
  CE_RE.lastIndex = 0;
  for (const m of s.matchAll(CE_RE)) {
    out += textHtml(s.slice(last, m.index));
    out +=
      `<img class="tg-edit-ce" draggable="false"` +
      ` data-document-id="${m[1]}" alt="${esc(m[2] ?? "")}"` +
      ` src="/tg-emoji/${m[1]}.webp">`;
    last = m.index + m[0].length;
  }
  out += textHtml(s.slice(last));
  return out;
}

interface EditRule {
  re: RegExp;
  /** recurse = nested formatting allowed; raw = verbatim (monospace). */
  mode: "recurse" | "raw";
  open: string;
  close: string;
}

/* Same order as format.tsx INLINE_RULES (earliest match wins; ties go to the
 * earlier rule). */
const EDIT_RULES: EditRule[] = [
  {
    re: /\|\|([\s\S]+?)\|\|/,
    mode: "recurse",
    open: '<span class="tg-spoiler">',
    close: "</span>",
  },
  { re: /\*\*([\s\S]+?)\*\*/, mode: "recurse", open: "<strong>", close: "</strong>" },
  { re: /~~([\s\S]+?)~~/, mode: "recurse", open: "<s>", close: "</s>" },
  { re: /\+\+([\s\S]+?)\+\+/, mode: "recurse", open: "<u>", close: "</u>" },
  { re: /__([\s\S]+?)__/, mode: "recurse", open: "<em>", close: "</em>" },
  {
    re: /`([^`]+?)`/,
    mode: "raw",
    open: '<code class="tg-mono">',
    close: "</code>",
  },
];

const LINK_RE = /\[([^\]]+?)\]\((https?:\/\/[^\s)]+)\)/;

function inlineHtml(text: string): string {
  let best: { idx: number; len: number; html: string } | null = null;
  for (const r of EDIT_RULES) {
    const m = new RegExp(r.re.source).exec(text);
    if (m && (best === null || m.index < best.idx)) {
      const inner =
        r.mode === "recurse" ? inlineHtml(m[1] ?? "") : textHtml(m[1] ?? "");
      best = { idx: m.index, len: m[0].length, html: r.open + inner + r.close };
    }
  }
  const lm = new RegExp(LINK_RE.source).exec(text);
  if (lm && (best === null || lm.index < best.idx)) {
    best = {
      idx: lm.index,
      len: lm[0].length,
      html: `<a href="${esc(lm[2] ?? "")}">${leafHtml(lm[1] ?? "")}</a>`,
    };
  }
  if (best === null) return leafHtml(text);
  return (
    leafHtml(text.slice(0, best.idx)) +
    best.html +
    inlineHtml(text.slice(best.idx + best.len))
  );
}

/** Markdown-lite body → HTML for seeding the edit contentEditable. */
export function bodyToEditHtml(body: string): string {
  return inlineHtml(body);
}

/**
 * One-time capture-phase error listener: a failed self-hosted custom-emoji
 * <img> retries once via the API route; if that also fails the browser shows
 * the alt emoji text (the token itself stays intact for serialization).
 */
export function wireEditCeFallback(el: HTMLElement): void {
  if (el.dataset.ceWired) return;
  el.dataset.ceWired = "1";
  el.addEventListener(
    "error",
    (ev) => {
      const t = ev.target;
      if (
        t instanceof HTMLImageElement &&
        t.dataset.documentId &&
        t.dataset.stage !== "api"
      ) {
        t.dataset.stage = "api";
        t.src = `/api/community/emoji/${t.dataset.documentId}?v=${EMOJI_CACHE_VERSION}`;
      }
    },
    true,
  );
}

/**
 * Serialize the edited contentEditable DOM back to markdown-lite tokens.
 * Handles the tags bodyToEditHtml emits plus what browsers produce while
 * editing: <div>/<p> line blocks (→ \n, per contentEditable behaviour),
 * <br>, execCommand aliases (<b>/<i>/<strike>/<del>), and pasted formatting.
 * Unknown wrappers fall back to their inner text.
 */
export function editHtmlToBody(root: HTMLElement): string {
  const ser = (n: Node): string => {
    if (n.nodeType === Node.TEXT_NODE) {
      return (n.nodeValue ?? "").replace(/\u00A0/g, " ");
    }
    if (!(n instanceof HTMLElement)) return "";
    const tag = n.tagName;
    if (tag === "BR") return "\n";
    if (tag === "IMG") {
      const doc = n.getAttribute("data-document-id");
      const alt = n.getAttribute("alt") ?? "";
      return doc ? `[ce:${doc}:${alt}]` : alt;
    }
    let inner = Array.from(n.childNodes).map(ser).join("");
    if (tag === "DIV" || tag === "P") {
      // A block div is a line: newline before its content. A div holding only
      // <br> is an empty line — the <br> itself already IS that newline.
      if (inner === "\n") inner = "";
      return `\n${inner}`;
    }
    // Don't wrap empty/whitespace-only runs in markers (renderBody's
    // token regexes need non-empty content anyway).
    if (!inner.trim()) return inner;
    if (tag === "STRONG" || tag === "B") return `**${inner}**`;
    if (tag === "EM" || tag === "I") return `__${inner}__`;
    if (tag === "U") return `++${inner}++`;
    if (tag === "S" || tag === "STRIKE" || tag === "DEL") return `~~${inner}~~`;
    if (tag === "CODE") return `\`${inner}\``;
    if (n.classList.contains("tg-spoiler")) return `||${inner}||`;
    if (tag === "A") {
      const href = n.getAttribute("href") ?? "";
      return /^https?:\/\//i.test(href) ? `[${inner}](${href})` : inner;
    }
    return inner;
  };
  const out = Array.from(root.childNodes).map(ser).join("");
  // The first line has no preceding line break — drop the leading \n the
  // block rule adds when the first child is already a <div>.
  return out.replace(/^\n/, "");
}
