"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { CustomEmojiImg, emojiSrc } from "./format";
import { EMOJI_CATEGORIES } from "./emoji-data";
import { CUSTOM_EMOJI } from "@/lib/custom-emoji";

/**
 * Composer emoji picker — a light Web A symbol-menu replica with two tabs:
 * the full standard Apple-emoji set (grouped into Web A's categories with a
 * horizontal category slider) and the community's custom (premium pack) emoji.
 *
 * The Custom tab fetches the discovered packs from /api/community/emoji/list
 * (populated by an admin running discovery once). When discovery has run it
 * shows every emoji in each pack, grouped with a pack slider; otherwise it
 * falls back to the static seed set so the tab always renders. Standard picks
 * insert the plain character; custom picks insert a `[ce:<documentId>:<alt>]`
 * token that renderBody turns back into the sticker artwork.
 */

interface EmojiRef {
  id: string;
  alt: string;
}
interface PackGroup {
  setName: string;
  title: string;
  emoji: EmojiRef[];
}

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

  // Discovered custom packs (null until first load; falls back to static).
  const [packs, setPacks] = useState<PackGroup[] | null>(null);
  const [packsLoaded, setPacksLoaded] = useState(false);
  const [activePack, setActivePack] = useState<string>("");
  const packRefs = useRef(new Map<string, HTMLDivElement>());

  const scrollToCat = (key: string) => {
    setActiveCat(key);
    sectionRefs.current.get(key)?.scrollIntoView({ block: "start" });
  };
  const scrollToPack = (key: string) => {
    setActivePack(key);
    packRefs.current.get(key)?.scrollIntoView({ block: "start" });
  };

  useEffect(() => {
    if (tab !== "custom" || packsLoaded) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/community/emoji/list");
        const data = (await res.json()) as {
          ok?: boolean;
          groups?: PackGroup[];
        };
        if (
          !cancelled &&
          data?.ok &&
          Array.isArray(data.groups) &&
          data.groups.length > 0
        ) {
          setPacks(data.groups);
          setActivePack(data.groups[0].setName || data.groups[0].title || "0");
        }
      } catch {
        /* ignore — the static seed set below is the fallback */
      } finally {
        if (!cancelled) setPacksLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, packsLoaded]);

  const packKey = (g: PackGroup, i: number) => g.setName || g.title || `pack-${i}`;

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
        ) : packs && packs.length > 0 ? (
          <>
            {packs.length > 1 && (
              <div className="tg-emoji-cats" role="tablist">
                {packs.map((g, i) => {
                  const key = packKey(g, i);
                  const icon = g.emoji[0];
                  return (
                    <button
                      key={key}
                      type="button"
                      role="tab"
                      aria-selected={activePack === key}
                      className={
                        "tg-emoji-cat" + (activePack === key ? " active" : "")
                      }
                      onClick={() => scrollToPack(key)}
                      aria-label={g.title || g.setName}
                    >
                      {icon ? (
                        <CustomEmojiImg id={icon.id} alt={icon.alt} />
                      ) : (
                        <span>{g.title.slice(0, 1) || "?"}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            <div className="tg-emoji-grid custom-scroll">
              {packs.map((g, i) => {
                const key = packKey(g, i);
                return (
                  <Fragment key={key}>
                    <div
                      ref={(el) => {
                        if (el) packRefs.current.set(key, el);
                        else packRefs.current.delete(key);
                      }}
                      className="tg-emoji-section-title"
                    >
                      {g.title || g.setName || "Custom"}
                    </div>
                    {g.emoji.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => onPick(`[ce:${c.id}:${c.alt}]`)}
                        aria-label={`Insert custom emoji ${c.alt}`}
                      >
                        <CustomEmojiImg id={c.id} alt={c.alt} />
                      </button>
                    ))}
                  </Fragment>
                );
              })}
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
