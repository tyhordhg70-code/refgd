"use client";

  import { Fragment, type JSX } from "react";

  /**
   * ShopMarkdown — tiny zero-dep markdown renderer for product descriptions
   * pulled from the Billgang API. Handles the subset Billgang uses:
   *
   *   **bold**           → <strong>
   *   _italic_           → <em>
   *   `code`             → <code>
   *   # / ## / ### headings
   *   - list items / * list items / 1. ordered items
   *   blank line         → paragraph break
   *   single newline     → <br/>
   *   [text](url)        → external link
   *
   * Stays small + safe (no eval, no innerHTML for user content).
   */

  type InlineNode = string | JSX.Element;

  function renderInline(text: string, keyPrefix = ""): InlineNode[] {
    const nodes: InlineNode[] = [];
    // pattern order matters: link first, then bold, code, italic
    const re =
      /(!\[[^\]]*\]\([^)]+\))|(\[[^\]]+\]\([^)]+\))|(\*\*[^*\n]+\*\*)|(`[^`\n]+`)|(_[^_\n]+_)/g;
    let last = 0;
    let i = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(text))) {
      if (m.index > last) nodes.push(text.slice(last, m.index));
      const tok = m[0];
      const k = `${keyPrefix}-i${i++}`;
      if (tok.startsWith("![")) {
        const im = tok.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
        if (im) {
          nodes.push(
            <img
              key={k}
              src={im[2]}
              alt={im[1]}
              loading="lazy"
              className="my-3 block max-h-[360px] w-auto max-w-full rounded-xl border border-white/10"
              onError={(e) => {
                (e.currentTarget as HTMLImageElement).style.display = "none";
              }}
            />,
          );
        }
      } else if (tok.startsWith("[")) {
        const lm = tok.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (lm) {
          nodes.push(
            <a
              key={k}
              href={lm[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="text-amber-300 underline underline-offset-2 hover:text-amber-200"
            >
              {lm[1]}
            </a>,
          );
        }
      } else if (tok.startsWith("**")) {
        nodes.push(<strong key={k} className="font-semibold text-white">{tok.slice(2, -2)}</strong>);
      } else if (tok.startsWith("`")) {
        nodes.push(<code key={k} className="rounded bg-white/10 px-1.5 py-0.5 text-[0.85em] text-amber-200">{tok.slice(1, -1)}</code>);
      } else if (tok.startsWith("_")) {
        nodes.push(<em key={k} className="italic text-white/90">{tok.slice(1, -1)}</em>);
      }
      last = m.index + tok.length;
    }
    if (last < text.length) nodes.push(text.slice(last));
    // Render single \n inside a paragraph as <br/>
    return nodes.flatMap((n, idx) => {
      if (typeof n !== "string") return [n];
      const parts = n.split("\n");
      if (parts.length === 1) return [n];
      const out: InlineNode[] = [];
      parts.forEach((p, i2) => {
        if (p) out.push(p);
        if (i2 < parts.length - 1) out.push(<br key={`${keyPrefix}-br-${idx}-${i2}`} />);
      });
      return out;
    });
  }

  export default function ShopMarkdown({
    source,
    className = "",
  }: {
    source: string;
    className?: string;
  }) {
    if (!source?.trim()) return null;

    // Normalise: CRLF → LF, trim
    const text = source.replace(/\r\n?/g, "\n").trim();
    // Split into blocks on blank lines
    const blocks = text.split(/\n{2,}/);

    const elements: JSX.Element[] = [];
    blocks.forEach((raw, bi) => {
      const block = raw.trim();
      if (!block) return;
      const key = `b${bi}`;

      // Headings
      const hm = block.match(/^(#{1,3})\s+(.+)$/);
      if (hm && !block.includes("\n")) {
        const level = hm[1].length;
        const inner = renderInline(hm[2], key);
        if (level === 1)
          elements.push(<h2 key={key} className="editorial-display mt-6 mb-3 text-xl uppercase text-white">{inner}</h2>);
        else if (level === 2)
          elements.push(<h3 key={key} className="editorial-display mt-5 mb-2 text-lg uppercase text-white">{inner}</h3>);
        else
          elements.push(<h4 key={key} className="mt-4 mb-2 text-sm font-bold uppercase tracking-[0.18em] text-amber-300">{inner}</h4>);
        return;
      }

      // Bullet list
      const lines = block.split("\n");
      if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
        elements.push(
          <ul key={key} className="my-3 space-y-1.5 pl-5 text-white/85 marker:text-amber-300/80 list-disc">
            {lines.map((l, li) => (
              <li key={`${key}-l${li}`}>{renderInline(l.replace(/^\s*[-*]\s+/, ""), `${key}-l${li}`)}</li>
            ))}
          </ul>,
        );
        return;
      }
      // Ordered list
      if (lines.every((l) => /^\s*\d+\.\s+/.test(l))) {
        elements.push(
          <ol key={key} className="my-3 space-y-1.5 pl-5 text-white/85 marker:text-amber-300/80 list-decimal">
            {lines.map((l, li) => (
              <li key={`${key}-l${li}`}>{renderInline(l.replace(/^\s*\d+\.\s+/, ""), `${key}-l${li}`)}</li>
            ))}
          </ol>,
        );
        return;
      }

      // Default paragraph
      elements.push(
        <p key={key} className="my-3 leading-[1.75] text-white/85">
          {renderInline(block, key)}
        </p>,
      );
    });

    return <div className={`break-words [&_pre]:overflow-x-auto [&_img]:max-w-full [&_img]:h-auto [&_table]:block [&_table]:overflow-x-auto [&_a]:break-all ${className}`}>{elements.map((e, i) => <Fragment key={i}>{e}</Fragment>)}</div>;
  }
  