"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  CHAT_BG_EVENT,
  DEFAULT_CHAT_BG_ID,
  cssGradient,
  getChatBackgroundById,
  getSelectedChatBackgroundId,
  loadWallpaperEngine,
  toDataColors,
} from "./chatBackgrounds";

/**
 * Full-bleed chat wallpaper layer. Rendered as the FIRST positioned child of
 * #MiddleColumn so every later sibling (.messages-layout, header, portals)
 * paints above it; the vendored `.messages-layout{background:#fff}` is made
 * transparent in telegram.css so the wallpaper shows through, exactly like
 * Telegram Web A's chat canvas.
 *
 * Pattern wallpapers replicate the t.me/bg preview stack 1:1 — Telegram's own
 * TWallpaper canvas gradient + the pattern SVG at 420px tiling:
 *  - positive intensity → pattern above the gradient, mix-blend-mode:overlay
 *  - negative intensity → black backdrop, pattern MASKS the gradient (dark)
 * Photo wallpapers are a plain cover-fit JPEG.
 */
export default function ChatBackground() {
  // SSR renders the default; the mount effect swaps in the stored choice.
  // (localStorage can't be read during render without a hydration mismatch.)
  const [bgId, setBgId] = useState(DEFAULT_CHAT_BG_ID);
  useEffect(() => {
    setBgId(getSelectedChatBackgroundId());
    const onChange = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (typeof id === "string") setBgId(id);
    };
    window.addEventListener(CHAT_BG_EVENT, onChange);
    return () => window.removeEventListener(CHAT_BG_EVENT, onChange);
  }, []);

  const bg = getChatBackgroundById(bgId);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Re-key the canvas per wallpaper so TWallpaper re-reads data-colors.
  const patternKey =
    bg.kind === "pattern" ? `${bg.file}:${bg.colors.join("~")}` : null;
  useEffect(() => {
    if (!patternKey) return;
    let alive = true;
    void loadWallpaperEngine().then((tw) => {
      const canvas = canvasRef.current;
      if (!tw || !alive || !canvas) return;
      tw.init(canvas);
      // Known site-wide rule: no rAF loop may keep running in a hidden tab
      // (the engine's own frame cap only limits FPS, it never pauses).
      if (!document.hidden) tw.animate(true);
    });
    const onVisibility = () => {
      void loadWallpaperEngine().then((tw) => {
        if (!tw || !alive) return;
        tw.animate(!document.hidden);
      });
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", onVisibility);
      // Best-effort stop; a later init() retargets the singleton anyway.
      void loadWallpaperEngine().then((tw) => tw?.animate(false));
    };
  }, [patternKey]);

  if (bg.kind === "image") {
    return (
      <div className="tg-chat-bg" aria-hidden>
        <div
          className="tg-chat-bg-image"
          style={{ backgroundImage: `url('/tg-bg/${bg.file}')` }}
        />
      </div>
    );
  }

  const dark = bg.intensity < 0;
  const style = {
    "--pattern-url": `url('/tg-bg/${bg.file}')`,
    "--pattern-intensity": Math.abs(bg.intensity) / 100,
  } as CSSProperties;
  return (
    <div className={`tg-chat-bg${dark ? " is-dark" : ""}`} aria-hidden style={style}>
      <canvas
        key={patternKey}
        ref={canvasRef}
        className="tg-chat-bg-canvas"
        width={50}
        height={50}
        data-colors={toDataColors(bg.colors)}
        // A plain CSS gradient of the same palette sits under the canvas
        // bitmap: no white flash before (or without) Telegram's engine —
        // once TWallpaper paints, its opaque pixels simply cover it.
        style={{ background: cssGradient(bg.colors) }}
      />
      <div className="tg-chat-bg-pattern" />
    </div>
  );
}
