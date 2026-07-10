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
import { sanitizeLottieData } from "./emoji-debug";
import { loadLottieLib, resolveEmojiKind } from "./format";

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
  // Server-composed mention tokens seed back as plain `@Name` text — the
  // server re-matches display names on save (see rewriteMentions), so the
  // composer never has to round-trip the raw [m:] token.
  body = body.replace(
    /\[m:\d+:([^\]\n]{1,64})\]/g,
    (_all, name: string) => (name.startsWith("@") ? name : `@${name}`),
  );
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

/* Editable-surface Lottie animations keep running after their host span is
 * deleted (backspace, composer unmount on topic switch) — lottie-web's rAF
 * loop doesn't know about DOM removal. A single lazy sweep destroys players
 * whose span left the document; it self-stops when none remain. */
const liveEditLotties = new Set<{ el: HTMLElement; destroy: () => void }>();
let editLottieSweep: number | null = null;
function trackEditLottie(el: HTMLElement, destroy: () => void): void {
  liveEditLotties.add({ el, destroy });
  if (editLottieSweep !== null) return;
  editLottieSweep = window.setInterval(() => {
    for (const entry of liveEditLotties) {
      if (!entry.el.isConnected) {
        entry.destroy();
        liveEditLotties.delete(entry);
      }
    }
    if (liveEditLotties.size === 0 && editLottieSweep !== null) {
      window.clearInterval(editLottieSweep);
      editLottieSweep = null;
    }
  }, 5000);
}

/**
 * Swap a custom-emoji <img> for an atomic inline span hosting the vendored
 * Lottie player (animated .tgs pack emoji — Web A animates these in its own
 * composer too). The span carries data-document-id/data-alt so
 * editHtmlToBody keeps the [ce:] token (its document-id branch matches ANY
 * element), and contenteditable=false keeps it a single caret unit. The img
 * is replaced only AFTER the JSON + renderer have loaded — any failure
 * leaves the static still exactly as it was.
 */
