"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Live group chat for /community. The DB is the source of truth; this client
 * short-polls `/api/community/chat` (2.5s) for new messages. Members sign in
 * with their Telegram identity (name + photo, NEVER an @username). Admins get
 * an "Admin" tag. There are no member-to-member DMs — "Message admin" opens
 * the owner's Telegram directly.
 */

const POLL_MS = 2500;
// Full re-fetch cadence so reaction/pin changes on already-rendered messages
// propagate (the `?after=` short-poll only returns brand-new messages).
const REFRESH_MS = 30000;
const ADMIN_TG = "https://t.me/refundgod";
const REACTIONS = ["👍", "❤️", "🔥", "😂", "😮", "🙏", "💯", "🎉"];

interface Reaction {
  emoji: string;
  count: number;
  mine: boolean;
}

interface ReplyRef {
  id: string;
  authorName: string;
  body: string;
}

interface ChatMessage {
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

interface Member {
  tid: string;
  name: string;
  photo: string | null;
  admin: boolean;
}

interface ChatState {
  me: Member | null;
  messages: ChatMessage[];
  memberCount: number | null;
  hideMembers: boolean;
  botUsername: string | null;
  welcome: string;
}

interface TelegramAuthUser {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData?: string;
        ready?: () => void;
        expand?: () => void;
      };
    };
    onTelegramAuth?: (user: TelegramAuthUser) => void;
  }
}

const AVATAR_COLORS = [
  "from-amber-400/80 to-orange-500/80",
  "from-cyan-400/80 to-blue-500/80",
  "from-violet-400/80 to-fuchsia-500/80",
  "from-emerald-400/80 to-teal-500/80",
  "from-rose-400/80 to-pink-500/80",
  "from-sky-400/80 to-indigo-500/80",
];

