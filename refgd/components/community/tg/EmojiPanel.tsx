"use client";

import { useState } from "react";
import { CustomEmojiImg, emojiSrc } from "./format";
import { CUSTOM_EMOJI } from "@/lib/custom-emoji";

/**
 * Composer emoji picker — a light Web A symbol-menu replica with two tabs:
 * the standard Apple-emoji grid and the community's custom (premium pack)
 * emoji captured from the real group chat. Standard picks insert the plain
 * character; custom picks insert a `[ce:<documentId>:<alt>]` token that
 * renderBody turns back into the sticker artwork.
 */

const STANDARD_EMOJI = [
  "😀", "😁", "😂", "🤣", "😊", "😇", "🙂", "😉",
  "😍", "😘", "😜", "🤪", "🤩", "🥳", "😎", "🤗",
  "🤔", "😐", "😅", "😴", "😭", "😤", "😡", "😱",
  "👍", "👎", "👏", "🙏", "🤝", "💪", "🔥", "⚡️",
  "🌟", "⭐️", "✨", "🎉", "❤️", "💯", "💵", "💰",
  "🛒", "📦", "✈️", "✅", "✔️", "❗️", "❓", "📣",
];

export default function EmojiPanel({
  onPick,
  onClose,
}: {
  onPick: (snippet: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"standard" | "custom">("standard");
  return (
    <>
      <button
        type="button"
        className="tg-menu-backdrop"
        onClick={onClose}
        aria-label="Close emoji panel"
      />
      <div className="tg-emoji-panel">
        <div className="tg-emoji-tabs" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === "standard"}
            className={tab === "standard" ? "active" : undefined}
            onClick={() => setTab("standard")}
          >
            Emoji
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "custom"}
            className={tab === "custom" ? "active" : undefined}
            onClick={() => setTab("custom")}
          >
            Custom
          </button>
        </div>
        <div className="tg-emoji-grid custom-scroll">
          {tab === "standard"
            ? STANDARD_EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => onPick(e)}
                  aria-label={`Insert ${e}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={emojiSrc(e)}
                    className="emoji"
                    alt={e}
                    draggable={false}
                    loading="lazy"
                  />
                </button>
              ))
            : CUSTOM_EMOJI.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onPick(`[ce:${c.id}:${c.alt}]`)}
                  aria-label={`Insert custom emoji ${c.alt}`}
                >
                  <CustomEmojiImg id={c.id} alt={c.alt} />
                </button>
              ))}
        </div>
      </div>
    </>
  );
}