function ceLottie(img: HTMLImageElement, id: string): void {
  // Claim the img SYNCHRONOUSLY: the error cascade (wireEditCeFallback) must
  // not advance a lottie-bound img to its destructive <video> stage while
  // the JSON + renderer are still loading — it would replace the node and
  // this mount would find img.isConnected === false and silently give up
  // (the "pasted animated emoji stays static except the cache-warm one" bug).
  img.dataset.ceKind = "l";
  const alt = img.getAttribute("alt") ?? "";
  // Mount failed (rate limit, bad bytes, lib unavailable): release the claim
  // and — when the img has already exhausted its error cascade and paints as
  // a broken image — degrade to the same token-preserving alt span ceVideo
  // uses, so a failure never looks worse than the pre-claim behaviour.
  const degrade = () => {
    delete img.dataset.ceKind;
    if (
      img.isConnected &&
      img.dataset.stage === "api" &&
      img.complete &&
      img.naturalWidth === 0
    ) {
      const s = document.createElement("span");
      s.setAttribute("data-document-id", id);
      s.setAttribute("data-alt", alt);
      s.textContent = alt || "🙂";
      img.replaceWith(s);
    }
  };
  void (async () => {
    try {
      const res = await fetch(
        `/api/community/emoji/${id}?v=${EMOJI_CACHE_VERSION}`,
      );
      if (!res.ok) return degrade();
      if (!(res.headers.get("content-type") ?? "").includes("json")) {
        return degrade();
      }
      const data = sanitizeLottieData(await res.json());
      const lottie = await loadLottieLib();
      if (!lottie) return degrade();
      if (!img.isConnected) return;
      const s = document.createElement("span");
      s.className = "tg-edit-ce tg-edit-ce-lottie";
      s.setAttribute("data-document-id", id);
      s.setAttribute("data-alt", alt);
      s.setAttribute("contenteditable", "false");
      img.replaceWith(s);
      const anim = lottie.loadAnimation({
        container: s,
        renderer: "svg",
        loop: true,
        autoplay: true,
        animationData: data,
        rendererSettings: { preserveAspectRatio: "xMidYMid meet" },
      });
      anim.setSubframe?.(false);
      trackEditLottie(s, () => anim.destroy());
    } catch {
      // Release the claim so the token-preserving alt degrade still runs —
      // the token round-trips either way.
      degrade();
    }
  })();
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
      } else if (t.dataset.ceKind !== "l" && t.dataset.ceKind !== "p") {
        // Lottie JSON served to an <img> always "errors" — that is NOT a
        // missing-artwork signal. When the kinds resolver owns this img
        // (claimed lottie, or verdict still pending), mounting a <video>
        // here would destroy the node ceLottie is about to replace; the
        // resolver's callback delivers the correct renderer instead.
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
 * execCommand insertHTML paste, …). Lottie (.tgs) ids mount the vendored
 * Lottie player as an atomic span (ceLottie) the same way.
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
      // "p" (pending) pauses the error cascade's video/degrade stage until
      // the manifest/probe verdict lands — set BEFORE resolveEmojiKind so
      // even a synchronous manifest answer can never lose the claim race.
      img.dataset.ceKind = "p";
      const id = img.dataset.documentId ?? "";
      resolveEmojiKind(id, (kind) => {
        if (!img.isConnected) return;
        if (kind === "video") {
          img.dataset.ceKind = "v";
          ceVideo(img, id);
        } else if (kind === "lottie") {
          ceLottie(img, id);
        } else {
          // Static pack artwork — release the claim; if the api stage
          // already errored while we were pending, re-kick the cascade by
          // re-assigning the src (a plain retry of the immutable route).
          delete img.dataset.ceKind;
          if (img.dataset.stage === "api" && img.complete && img.naturalWidth === 0) {
            img.src = `/api/community/emoji/${id}?v=${EMOJI_CACHE_VERSION}&r=1`;
          }
        }
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
    // Unicode ANIMATED emoji span (LottieEmoji stamps data-alt but has no
    // document id): round-trip as the plain character — descending into the
    // injected svg would yield "" and the emoji silently vanished from
    // copied text.
    if (n.classList.contains("tg-custom-emoji")) {
      const alt = n.getAttribute("data-alt");
      if (alt) return alt;
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

/* Existing bracket tokens must never be rewritten by the plain-emoji upgrade:
 * a [ce:] token's alt part, a [label](url) link label or a Rose buttonurl
 * label could contain emoji characters, and injecting a nested [ce:] token
 * there would break their regexes at render time. */
const UPGRADE_SKIP_RE =
  /\[ce:\d+:[^\]]+\]|\[[^\]\n]+\]\((?:https?|buttonurl):\/\/[^)\s]*\)/g;

/**
 * Upgrade PLAIN emoji characters to `[ce:<id>:<alt>]` tokens wherever the
 * community's discovered packs contain that character. Native Telegram apps
 * (Android/iOS — i.e. every paste inside the Mini App) copy custom emoji as
 * bare unicode characters with no data-document-id markup, so without this
 * a pasted pack emoji silently degraded to the static system glyph. Only
 * characters that exist in a pack are touched; everything else (and every
 * existing bracket token) passes through byte-identical.
 */
export function upgradePlainEmojiTokens(
  text: string,
  lookup: (alt: string) => string | null,
): string {
  if (!text) return text;
  // Fast path: no pictographic characters at all, or no Segmenter (very old
  // webviews) — leave the paste untouched.
  if (
    typeof Intl === "undefined" ||
    typeof Intl.Segmenter !== "function" ||
    !/\p{Extended_Pictographic}/u.test(text)
  ) {
    return text;
  }
  const seg = new Intl.Segmenter(undefined, { granularity: "grapheme" });
  const upgrade = (chunk: string): string => {
    if (!/\p{Extended_Pictographic}/u.test(chunk)) return chunk;
    let out = "";
    for (const { segment } of seg.segment(chunk)) {
      if (/\p{Extended_Pictographic}/u.test(segment)) {
        const id = lookup(segment);
        if (id) {
          // "]"/newline would break the token — cannot occur in a single
          // grapheme, but keep the token regex's invariant explicit.
          const alt = segment.replace(/[\]\n]/g, "");
          if (alt) {
            out += `[ce:${id}:${alt}]`;
            continue;
          }
        }
      }
      out += segment;
    }
    return out;
  };
  let out = "";
  let last = 0;
  UPGRADE_SKIP_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = UPGRADE_SKIP_RE.exec(text)) !== null) {
    out += upgrade(text.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  out += upgrade(text.slice(last));
  return out;
}