function avatarClass(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function formatTime(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const URL_RE = /(https?:\/\/[^\s]+|t\.me\/[^\s]+)/g;

function renderBody(body: string): ReactNode {
  if (!body) return null;
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  URL_RE.lastIndex = 0;
  let k = 0;
  while ((match = URL_RE.exec(body)) !== null) {
    if (match.index > last) out.push(body.slice(last, match.index));
    const raw = match[0];
    const href = raw.startsWith("http") ? raw : `https://${raw}`;
    out.push(
      <a
        key={`l${k}`}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-amber-300 underline decoration-amber-300/40 underline-offset-2 hover:text-amber-200"
      >
        {raw}
      </a>,
    );
    last = match.index + raw.length;
    k += 1;
  }
  if (last < body.length) out.push(body.slice(last));
  return out;
}

function Avatar({ name, photo }: { name: string; photo: string | null }) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photo}
        alt=""
        loading="lazy"
        className="h-9 w-9 shrink-0 rounded-full border border-white/10 object-cover"
      />
    );
  }
  return (
    <div
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${avatarClass(
        name,
      )} text-xs font-bold text-black/80`}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}

export default function CommunityChat() {
  const [state, setState] = useState<ChatState | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reactOpen, setReactOpen] = useState<string | null>(null);
  const [replyTo, setReplyTo] = useState<ReplyRef | null>(null);
  const [systemNote, setSystemNote] = useState<string | null>(null);

  const lastIdRef = useRef<string>("0");
  const pollingRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const atBottomRef = useRef(true);
  const authTriedRef = useRef(false);
  const widgetHostRef = useRef<HTMLDivElement | null>(null);

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

  // Initial load + Telegram Mini App silent sign-in.
  useEffect(() => {
    void (async () => {
      const initData = window.Telegram?.WebApp?.initData;
      if (initData && !authTriedRef.current) {
        authTriedRef.current = true;
        try {
          window.Telegram?.WebApp?.ready?.();
          await fetch("/api/community/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ initData }),
          });
        } catch {
          /* fall back to the Login Widget below */
        }
      }
      await loadInitial();
    })();
  }, [loadInitial]);

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

  // Render the Telegram Login Widget when signed out (web / non-Mini-App).
  useEffect(() => {
    const host = widgetHostRef.current;
    if (!host || me || !state?.botUsername) return;
    host.innerHTML = "";
    window.onTelegramAuth = (user: TelegramAuthUser) => {
      void (async () => {
        try {
          await fetch("/api/community/auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ widget: user }),
          });
          await loadInitial();
        } catch {
          setError("Sign-in failed. Please try again.");
        }
      })();
    };
    const s = document.createElement("script");
    s.src = "https://telegram.org/js/telegram-widget.js?22";
    s.async = true;
    s.setAttribute("data-telegram-login", state.botUsername);
    s.setAttribute("data-size", "large");
    s.setAttribute("data-userpic", "true");
    s.setAttribute("data-request-access", "write");
    s.setAttribute("data-onauth", "onTelegramAuth(user)");
    host.appendChild(s);
    return () => {
      host.innerHTML = "";
    };
  }, [me, state?.botUsername, loadInitial]);

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
        body: JSON.stringify({ text: body, replyTo: replyTo?.id ?? null }),
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
  }, [text, sending, replyTo, mergeMessages]);

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
      if (res.ok) setState((prev) => (prev ? { ...prev, hideMembers: next } : prev));
    } catch {
      /* ignore */
    }
  }, [me, state]);

  if (!state) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-6 py-16 text-center text-white/50">
        Loading chat…
      </div>
    );
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-white/10 bg-ink-950/50 px-4 py-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-white">Group Chat</p>
          <p className="text-xs text-white/45">
            {state.memberCount !== null
              ? `${state.memberCount} member${state.memberCount === 1 ? "" : "s"}`
              : "Members hidden"}
            {me?.admin && (
              <button
                type="button"
                onClick={() => void toggleHideMembers()}
                className="ml-2 text-amber-300/80 underline decoration-dotted hover:text-amber-200"
              >
                {state.hideMembers ? "show count" : "hide count"}
              </button>
            )}
          </p>
        </div>
        <a
          href={ADMIN_TG}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-200 hover:bg-amber-400/20"
        >
          Message admin
        </a>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={onScroll}
        className="flex max-h-[60vh] min-h-[320px] flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {state.welcome && (
          <div className="rounded-xl border border-amber-400/25 bg-amber-400/[0.07] px-4 py-3 text-sm leading-relaxed text-amber-100/90">
            {renderBody(state.welcome)}
          </div>
        )}
        {state.messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-white/45">
            No messages yet — say hello!
          </p>
        ) : (
          state.messages.map((m) => (
            <div key={m.id} className="group flex gap-3">
              <Avatar name={m.authorName} photo={m.authorPhoto} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-white">
                    {m.pinned && <span className="mr-1" aria-label="Pinned">📌</span>}
                    {m.authorName}
                  </span>
                  {m.isAdmin && (
                    <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
                      Admin
                    </span>
                  )}
                  <span className="text-[11px] text-white/35">
                    {formatTime(m.createdAt)}
                  </span>
                </div>
                {m.reply && (
                  <div className="mt-0.5 border-l-2 border-amber-400/40 bg-white/[0.03] px-2 py-1 text-xs text-white/50">
                    <span className="font-semibold text-white/70">
                      {m.reply.authorName || "message"}
                    </span>
                    {m.reply.body && (
                      <span className="ml-1 line-clamp-1 inline">
                        {m.reply.body}
                      </span>
                    )}
                  </div>
                )}
                {m.body && (
                  <p className="mt-0.5 whitespace-pre-wrap break-words text-[15px] leading-relaxed text-white/85">
                    {renderBody(m.body)}
                  </p>
                )}

                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {me && (
                    <button
                      type="button"
                      onClick={() =>
                        setReplyTo({
                          id: m.id,
                          authorName: m.authorName,
                          body: m.body,
                        })
                      }
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/50 opacity-0 transition hover:bg-white/10 hover:text-white/80 group-hover:opacity-100"
                    >
                      Reply
                    </button>
                  )}
                  {m.reactions.map((r) => (
                    <button
                      key={r.emoji}
                      type="button"
                      onClick={() => void react(m.id, r.emoji)}
                      className={`rounded-full border px-2 py-0.5 text-xs transition ${
                        r.mine
                          ? "border-amber-400/50 bg-amber-400/15 text-amber-200"
                          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                      }`}
                    >
                      {r.emoji} {r.count}
                    </button>
                  ))}
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() =>
                        setReactOpen((cur) => (cur === m.id ? null : m.id))
                      }
                      className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs text-white/50 opacity-0 transition hover:bg-white/10 hover:text-white/80 group-hover:opacity-100"
                      aria-label="Add reaction"
                    >
                      ＋
                    </button>
                    {reactOpen === m.id && (
                      <div className="absolute bottom-full left-0 z-10 mb-1 flex gap-1 rounded-full border border-white/10 bg-ink-950/95 px-2 py-1 shadow-lg backdrop-blur">
                        {REACTIONS.map((e) => (
                          <button
                            key={e}
                            type="button"
                            onClick={() => void react(m.id, e)}
                            className="text-base leading-none hover:scale-125"
                          >
                            {e}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer / sign-in */}
      <div className="border-t border-white/10 bg-ink-950/40 px-4 py-3">
        {error && <p className="mb-2 text-xs text-rose-300">{error}</p>}
        {systemNote && (
          <div className="mb-2 flex items-start justify-between gap-2 rounded-lg border border-amber-400/25 bg-amber-400/[0.07] px-3 py-2 text-xs text-amber-100/90">
            <span className="whitespace-pre-wrap">{systemNote}</span>
            <button
              type="button"
              onClick={() => setSystemNote(null)}
              className="shrink-0 text-amber-200/60 hover:text-amber-100"
              aria-label="Dismiss"
            >
              ✕
            </button>
          </div>
        )}
        {me && replyTo && (
          <div className="mb-2 flex items-center justify-between gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/60">
            <span className="min-w-0 truncate">
              Replying to{" "}
              <span className="font-semibold text-white/80">
                {replyTo.authorName || "message"}
              </span>
              {replyTo.body ? ` — ${replyTo.body}` : ""}
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(null)}
              className="shrink-0 text-white/40 hover:text-white/80"
              aria-label="Cancel reply"
            >
              ✕
            </button>
          </div>
        )}
        {me?.admin && text.trim().startsWith("/") && (
          <p className="mb-2 text-[11px] text-white/40">
            Command mode — try <span className="text-amber-200/80">/help</span> for the full list.
          </p>
        )}
        {me ? (
          <div className="flex items-end gap-2">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={`Message as ${me.name}…`}
              className="max-h-32 min-h-[42px] flex-1 resize-none rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/35 focus:border-amber-400/50 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={sending || !text.trim()}
              className="shrink-0 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-2 text-center">
            <p className="text-sm text-white/60">
              Sign in with Telegram to join the conversation.
            </p>
            <div ref={widgetHostRef} />
            {!state.botUsername && (
              <p className="text-xs text-white/40">
                Sign-in is being set up — check back shortly.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
