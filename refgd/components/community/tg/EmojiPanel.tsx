"use client";

import { Fragment, useRef, useState } from "react";
import { CustomEmojiImg, emojiSrc } from "./format";
import { EMOJI_CATEGORIES } from "./emoji-data";
import { CUSTOM_EMOJI } from "@/lib/custom-emoji";

/**
 * Composer emoji picker — a light Web A symbol-menu replica with two tabs:
 * the full standard Apple-emoji set (grouped into Web A's categories with a
 * horizontal category slider) and the community's custom (premium pack) emoji
 * captured from the real group chat. Standard picks insert the plain
 * character; custom picks insert a `[ce:<documentId>:<alt>]` token that
 * renderBody turns back into the sticker artwork.
 */

export default function EmojiPanel({
  onPick,
  onClose,
}: {
  onPick: (snippet: string) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<"standard" | "custom">("standard");
  const [activeCat, setActiveCat] = useState(EMOJI_CATEGORIES[0].key);
  const sectionRefs = useRef(new Map<string, HTMLDivElement>());

  const scrollToCat = (key: string) => {
    setActiveCat(key);
    sectionRefs.current.get(key)?.scrollIntoView({ block: "start" });
  };

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
        {tab === "standard" ? (
          <>
            <div className="tg-emoji-cats" role="tablist">
              {EMOJI_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  type="button"
                  role="tab"
                  aria-selected={activeCat === cat.key}
                  className={
                    "tg-emoji-cat" + (activeCat === cat.key ? " active" : "")
                  }
                  onClick={() => scrollToCat(cat.key)}
                  aria-label={cat.label}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={emojiSrc(cat.icon)}
                    className="emoji"
                    alt={cat.label}
                    draggable={false}
                    loading="lazy"
                  />
                </button>
              ))}
            </div>
            <div className="tg-emoji-grid custom-scroll">
              {EMOJI_CATEGORIES.map((cat) => (
                <Fragment key={cat.key}>
                  <div
                    ref={(el) => {
                      if (el) sectionRefs.current.set(cat.key, el);
                      else sectionRefs.current.delete(cat.key);
                    }}
                    className="tg-emoji-section-title"
                  >
                    {cat.label}
                  </div>
                  {cat.emojis.map((e) => (
                    <button
                      key={`${cat.key}-${e}`}
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
                  ))}
                </Fragment>
              ))}
            </div>
          </>
        ) : (
          <div className="tg-emoji-grid custom-scroll">
            {CUSTOM_EMOJI.map((c) => (
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
        )}
      </div>
    </>
  );
}
