"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatTopic } from "@/lib/community";

/**
 * All state + behaviour for the live community chat, extracted from the old
 * CommunityChat component so the Telegram-replica UI stays purely
 * presentational. The DB is the source of truth; this hook short-polls
 * `/api/community/chat` (2.5s) for new messages and re-fetches the full
 * window every 30s so reaction/pin/deletion changes propagate. Members sign
 * in with their Telegram identity (name + photo, NEVER an @username).
 */

export const POLL_MS = 2500;
// Full re-fetch cadence so reaction/pin changes on already-rendered messages
// propagate (the `?after=` short-poll only returns brand-new messages).
export const REFRESH_MS = 30000;
export const ADMIN_TG = "https://t.me/refundgod";
export const REACTIONS = ["👍", "❤️", "🔥", "😂", "😮", "🙏", "💯", "🎉"];

export interface Reaction {
  emoji: string;
  count: number;
  mine: boolean;
}

export interface ReplyRef {
  id: string;
  authorName: string;
  body: string;
}

export interface ChatMessage {
  id: string;
  tgId: string;
  authorName: string;
  authorPhoto: string | null;
  body: string;
  /** Attached photo (chat_media id) served via /api/community/chat-media/[id]. */
  mediaId: string | null;
  isAdmin: boolean;
  pinned: boolean;
  createdAt: string;
  /** ISO timestamp of the last in-place edit, or null if never edited. */
  editedAt: string | null;
  /** ISO auto-delete deadline (group-chat TTL), or null if it never expires. */
  expiresAt?: string | null;
  reactions: Reaction[];
  reply: ReplyRef | null;
}

export interface Member {
  tid: string;
  name: string;
  photo: string | null;
  admin: boolean;
}

export interface ChatState {
  me: Member | null;
  messages: ChatMessage[];
  memberCount: number | null;
  hideMembers: boolean;
  botUsername: string | null;
  welcome: string;
  /** Names of members typing right now (excludes the viewer, max 3). */
  typing?: string[];
}

interface TelegramSafeAreaInset {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
}

interface TelegramWebApp {
  initData?: string;
  platform?: string;
  version?: string;
  isFullscreen?: boolean;
  safeAreaInset?: TelegramSafeAreaInset;
  contentSafeAreaInset?: TelegramSafeAreaInset;
  ready?: () => void;
  expand?: () => void;
  close?: () => void;
  openLink?: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink?: (url: string) => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
  disableVerticalSwipes?: () => void;
  isVersionAtLeast?: (version: string) => boolean;
  onEvent?: (event: string, handler: () => void) => void;
  offEvent?: (event: string, handler: () => void) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

const TG_BRIDGE_SRC = "https://telegram.org/js/telegram-web-app.js";
let tgBridgePromise: Promise<void> | null = null;

/**
 * Load the official Telegram Mini App bridge once. Without this script
 * `window.Telegram.WebApp` never exists, so silent sign-in and fullscreen
 * would silently no-op inside the Mini App webview.
 */
function loadTelegramBridge(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Telegram?.WebApp) return Promise.resolve();
  if (tgBridgePromise) return tgBridgePromise;
  tgBridgePromise = new Promise<void>((resolve) => {
    const s = document.createElement("script");
    s.src = TG_BRIDGE_SRC;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => resolve();
    document.head.appendChild(s);
  });
  return tgBridgePromise;
}

/** True only when actually running inside a Telegram Mini App webview. */
function insideTelegram(wa: TelegramWebApp | undefined): boolean {
  if (!wa) return false;
  if (wa.initData && wa.initData.length > 0) return true;
  return Boolean(wa.platform && wa.platform !== "unknown");
}

/**
 * Load the bridge and — when running inside the Mini App webview — signal
 * `ready()` IMMEDIATELY. Telegram keeps its opaque loading placeholder (a
 * black screen) until ready() is called, so this must run on shell mount,
 * NOT only when the chat topic is opened. Returns whether we are inside
 * Telegram. Safe to call multiple times (ready/expand are idempotent).
 */
