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
import { resolveEmojiKind } from "./format";

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
      // Web A's link class so the anchor is visibly styled (blue/underline)
      // inside the edit box instead of blending into the plain text.
      html: `<a class="text-entity-link" href="${esc(lm[2] ?? "")}">${leafHtml(lm[1] ?? "")}</a>`,
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
  // `> `-prefixed line groups become a real <blockquote> in the composer so
  // the highlight is visible while editing (vendored bare-`blockquote`
  // element rules in tg-webapp.css style it in every surface);
  // editHtmlToBody's BLOCKQUOTE branch reverses this exactly.
  let html = "";
  let text: string[] = [];
  let quote: string[] = [];
  const flushText = () => {
    if (text.length === 0) return;
    html += inlineHtml(text.join("\n"));
    text = [];
  };
  const flushQuote = () => {
    if (quote.length === 0) return;
    html += `<blockquote class="tg-quote">${inlineHtml(quote.join("\n"))}</blockquote>`;
    quote = [];
  };
  for (const line of body.split("\n")) {
    // Must mirror renderBody's quote-line rule exactly: "> foo" or bare ">".
    const m = /^>(?: (.*))?$/.exec(line);
    if (m) {
      flushText();
      quote.push(m[1] ?? "");
    } else {
      flushQuote();
      text.push(line);
    }
  }
  flushText();
  flushQuote();
  return html;
}

/**
 * Swap a custom-emoji <img> for an autoplaying looped <video> (Web A renders
 * animated pack emoji inside its editable composer exactly this way). The
 * data-document-id / data-alt attributes keep the [ce:] token round-tripping
 * through editHtmlToBody's VIDEO branch; contenteditable=false keeps the
 * element atomic for the caret. If the bytes turn out not to be video after
 * all (Lottie JSON / missing artwork) it degrades to a token-preserving
 * <span> showing the alt character — same visual as the old broken-img alt.
 */
function ceVideo(img: HTMLImageElement, id: string): void {
  const alt = img.getAttribute("alt") ?? "";
  const v = document.createElement("video");
  v.className = "tg-edit-ce";
  v.setAttribute("data-document-id", id);
  v.setAttribute("data-alt", alt);
  v.muted = true;
  v.autoplay = true;
  v.loop = true;
  v.playsInline = true;
  v.setAttribute("contenteditable", "false");
  v.addEventListener(
    "error",
    () => {
      const s = document.createElement("span");
      s.setAttribute("data-document-id", id);
      s.setAttribute("data-alt", alt);
      s.textContent = alt || "🙂";
      v.replaceWith(s);
    },
    { once: true },
  );
  v.src = `/api/community/emoji/${id}?v=${EMOJI_CACHE_VERSION}`;
  img.replaceWith(v);
  void v.play().catch(() => {});
}

/**
 * One-time capture-phase error listener: a failed self-hosted custom-emoji
 * <img> retries once via the API route; if THAT fails too the bytes exist
 * but don't decode as an image — an animated (.webm) pack emoji — so the
 * final stage swaps it for an autoplaying <video> (ceVideo above handles the
 * not-actually-video degrade, keeping the token intact either way).
 */
export function wireEditCeFallback(el: HTMLElement): void {
  if (el.dataset.ceWired) return;
  el.dataset.ceWired = "1";
  el.addEventListener(
    "error",
    (ev) => {
      const t = ev.target;
      if (!(t instanceof HTMLImageElement) || !t.dataset.documentId) return;
      if (t.dataset.stage !== "api") {
        t.dataset.stage = "api";
        t.src = `/api/community/emoji/${t.dataset.documentId}?v=${EMOJI_CACHE_VERSION}`;
      } else {
        ceVideo(t, t.dataset.documentId);
      }
    },
    true,
  );
}

/**
 * Manifest fast-path for animated custom emoji in the edit surfaces: ids the
 * kinds manifest (format.tsx) already knows are video (.webm) packs mount as
 * an autoplaying <video> immediately instead of churning through the img
 * error cascade. A MutationObserver re-runs the pass so pasted / re-seeded
 * emoji get upgraded no matter how they were inserted (innerHTML seed,
 * execCommand insertHTML paste, …). Lottie (.tgs) ids keep the static still
 * — the vendored Lottie player is bubble-only.
 */
