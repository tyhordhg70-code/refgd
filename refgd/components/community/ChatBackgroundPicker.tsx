"use client";

import { useEffect, useState, type CSSProperties } from "react";
import {
  CHAT_BACKGROUNDS,
  cssGradient,
  getSelectedChatBackgroundId,
  setSelectedChatBackgroundId,
  type ChatBackgroundDef,
} from "./tg/chatBackgrounds";

/**
 * "Customize background" modal — a Telegram-style wallpaper grid. Picking a
 * tile applies instantly (the live layer listens for the change event) and
 * persists per device in localStorage; there's no server state, so the modal
 * is available to everyone, signed-in or not — just like choosing a chat
 * background in the real Telegram apps.
 *
 * Pattern tiles are previewed with a static CSS gradient of the same palette
 * plus the real pattern SVG at a smaller tile scale (Telegram's canvas engine
 * is a singleton, so it can't paint 8 thumbnails). Photo tiles use the small
 * .prev.jpg renditions so opening the grid doesn't pull ~7 MB of full-size
 * JPEGs.
 */
export default function ChatBackgroundPicker({
  onClose,
}: {
  onClose: () => void;
}) {
  const [selected, setSelected] = useState(getSelectedChatBackgroundId);
  useEffect(() => {
    // Re-read after mount in case SSR rendered the default.
    setSelected(getSelectedChatBackgroundId());
  }, []);

  const pick = (id: string) => {
    setSelected(id);
    setSelectedChatBackgroundId(id);
  };

  return (
    <div
      className="tg-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Customize background"
      onClick={onClose}
    >
      <div
        className="tg-modal is-wide tg-bgpick-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tg-modal-header">
          <h3>Chat background</h3>
          <button
            type="button"
            className="tg-icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div
          className="tg-modal-body tg-scroll tg-bgpick-body"
          data-lenis-prevent
        >
          <div className="tg-bgpick-grid">
            {CHAT_BACKGROUNDS.map((bg, i) => (
              <Tile
                key={bg.id}
                bg={bg}
                index={i}
                total={CHAT_BACKGROUNDS.length}
                selected={bg.id === selected}
                onPick={() => pick(bg.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({
  bg,
  index,
  total,
  selected,
  onPick,
}: {
  bg: ChatBackgroundDef;
  index: number;
  total: number;
  selected: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      className={`tg-bgpick-tile${selected ? " is-selected" : ""}`}
      onClick={onPick}
      aria-pressed={selected}
      aria-label={`Wallpaper ${index + 1} of ${total}`}
    >
      {bg.kind === "image" ? (
        <img
          className="tg-bgpick-photo"
          src={`/tg-bg/${bg.preview}`}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      ) : bg.intensity < 0 ? (
        <span
          className="tg-bgpick-pattern is-dark"
          style={
            {
              "--pv-gradient": cssGradient(bg.colors),
              "--pattern-url": `url('/tg-bg/${bg.file}')`,
              "--pattern-intensity": Math.abs(bg.intensity) / 100,
            } as CSSProperties
          }
        />
      ) : (
        <span
          className="tg-bgpick-pattern"
          style={
            {
              "--pv-gradient": cssGradient(bg.colors),
              "--pattern-url": `url('/tg-bg/${bg.file}')`,
              "--pattern-intensity": Math.abs(bg.intensity) / 100,
            } as CSSProperties
          }
        />
      )}
      {selected && (
        <span className="tg-bgpick-check" aria-hidden>
          <svg viewBox="0 0 24 24" fill="none">
            <path
              d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4L9 16.2Z"
              fill="currentColor"
            />
          </svg>
        </span>
      )}
    </button>
  );
}