export async function ensureTelegramReady(): Promise<boolean> {
  await loadTelegramBridge();
  const wa = window.Telegram?.WebApp;
  if (!insideTelegram(wa)) return false;
  try {
    wa?.ready?.();
    wa?.expand?.();
  } catch {
    /* bridge quirk — non-fatal */
  }
  // Match Telegram's NATIVE chrome (sheet header / status-bar area) to the
  // replica's light theme. Without this a user on a dark Telegram theme gets
  // a dark bar behind/above the app — the "weird bar behind the header".
  try {
    wa?.setHeaderColor?.("#ffffff");
    wa?.setBackgroundColor?.("#ffffff");
  } catch {
    /* older clients — non-fatal */
  }
  // Scrolling the message list must never swipe-to-close the Mini App.
  try {
    wa?.disableVerticalSwipes?.();
  } catch {
    /* Bot API < 7.7 — non-fatal */
  }
  hookSafeArea(wa);
  return true;
}

let safeAreaHooked = false;

/**
 * Mirror Telegram's safe-area insets into CSS vars. The official bridge
 * exposes them ONLY as JS objects (`safeAreaInset`/`contentSafeAreaInset`),
 * so telegram.css can't read them until we copy them onto :root. In
 * fullscreen mode these reserve the status bar + Telegram's native
 * close/collapse controls; when not fullscreen (or on old clients) they
 * are 0 and layout is unchanged.
 */
function hookSafeArea(wa: TelegramWebApp | undefined): void {
  if (!wa || safeAreaHooked) return;
  safeAreaHooked = true;
  const sync = () => {
    const root = document.documentElement;
    const px = (v: number | undefined) => `${Math.max(0, Math.round(v ?? 0))}px`;
    root.style.setProperty("--tg-safe-area-inset-top", px(wa.safeAreaInset?.top));
    root.style.setProperty(
      "--tg-content-safe-area-inset-top",
      px(wa.contentSafeAreaInset?.top),
    );
    root.style.setProperty(
      "--tg-safe-area-inset-bottom",
      px(wa.safeAreaInset?.bottom),
    );
    root.style.setProperty(
      "--tg-content-safe-area-inset-bottom",
      px(wa.contentSafeAreaInset?.bottom),
    );
  };
  try {
    sync();
    wa.onEvent?.("safeAreaChanged", sync);
    wa.onEvent?.("contentSafeAreaChanged", sync);
    wa.onEvent?.("fullscreenChanged", sync);
  } catch {
    /* older clients — non-fatal */
  }
}

/** Longest edge (px) an uploaded chat image is downscaled to client-side. */
const MAX_IMAGE_EDGE = 1600;

/**
 * Downscale a picked/pasted image to a ≤1600px JPEG before upload so the
 * 3 MB server cap is practically never hit. Small GIFs pass through as-is —
 * a canvas re-encode would freeze the animation.
 */