export function wireEditCeAnimations(el: HTMLElement): void {
  if (el.dataset.ceAnimWired) return;
  el.dataset.ceAnimWired = "1";
  const pass = () => {
    const imgs = el.querySelectorAll<HTMLImageElement>(
      "img.tg-edit-ce[data-document-id]",
    );
    for (const img of imgs) {
      if (img.dataset.kindChecked) continue;
      img.dataset.kindChecked = "1";
      const id = img.dataset.documentId ?? "";
      resolveEmojiKind(id, (kind) => {
        if (kind === "video" && img.isConnected) ceVideo(img, id);
      });
    }
  };
  pass();
  new MutationObserver(pass).observe(el, { childList: true, subtree: true });
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
    // Office/Word clipboard html embeds <style> blocks in the body — their
    // CSS text must never leak into the serialized message.
    if (tag === "STYLE" || tag === "SCRIPT" || tag === "TEMPLATE") return "";
    if (tag === "BR") return "\n";
    // Custom emoji pasted from ANY Telegram web client: Web A wraps its
    // ANIMATED custom emoji in a <div data-document-id> (only static ones
    // are a plain <img>), and Web K uses <custom-emoji-element data-docid>.
    // Recognize the document id on ANY element so pasting an animated emoji
    // keeps its [ce:] token instead of degrading to the alt character
    // (which rendered as a static system emoji).
    const pastedDoc =
      n.getAttribute("data-document-id") ??
      n.getAttribute("data-doc-id") ??
      n.getAttribute("data-docid");
    if (pastedDoc && /^\d+$/.test(pastedDoc)) {
      const rawAlt =
        n.getAttribute("alt") ??
        n.getAttribute("data-alt") ??
        n.querySelector("img[alt]")?.getAttribute("alt") ??
        n.textContent ??
        "";
      // "]" and newlines would break the token; an empty alt would fail the
      // token regex — fall back to a neutral emoji character.
      const alt = rawAlt.replace(/[\]\n]/g, "").trim() || "🙂";
      return `[ce:${pastedDoc}:${alt}]`;
    }
    if (tag === "IMG" || tag === "VIDEO") {
      // Custom emoji round-trip: bubble/composer emoji (img OR the animated
      // <video> stage) carry data-document-id; anything else degrades to its
      // alt text (the plain emoji character).
      const doc = n.getAttribute("data-document-id");
      const alt = n.getAttribute("alt") ?? n.getAttribute("data-alt") ?? "";
      return doc ? `[ce:${doc}:${alt}]` : alt;
    }
    let inner = Array.from(n.childNodes).map(ser).join("");
    if (tag === "DIV" || tag === "P") {
      // A block div is a line: newline before its content. A div holding only
      // <br> is an empty line — the <br> itself already IS that newline.
      if (inner === "\n") inner = "";
      return `\n${inner}`;
    }
    if (tag === "BLOCKQUOTE") {
      // Web-A highlighted quote → markdown-lite `> ` line group. Surrounding
      // newlines keep it its own block (a bare text node right after the
      // quote must not merge into its last line); inner is trimmed so nested
      // <div>/<br> markup can't produce empty leading/trailing quote lines.
      const q = inner.replace(/^\n+/, "").replace(/\n+$/, "");
      // Empty quote lines serialize as a bare ">" (no trailing space —
      // renderBody's button pre-pass strips trailing spaces before \n, which
      // would otherwise orphan the marker).
      const quoted = q
        .split("\n")
        .map((l) => (l ? `> ${l}` : ">"))
        .join("\n");
      return `\n${quoted}\n`;
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

/**
 * Normalize CLIPBOARD html (a copied Telegram bubble, rich text from another
 * site or document) into markdown-lite tokens by walking it with the same
 * serializer the edit composer uses — so pasting preserves bold/italic/
 * underline/strike/mono/links/custom-emoji exactly like Web A instead of
 * flattening to plain text. DOMParser yields an INERT document: nothing
 * loads, no scripts run, unknown wrappers collapse to their text.
 */
export function pasteHtmlToTokens(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return editHtmlToBody(doc.body).replace(/\n+$/, "");
}
