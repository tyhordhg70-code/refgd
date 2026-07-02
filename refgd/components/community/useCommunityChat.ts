"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  isAdmin: boolean;
  pinned: boolean;
  createdAt: string;
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
}

interface TelegramWebApp {
  initData?: string;
  platform?: string;
  version?: string;
  isFullscreen?: boolean;
  ready?: () => void;
  expand?: () => void;
  requestFullscreen?: () => void;
  exitFullscreen?: () => void;
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

export function useCommunityChat() {
  const [state, setState] = useState<ChatState | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reactOpen, setReactOpen] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyRef | null>(null);
  const [systemNote, setSystemNote] = useState<string | null>(null);
  // Admin-only auto-delete TTL (seconds) applied to the next message; 0 = keep.
  const [ttlSeconds, setTtlSeconds] = useState(0);
  const [inTelegram, setInTelegram] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

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
      const res = await fetch("/api/community/chat", { cache: "no-store" });
      if (!res.ok) throw new Error("load failed");
      const data = (await res.json()) as ChatState;
      lastIdRef.current = data.messages.reduce(
        (acc, m) => (Number(m.id) > Number(acc) ? m.id : acc),
        "0",
      );
      setState(data);
    } catch {
      setError("Couldn't load the chat. Retrying…");
    }
  }, []);

  const poll = useCallback(async () => {
    if (pollingRef.current) return;
    pollingRef.current = true;
    try {
      const res = await fetch(
        `/api/community/chat?after=${encodeURIComponent(lastIdRef.current)}`,
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
      mergeMessages(data.messages);
    } catch {
      /* transient — next tick retries */
    } finally {
      pollingRef.current = false;
    }
  }, [mergeMessages]);

  // Load the Mini App bridge, silent sign-in, then initial load.
  useEffect(() => {
    void (async () => {
      await loadTelegramBridge();
      const wa = window.Telegram?.WebApp;
      if (insideTelegram(wa)) {
        setInTelegram(true);
        setIsFullscreen(Boolean(wa?.isFullscreen));
        try {
          wa?.ready?.();
          wa?.expand?.();
        } catch {
          /* bridge quirk — non-fatal */
        }
      }
      const initData = wa?.initData;
      if (initData && !authTriedRef.current) {
        authTriedRef.current = true;
        try {
          await fetch("/api/community/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData }),
          });
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

  // Short-poll for new messages.
  useEffect(() => {
    const id = window.setInterval(() => void poll(), POLL_MS);
    return () => window.clearInterval(id);
  }, [poll]);

  // Periodic full re-fetch: merges fresh copies of already-rendered messages so
  // reaction counts and pin state stay in sync without a manual reload.
  useEffect(() => {
    const id = window.setInterval(() => {
      void (async () => {
        try {
          const res = await fetch("/api/community/chat", { cache: "no-store" });
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
          reconcileFull(data.messages);
        } catch {
          /* transient — next tick retries */
        }
      })();
    }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [reconcileFull]);

  // Keep the view pinned to the latest message when the user is at the bottom.
  useEffect(() => {
    if (atBottomRef.current && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state?.messages]);

  const onScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current =
      el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  }, []);

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    setSystemNote(null);
    try {
      const res = await fetch("/api/community/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: body,
          replyTo: replyTo?.id ?? null,
          ttlSeconds: me?.admin ? ttlSeconds : 0,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        error?: string;
        message?: ChatMessage;
        system?: string;
      };
      // A slash-command returns `system` feedback instead of a chat message.
      if (typeof data.system === "string" && data.system) {
        setSystemNote(data.system);
        if (data.ok) {
          setText("");
          setReplyTo(null);
        }
        return;
      }
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Couldn't send your message");
        return;
      }
      setText("");
      setReplyTo(null);
      atBottomRef.current = true;
      if (data.message) mergeMessages([data.message]);
    } catch {
      setError("Couldn't send your message");
    } finally {
      setSending(false);
    }
  }, [text, sending, replyTo, ttlSeconds, me, mergeMessages]);

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
    reactOpen,
    setReactOpen,
    replyTo,
    setReplyTo,
    ttlSeconds,
    setTtlSeconds,
    inTelegram,
    isFullscreen,
    canFullscreen,
    toggleFullscreen,
    scrollRef,
    onScroll,
    send,
    react,
    toggleHideMembers,
  };
}