export async function prepareChatImage(file: Blob): Promise<Blob | null> {
  if (!file.type.startsWith("image/")) return null;
  if (file.type === "image/gif" && file.size <= 3 * 1024 * 1024) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("bad image"));
      el.src = url;
    });
    const longest = Math.max(img.naturalWidth, img.naturalHeight);
    if (!longest) return null;
    const scale = Math.min(1, MAX_IMAGE_EDGE / longest);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, w, h);
    return await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function useCommunityChat(topic: ChatTopic = "chat") {
  const [state, setState] = useState<ChatState | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reactOpen, setReactOpen] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyRef | null>(null);
  const [systemNote, setSystemNote] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  // Auto-delete TTL (seconds) applied to the next message. Every message now
  // expires after 7 days by default (owner request); admins can override to a
  // custom lifetime or "Never" (0) via the composer. Non-admins always get the
  // server-side 7-day default regardless of this value.
  const [ttlSeconds, setTtlSeconds] = useState(604800);
  // The message currently being edited in place (composer edit mode), or null.
  const [editing, setEditing] = useState<{ id: string; body: string } | null>(
    null,
  );
  // Pending image attachment (paste or attach button) — sent with the next
  // message so image + caption land in ONE bubble.
  const [attachment, setAttachmentState] = useState<{
    blob: Blob;
    previewUrl: string;
  } | null>(null);
  const [inTelegram, setInTelegram] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Who is typing right now (from the server heartbeat table, via GET).
  const [typing, setTyping] = useState<string[]>([]);

  const setAttachment = useCallback((blob: Blob | null) => {
    setAttachmentState((prev) => {
      if (prev) URL.revokeObjectURL(prev.previewUrl);
      return blob ? { blob, previewUrl: URL.createObjectURL(blob) } : null;
    });
  }, []);

  const lastIdRef = useRef<string>("0");
  const pollingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);
  const authTriedRef = useRef(false);

  const me = state?.me ?? null;

  const mergeMessages = useCallback((incoming: ChatMessage[]) => {
    if (incoming.length === 0) return;
    setState((prev) => {
      if (!prev) return prev;
      const map = new Map(prev.messages.map((m) => [m.id, m]));
      for (const m of incoming) map.set(m.id, m);
      const messages = Array.from(map.values()).sort(
        (a, b) => Number(a.id) - Number(b.id),
      );
      const maxId = messages.reduce(
        (acc, m) => (Number(m.id) > Number(acc) ? m.id : acc),
        lastIdRef.current,
      );
      lastIdRef.current = maxId;
      return { ...prev, messages };
    });
  }, []);

  // Full-snapshot reconcile for the 30s refresh: unlike the union-by-id merge,
  // this PRUNES messages the server no longer returns (e.g. after /purge) so
  // admin deletions actually disappear. Messages older than the returned window
  // are kept as-is (we never paginate older history back in).
  const reconcileFull = useCallback((incoming: ChatMessage[]) => {
    setState((prev) => {
      if (!prev) return prev;
      if (incoming.length === 0) {
        // No live messages in the latest window — nothing recent survives.
        lastIdRef.current = "0";
        return { ...prev, messages: [] };
      }
      // incoming is ASC. Keep local messages OUTSIDE the snapshot window —
      // older than its first id, or newer than its last id (e.g. a just-sent
      // message or a short-poll result that landed while this fetch was in
      // flight) — and prune anything inside the window the server dropped.
      const minId = Number(incoming[0].id);
      const maxId = Number(incoming[incoming.length - 1].id);
      const kept = prev.messages.filter(
        (m) => Number(m.id) < minId || Number(m.id) > maxId,
      );
      const messages = [...kept, ...incoming].sort(
        (a, b) => Number(a.id) - Number(b.id),
      );
      lastIdRef.current = messages.reduce(
        (acc, m) => (Number(m.id) > Number(acc) ? m.id : acc),
        lastIdRef.current,
      );
      return { ...prev, messages };
    });
  }, []);

  const loadInitial = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/community/chat?topic=${encodeURIComponent(topic)}`,
        { cache: "no-store" },
      );
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as ChatState;
      lastIdRef.current = data.messages.reduce(
        (acc, m) => (Number(m.id) > Number(acc) ? m.id : acc),
        "0",
      );
      setState(data);
      setTyping(Array.isArray(data.typing) ? data.typing : []);
    } catch {
      setError("Couldn't load the chat. Retrying…");
    }
  }, [topic]);

  const poll = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const res = await fetch(
        `/api/community/chat?after=${encodeURIComponent(
          lastIdRef.current,
        )}&topic=${encodeURIComponent(topic)}`,
        { cache: "no-store" },
      );
      if (!res.ok) return;
      const data = (await res.json()) as ChatState;
      setState((prev) =>
        prev
          ? {
              ...prev,
              me: data.me,
              memberCount: data.memberCount,
              hideMembers: data.hideMembers,
              botUsername: data.botUsername ?? prev.botUsername,
            }
          : prev,
      );
      setTyping(Array.isArray(data.typing) ? data.typing : []);
      mergeMessages(data.messages);
    } catch {
      /* transient — next tick retries */
    } finally {
      pollingRef.current = false;
    }
  }, [mergeMessages, topic]);

  // Load the Mini App bridge, silent sign-in, then initial load.
  useEffect(() => {
    void (async () => {
      const inside = await ensureTelegramReady();
      const wa = window.Telegram?.WebApp;
      if (inside) {
        setInTelegram(true);
        setIsFullscreen(Boolean(wa?.isFullscreen));
      }
      const initData = wa?.initData;
      if (inside && !initData) {
        // In the Telegram webview but Telegram handed us no initData — this
        // happens when the page is opened as a plain in-app link instead of
        // through the bot's Mini App button.
        setAuthError(
          "Telegram didn't provide sign-in data — open the community through the bot's app button, not a plain link.",
        );
      }
      if (initData && !authTriedRef.current) {
        authTriedRef.current = true;
        try {
          const res = await fetch("/api/community/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData }),
          });
          const data = (await res.json().catch(() => null)) as {
            ok?: boolean;
            error?: string;
          } | null;
          if (!res.ok || !data?.ok) {
            setAuthError(
              typeof data?.error === "string" && data.error
                ? data.error
                : "Telegram verification failed.",
            );
          } else {
            setAuthError(null);
          }
        } catch {
          /* sign-in retries on next open */
        }
      }
      await loadInitial();
    })();
  }, [loadInitial]);

  // Track fullscreen state changes from the Telegram client.
  useEffect(() => {
    if (!inTelegram) return;
    const wa = window.Telegram?.WebApp;
    if (!wa?.onEvent) return;
    const sync = () => setIsFullscreen(Boolean(wa.isFullscreen));
    const failed = () => setIsFullscreen(Boolean(wa.isFullscreen));
    wa.onEvent("fullscreenChanged", sync);
    wa.onEvent("fullscreenFailed", failed);
    return () => {
      wa.offEvent?.("fullscreenChanged", sync);
      wa.offEvent?.("fullscreenFailed", failed);
    };
  }, [inTelegram]);

  const canFullscreen =
    inTelegram &&
    typeof window !== "undefined" &&
    typeof window.Telegram?.WebApp?.requestFullscreen === "function" &&
    (window.Telegram?.WebApp?.isVersionAtLeast?.("8.0") ?? true);

  const toggleFullscreen = useCallback(() => {
    const wa = window.Telegram?.WebApp;
    if (!wa) return;
    try {
      if (wa.isFullscreen) wa.exitFullscreen?.();
      else if (wa.requestFullscreen) wa.requestFullscreen();
      else wa.expand?.();
    } catch {
      wa.expand?.();
    }
  }, []);

  // Short-poll for new messages. PAUSED while the tab is hidden — a
  // backgrounded tab used to keep polling every 2.5s forever, which (across
  // all open tabs, 24/7) was a top database-egress source in the July 2026
  // Neon data-transfer-quota outage. On return to the tab we poll
  // immediately, so nothing feels slower.
  useEffect(() => {
    const tick = () => {
      if (document.hidden) return;
      void poll();
    };
    const id = window.setInterval(tick, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [poll]);

  // Periodic full re-fetch: merges fresh copies of already-rendered messages so
  // reaction counts and pin state stay in sync without a manual reload.
  // Also paused while hidden (same egress incident — this one re-downloaded
  // the whole 60-message window every 30s per tab); a catch-up refresh runs
  // when the tab becomes visible again if one is overdue.
  useEffect(() => {
    let lastRun = Date.now();
    const run = async () => {
      lastRun = Date.now();
      try {
        const res = await fetch(
          `/api/community/chat?topic=${encodeURIComponent(topic)}`,
          { cache: "no-store" },
        );
        if (!res.ok) return;
        const data = (await res.json()) as ChatState;
        setState((prev) =>
          prev
            ? {
                ...prev,
                me: data.me,
                memberCount: data.memberCount,
                hideMembers: data.hideMembers,
                botUsername: data.botUsername ?? prev.botUsername,
                welcome: data.welcome ?? prev.welcome,
              }
            : prev,
        );
        setTyping(Array.isArray(data.typing) ? data.typing : []);
        reconcileFull(data.messages);
      } catch {
        /* transient — next tick retries */
      }
    };
    const id = window.setInterval(() => {
      if (document.hidden) return;
      void run();
    }, REFRESH_MS);
    const onVisible = () => {
      if (!document.hidden && Date.now() - lastRun >= REFRESH_MS) void run();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [reconcileFull, topic]);

  // Keep the view pinned to the latest message when the user is at the bottom.
  // On the FIRST render of a topic, restore the scroll spot saved when the
  // viewer last left it (topic switches unmount the list, so the DOM position
  // is lost otherwise); "bottom" (or nothing saved) keeps the default
  // scroll-to-latest behaviour.
  const didRestoreRef = useRef(false);
  useEffect(() => {
    const el = scrollRef.current;
    // Gate on the initial fetch finishing (NOT on live messages existing) so
    // history-only topics — e.g. vouches, whose bubbles render from props —
    // still get their spot restored.
    if (!el || state === null || didRestoreRef.current) return;
    didRestoreRef.current = true;
    let saved: string | null = null;
    try {
      saved = localStorage.getItem(`rg_scroll_${topic}`);
    } catch {
      /* storage unavailable */
    }
    if (saved && saved !== "bottom") {
      const top = Number(saved);
      if (Number.isFinite(top) && top >= 0) {
        atBottomRef.current = false;
        el.scrollTop = top;
        return;
      }
    }
    el.scrollTop = el.scrollHeight;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state === null, topic]);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || !state?.messages?.length) return;
    if (atBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [state?.messages]);

  // While the viewer is at the bottom, KEEP them fully at the bottom as the
  // content grows after the fact (photos/custom emoji finishing loading used
  // to leave the view landing slightly above the last message).
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || state === null || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      if (atBottomRef.current) el.scrollTop = el.scrollHeight;
    });
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state === null]);

  // Persist the scroll spot (trailing-edge throttled) so reopening the topic
  // resumes where the viewer left off; a plain "bottom" sentinel keeps the
  // default jump-to-latest.
  const saveScrollTimerRef = useRef<number | null>(null);
  // Last observed scroll snapshot — read in the unmount cleanup, where React
  // has ALREADY detached scrollRef (DOM refs null out before passive-effect
  // cleanups run on unmount).
  const scrollSnapRef = useRef<{ top: number; atBottom: boolean } | null>(
    null,
  );
  const saveScrollSpot = useCallback(() => {
    const el = scrollRef.current;
    const snap = el
      ? { top: Math.round(el.scrollTop), atBottom: atBottomRef.current }
      : scrollSnapRef.current;
    if (!snap) return;
    try {
      localStorage.setItem(
        `rg_scroll_${topic}`,
        snap.atBottom ? "bottom" : String(snap.top),
      );
    } catch {
      /* storage unavailable */
    }
  }, [topic]);
  useEffect(() => {
    return () => {
      if (saveScrollTimerRef.current !== null) {
        window.clearTimeout(saveScrollTimerRef.current);
        saveScrollTimerRef.current = null;
      }
      saveScrollSpot();
    };
  }, [saveScrollSpot]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    scrollSnapRef.current = {
      top: Math.round(el.scrollTop),
      atBottom: atBottomRef.current,
    };
    if (saveScrollTimerRef.current === null) {
      saveScrollTimerRef.current = window.setTimeout(() => {
        saveScrollTimerRef.current = null;
        saveScrollSpot();
      }, 250);
    }
  }, [saveScrollSpot]);

  // Delete a message with instant optimistic removal. The /del moderation
  // command soft-deletes server-side (admin/own-message gated there); on
  // failure we resync from the server so the message reappears. Returns
  // whether the delete succeeded so the caller can surface a toast.
  const deleteMessage = useCallback(
    async (id: string): Promise<boolean> => {
      setSystemNote(null);
      setState((prev) =>
        prev
          ? { ...prev, messages: prev.messages.filter((m) => m.id !== id) }
          : prev,
      );
      try {
        const res = await fetch("/api/community/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: "/del",
            replyTo: id,
            ttlSeconds: 0,
            topic,
          }),
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
        } | null;
        const ok = Boolean(res.ok && data?.ok !== false);
        if (!ok) {
          setError(data?.error ?? "Couldn't delete that message");
          void loadInitial();
        }
        return ok;
      } catch {
        setError("Couldn't delete that message");
        void loadInitial();
        return false;
      }
    },
    [topic, loadInitial],
  );

  // Edit a message body in place. Returns whether the edit succeeded; the
  // refreshed (edited_at-stamped) message is merged back on success.
  const editMessage = useCallback(
    async (id: string, body: string): Promise<boolean> => {
      const trimmed = body.trim();
      if (!trimmed) return false;
      setError(null);
      setSystemNote(null);
      try {
        const res = await fetch("/api/community/chat/edit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, body: trimmed }),
        });
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
          message?: ChatMessage;
        } | null;
        if (!res.ok || !data?.ok || !data.message) {
          setError(data?.error ?? "Couldn't edit your message");
          return false;
        }
        mergeMessages([data.message]);
        return true;
      } catch {
        setError("Couldn't edit your message");
        return false;
      }
    },
    [mergeMessages],
  );

  // Enter composer edit mode for a message: seed the composer with its body
  // and clear any reply/attachment (an edit replaces text only).
  const beginEdit = useCallback(
    (m: ChatMessage) => {
      setEditing({ id: m.id, body: m.body });
      setText(m.body);
      setReplyTo(null);
      setAttachment(null);
      setError(null);
    },
    [setAttachment],
  );

  const cancelEdit = useCallback(() => {
    setEditing(null);
    setText("");
  }, []);

  const send = useCallback(async () => {
    const body = text.trim();
    // Composer edit mode: the submit routes to the edit endpoint instead of a
    // new post (no attachment/reply while editing).
    if (editing) {
      if (!body || sending) return;
      setSending(true);
      const ok = await editMessage(editing.id, body);
      setSending(false);
      if (ok) {
        setEditing(null);
        setText("");
      }
      return;
    }
    if ((!body && !attachment) || sending) return;
    setSending(true);
    setError(null);
    setSystemNote(null);
    try {
      let res: Response;
      if (attachment) {
        // Photo (with optional caption) → multipart; ONE bubble server-side.
        const form = new FormData();
        form.append("photo", attachment.blob, "photo.jpg");
        form.append("text", body);
        if (replyTo?.id) form.append("replyTo", replyTo.id);
        form.append("ttlSeconds", String(me?.admin ? ttlSeconds : 0));
        form.append("topic", topic);
        res = await fetch("/api/community/chat", {
          method: "POST",
          body: form,
        });
      } else {
        res = await fetch("/api/community/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: body,
            replyTo: replyTo?.id ?? null,
            ttlSeconds: me?.admin ? ttlSeconds : 0,
            topic,
          }),
        });
      }
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        message?: ChatMessage;
        /** Bot auto-replies (filter hits) created alongside the message. */
        extra?: ChatMessage[];
        system?: string;
      };
      // A slash-command returns `system` feedback instead of a chat message.
      if (typeof data.system === "string" && data.system) {
        setSystemNote(data.system);
        if (data.ok) {
          setText("");
          setReplyTo(null);
          // A successful command may have deleted/purged/pinned messages —
          // refetch so the feed reflects it immediately instead of waiting
          // for the next poll.
          void loadInitial();
        }
        return;
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Couldn't send your message");
        return;
      }
      setText("");
      setReplyTo(null);
      setAttachment(null);
      atBottomRef.current = true;
      const incoming = [
        ...(data.message ? [data.message] : []),
        ...(data.extra ?? []),
      ];
      if (incoming.length) mergeMessages(incoming);
    } catch {
      setError("Couldn't send your message");
    } finally {
      setSending(false);
    }
  }, [
    text,
    attachment,
    setAttachment,
    sending,
    replyTo,
    ttlSeconds,
    me,
    mergeMessages,
    loadInitial,
    topic,
    editing,
    editMessage,
  ]);

  // Throttled "I'm typing" heartbeat: at most one ping every 3s while the
  // member is actively typing. Fire-and-forget — presence must never block
  // or error the composer.
  const lastTypingPingRef = useRef(0);
  const notifyTyping = useCallback(() => {
    if (!me) return;
    const now = Date.now();
    if (now - lastTypingPingRef.current < 3000) return;
    lastTypingPingRef.current = now;
    void fetch("/api/community/chat/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic }),
    }).catch(() => undefined);
  }, [me, topic]);

  // Upload a recorded voice note (multipart `voice`). The server composes the
  // [voice:<mediaId>:<dur>:<wf>] body token after moderation gates pass.
  const sendVoice = useCallback(
    async (blob: Blob, durationSec: number, waveform: string): Promise<boolean> => {
      if (sending) return false;
      setSending(true);
      setError(null);
      setSystemNote(null);
      try {
        const form = new FormData();
        form.append("voice", blob, "voice");
        form.append("duration", String(Math.max(1, Math.round(durationSec))));
        form.append("waveform", waveform);
        form.append("text", "");
        if (replyTo?.id) form.append("replyTo", replyTo.id);
        form.append("ttlSeconds", String(me?.admin ? ttlSeconds : 0));
        form.append("topic", topic);
        const res = await fetch("/api/community/chat", {
          method: "POST",
          body: form,
        });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          message?: ChatMessage;
        };
        if (!res.ok || !data.ok) {
          setError(data.error ?? "Couldn't send the voice message");
          return false;
        }
        setReplyTo(null);
        atBottomRef.current = true;
        if (data.message) mergeMessages([data.message]);
        return true;
      } catch {
        setError("Couldn't send the voice message");
        return false;
      } finally {
        setSending(false);
      }
    },
    [sending, replyTo, ttlSeconds, me, mergeMessages, topic],
  );

  const react = useCallback(
    async (messageId: string, emoji: string) => {
      setReactOpen(null);
      if (!me) {
        setError("Sign in with Telegram to react");
        return;
      }
      try {
        const res = await fetch("/api/community/chat/react", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messageId, emoji }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          reactions?: Reaction[];
        };
        if (!res.ok || !data.ok || !data.reactions) return;
        setState((prev) =>
          prev
            ? {
                ...prev,
                messages: prev.messages.map((m) =>
                  m.id === messageId
                    ? { ...m, reactions: data.reactions as Reaction[] }
                    : m,
                ),
              }
            : prev,
        );
      } catch {
        /* ignore transient reaction errors */
      }
    },
    [me],
  );

  // Run a moderation slash-command against a specific message (context menu
  // Pin / Delete / Ban) without touching the composer. Rides the exact same
  // POST pipeline as a typed command, so server-side auth and auditing apply.
  const sendCommand = useCallback(
    async (cmd: string, replyToId?: string | null): Promise<boolean> => {
      setSystemNote(null);
      try {
        const res = await fetch("/api/community/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: cmd,
            replyTo: replyToId ?? null,
            ttlSeconds: 0,
            topic,
          }),
        });
        const data = (await res.json()) as {
          ok: boolean;
          error?: string;
          system?: string;
        };
        if (!res.ok || !data.ok) {
          // A rejected command comes back HTTP 200 with ok:false and its reason
          // in `system` (e.g. "Reply to a message to pin it."); surface that,
          // falling back to `error` for a hard failure. On success we stay quiet
          // here — the caller shows its own toast.
          setSystemNote(data.system || data.error || "Couldn't run that action");
          return false;
        }
        // Optimistically reflect a pin/unpin: the pinned flag (and the pinned
        // banner + pinned-only panel that derive from it) otherwise only
        // update on the slow full refresh, so the action looked like it did
        // nothing.
        if (replyToId && (cmd === "/pin" || cmd === "/unpin")) {
          const pinned = cmd === "/pin";
          setState((prev) =>
            prev
              ? {
                  ...prev,
                  messages: prev.messages.map((m) =>
                    m.id === replyToId ? { ...m, pinned } : m,
                  ),
                }
              : prev,
          );
        }
        return true;
      } catch {
        setError("Couldn't run that action");
        return false;
      }
    },
    [topic],
  );

  const toggleHideMembers = useCallback(async () => {
    if (!me?.admin || !state) return;
    const next = !state.hideMembers;
    try {
      const res = await fetch("/api/community/chat/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hideMembers: next }),
      });
      if (res.ok) {
        setState((prev) => (prev ? { ...prev, hideMembers: next } : prev));
      }
    } catch {
      /* ignore */
    }
  }, [me, state]);

  return {
    state,
    me,
    text,
    setText,
    sending,
    error,
    setError,
    systemNote,
    setSystemNote,
    authError,
    reactOpen,
    setReactOpen,
    replyTo,
    setReplyTo,
    ttlSeconds,
    setTtlSeconds,
    attachment,
    setAttachment,
    inTelegram,
    isFullscreen,
    canFullscreen,
    toggleFullscreen,
    scrollRef,
    atBottomRef,
    onScroll,
    send,
    sendVoice,
    typing,
    notifyTyping,
    react,
    sendCommand,
    deleteMessage,
    editMessage,
    editing,
    beginEdit,
    cancelEdit,
    toggleHideMembers,
  };
}
