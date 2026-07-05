"use client";

import {
  Fragment,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type UIEvent as ReactUIEvent,
} from "react";
import { createPortal } from "react-dom";
import NotificationSettings from "./NotificationSettings";
import AdminPanel from "./AdminPanel";
import MiddleHeader from "./tg/MiddleHeader";
import MessageBubble from "./tg/MessageBubble";
import Appendix from "./tg/Appendix";
import EmojiPanel from "./tg/EmojiPanel";
import TextFormatter from "./tg/TextFormatter";
import VoiceMessage from "./tg/VoiceMessage";
import PollBubble from "./tg/PollBubble";
import PollCreateModal from "./tg/PollCreateModal";
import { useVoiceRecorder } from "./tg/useVoiceRecorder";
import { usePolls } from "./usePolls";
import { EMOJI_SHORTCODES } from "./tg/emoji-shortcodes";
import {
  IconBan,
  IconBell,
  IconChat,
  IconClose,
  IconCopy,
  IconDelete,
  IconDownload,
  IconEdit,
  IconExpand,
  IconForward,
  IconLink,
  IconPin,
  IconReply,
  IconSettings,
} from "./tg/TgIcons";
import {
  CustomEmojiImg,
  LocalTime,
  dateKey,
  dateLabel,
  emojiSrc,
  isSingleCustomEmoji,
  parsePollToken,
  parseVoiceToken,
  peerIdx,
  renderBody,
  tokenPreview,
} from "./tg/format";
import {
  ADMIN_TG,
  REACTIONS,
  prepareChatImage,
  useCommunityChat,
  type ChatMessage,
  type Reaction,
} from "./useCommunityChat";
import { useExtraReactions } from "./useExtraReactions";
import { buildMiniAppLink, buildStartParam } from "./tg/deeplink";
import type { ChatTopic } from "@/lib/community";
import { COMMAND_SPECS } from "@/lib/community-commands";
import {
  CHAT_NOTICE_SEED_BODY,
  CHAT_NOTICE_SEED_TEXT,
  CHAT_NOTICE_SEED_TIME,
  SEED_AUTHOR,
  SEED_AVATAR,
} from "./tg/seed";

/**
 * The "Group Chat" forum topic, rendered as an exact Telegram Web A light
 * theme replica: real MessageList DOM (Transition-wrapped custom-scroll list,
 * sticky date pills, sender-group runs) and the real Composer DOM
 * (.composer-wrapper with the #composerAppendix tail, #editable-message-text
 * contenteditable input and the round send button). All live behaviour
 * (polling, sending, reactions, Mini App sign-in, moderation) lives in
 * useCommunityChat — this component is purely presentational.
 */

interface DateGroup {
  key: string;
  label: string;
  runs: ChatMessage[][];
}

function buildGroups(messages: ChatMessage[]): DateGroup[] {
  const todayYear = new Date().getUTCFullYear();
  const groups: DateGroup[] = [];
  for (const m of messages) {
    const key = dateKey(m.createdAt);
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: dateLabel(key, todayYear), runs: [] };
      groups.push(group);
    }
    const run = group.runs[group.runs.length - 1];
    if (run && run[run.length - 1].tgId === m.tgId) {
      run.push(m);
    } else {
      group.runs.push([m]);
    }
  }
  return groups;
}

const LIST_STYLE = {
  "--message-list-bottom-inset": "76px",
  "--message-list-bottom-fade": "68px",
} as CSSProperties;

const MAX_LEN = 2000;

// Forwarded messages carry their origin inline as a leading [fwd:NAME] token so
// no schema/DB change is needed: the origin name is parsed back out at render
// time and shown as a Telegram-style "Forwarded from" banner (see MessageBubble).
const FWD_RE = /^\[fwd:([^\]\n]{1,64})\]\n?/;
function parseForward(body: string): { name: string | null; rest: string } {
  const m = FWD_RE.exec(body);
  if (!m) return { name: null, rest: body };
  return { name: m[1].trim(), rest: body.slice(m[0].length) };
}
function buildForwardBody(origin: string, body: string): string {
  const clean = origin.replace(/[\]\n]/g, "").trim().slice(0, 64) || "a member";
  const token = `[fwd:${clean}]\n`;
  return (
    token + (body ?? "").trim().slice(0, Math.max(0, MAX_LEN - token.length))
  );
}

// Admin-only "forward to section" destinations (the postable forum topics). A
// regular member never sees the Forward action at all.
const FORWARD_TARGETS: { topic: ChatTopic; title: string }[] = [
  { topic: "chat", title: "Group Chat" },
  { topic: "announcements", title: "Announcements" },
  { topic: "buy4u", title: "BUY4U Vouches" },
  { topic: "testimonials", title: "Client Testimonials" },
];

const FS_PROMPT_KEY = "rg_fs_prompted";
const FS_PREF_KEY = "rg_fs_pref";
const NOTIF_PROMPT_KEY = "rg_notif_prompted";

export default function CommunityChat({
  onBack,
  topic = "chat",
  title = "Group Chat",
  icon,
  history,
  onVouchEdited,
  onVouchPinned,
  onSeedEdited,
  pinnedExtras,
  chatNoticeText = CHAT_NOTICE_SEED_TEXT,
  chatNoticeOverridden = false,
}: {
  onBack?: () => void;
  /** Which forum topic this feed reads/writes; defaults to the group chat. */
  topic?: ChatTopic;
  title?: string;
  /** Header icon override (topic emoji); defaults to the # forum icon. */
  icon?: ReactNode;
  /**
   * Read-only migrated history rendered above the live messages. A function
   * receives the active in-chat search query so it can filter itself, plus a
   * `pinnedOnly` flag so it renders only pinned bubbles when the pinned-messages
   * panel is open (Web A parity).
   */
  history?:
    | ReactNode
    | ((
        query: string,
        onReadonlyMenu: (
          pos: { x: number; y: number },
          payload: {
            id: string;
            text: string;
            pinned: boolean;
            canModify?: boolean;
            canPin?: boolean;
          },
        ) => void,
        onOpenMedia: (src: string) => void,
        pinnedOnly: boolean,
        reactionsFor: (id: string, baseline?: Reaction[]) => Reaction[],
        onReact: (id: string, emoji: string) => void,
      ) => ReactNode);
  /**
   * Called after an admin edits a read-only history post so the parent can
   * patch its cached vouch body in place (no refetch → no flicker).
   */
  onVouchEdited?: (id: string, body: string) => void;
  /**
   * Called after an admin pins/unpins a read-only history post so the parent
   * can patch its cached pin state in place (no refetch → no flicker).
   */
  onVouchPinned?: (id: string, pinned: boolean) => void;
  /**
   * Called after an admin edits a constant "seed" bubble (READ ME, the welcome
   * card, the announcement seed) so the parent can patch its client-held
   * override — seed bodies are server props with nothing to refetch here.
   */
  onSeedEdited?: (id: string, body: string) => void;
  /**
   * Pinned read-only history posts (id prefixed `v<id>` to match their bubble
   * `data-mid`, plus body for the banner preview), merged into the pinned
   * banner + pinned-only panel so migrated pins behave like live pins.
   */
  pinnedExtras?: { id: string; body: string }[];
  /**
   * Effective chat-notice seed body + whether it's an admin override, so the
   * "messages will be cleared" seed bubble is editable like the other seeds
   * (READ ME / welcome / announcement). Defaults keep the built-in text.
   */
  chatNoticeText?: string;
  chatNoticeOverridden?: boolean;
}) {
  const chat = useCommunityChat(topic);
  const isGroupChat = topic === "chat";
  // READ ME is a locked, admin-authored topic: admins get a normal composer,
  // everyone else sees the "Topic locked" footer instead of the input.
  const lockedForMembers = topic === "readme";
  const [menuOpen, setMenuOpen] = useState(false);
  // In-chat search: null = closed, string = open with that query.
  const [search, setSearch] = useState<string | null>(null);
  // Pinned-messages panel: when true the list shows ONLY pinned messages.
  const [pinnedOnly, setPinnedOnly] = useState(false);
  // Which pinned message the top banner previews (null = latest); tapping the
  // banner cycles to older pins, Web A style.
  const [pinnedIdx, setPinnedIdx] = useState<number | null>(null);
  const [showNotif, setShowNotif] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [fsPrompt, setFsPrompt] = useState(false);
  const [fsRemember, setFsRemember] = useState(false);
  // Admin edit modal for a read-only history post (vouch / announcement /
  // testimonial): holds the target id + working text; null = closed.
  // `orig` keeps the pre-edit body so the ComposerEmbeddedMessage preview
  // shows the ORIGINAL message while typing (Web A parity), not the live text.
  const [editPost, setEditPost] = useState<{
    id: string;
    body: string;
    orig: string;
  } | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  // Web A message context menu (right-click / long-press on a bubble). The
  // "readonly" variant is used for migrated history bubbles (vouches), which
  // have no live message id and so get a reduced Copy Text / Forward menu.
  const [ctxMenu, setCtxMenu] = useState<
    | { kind: "chat"; m: ChatMessage; x: number; y: number }
    | {
        kind: "readonly";
        id: string;
        text: string;
        pinned: boolean;
        // canModify → show Edit (seed bubbles ARE editable now — the edit
        // persists to mod_config / content_blocks). canPin → show Pin; seed
        // bubbles set this false because the pin route is numeric-vouch-only.
        canModify: boolean;
        canPin: boolean;
        x: number;
        y: number;
      }
    | null
  >(null);
  // The message-menu reaction row starts collapsed; the first tap on the
  // show-more chevron expands it into a wrapped grid in place, a second tap
  // opens the full emoji picker. Reset whenever the menu opens/closes.
  const [reactionsExpanded, setReactionsExpanded] = useState(false);
  useEffect(() => {
    setReactionsExpanded(false);
  }, [ctxMenu]);
  // Admin forward flow: when set, a destination-section picker is shown. The
  // payload is a live message or a read-only history post (text + its origin).
  const [forwardTarget, setForwardTarget] = useState<
    | { kind: "msg"; m: ChatMessage }
    | { kind: "text"; origin: string; text: string }
    | { kind: "multi"; ms: ChatMessage[] }
    | null
  >(null);
  // Measured + clamped position of the open context menu. It renders hidden for
  // one frame so its real size can be measured, then is clamped into the
  // viewport minus the Mini App safe-area insets (exposed as CSS variables).
  const ctxMenuRef = useRef<HTMLDivElement>(null);
  const [ctxPos, setCtxPos] = useState<{ left: number; top: number } | null>(
    null,
  );
  useLayoutEffect(() => {
    if (!ctxMenu) {
      setCtxPos(null);
      return;
    }
    const el = ctxMenuRef.current;
    if (!el) return;
    const { width, height } = el.getBoundingClientRect();
    const cs = getComputedStyle(document.documentElement);
    const px = (name: string) => parseFloat(cs.getPropertyValue(name)) || 0;
    const insetBottom =
      px("--tg-safe-area-inset-bottom") +
      px("--tg-content-safe-area-inset-bottom");
    const insetTop =
      px("--tg-safe-area-inset-top") + px("--tg-content-safe-area-inset-top");
    const margin = 8;
    setCtxPos({
      left: Math.max(
        margin,
        Math.min(ctxMenu.x, window.innerWidth - width - margin),
      ),
      top: Math.max(
        margin + insetTop,
        Math.min(ctxMenu.y, window.innerHeight - height - margin - insetBottom),
      ),
    });
  }, [ctxMenu]);
  // #MiddleColumn carries Telegram's slide-transition `transform`, which makes
  // it the containing block for every position:fixed descendant. On desktop
  // that pane is translated ~33.5rem to the right, so a "centered" toast lands
  // off to the side and the pointer-positioned context menu opens off-screen
  // (its Pin/Reply items then unreachable → pin/right-click "do nothing").
  // Portal these overlays to a node under .tg-html — it inherits the theme CSS
  // vars but sits OUTSIDE the transformed column, so `position: fixed` resolves
  // against the real viewport again.
  const [overlayEl, setOverlayEl] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const host =
      document.querySelector<HTMLElement>(".tg-html") ?? document.body;
    const el = document.createElement("div");
    el.className = "tg-overlay-root";
    host.appendChild(el);
    setOverlayEl(el);
    return () => {
      el.remove();
    };
  }, []);
  const [emojiOpen, setEmojiOpen] = useState(false);
  // Message id whose reaction picker (full emoji set) is open, opened from the
  // context-menu reaction row's "show more" chevron. null = closed.
  // The message being reacted to via the "more reactions" picker, plus the
  // pointer position so the picker floats as a popover near the bubble (portaled
  // outside the shifted #MiddleColumn) rather than being pinned to the composer.
  const [reactTarget, setReactTarget] = useState<
    { id: string; x: number; y: number } | null
  >(null);
  // Fullscreen photo viewer (click a message photo to expand it).
  const [lightbox, setLightbox] = useState<string | null>(null);
  // Center-screen transient toast shown after every message action; the nonce
  // is used as the element key so the fade animation restarts on each action
  // (even when the same text is shown twice in a row).
  const [toast, setToast] = useState<{ msg: string; n: number } | null>(null);
  const toastNonce = useRef(0);
  const toastTimerRef = useRef<number | null>(null);
  const showToast = (msg: string) => {
    toastNonce.current += 1;
    setToast({ msg, n: toastNonce.current });
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 2500);
  };
  useEffect(
    () => () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    },
    [],
  );
  const inputRef = useRef<HTMLDivElement>(null);
  // contentEditable inside the readonly-post edit dialog (Web A edit
  // composer); its own TextFormatter binds to this ref.
  const editInputRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Keep the message list clear of the composer: the footer is overlaid at the
  // bottom, so the list needs bottom padding equal to its live height (which
  // grows with the reply bar, attachment preview or admin TTL row).
  const footerRef = useRef<HTMLDivElement>(null);
  const [composerPad, setComposerPad] = useState(76);
  useEffect(() => {
    const el = footerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => {
      setComposerPad(Math.max(76, el.offsetHeight + 12));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Absolute URL for a stored chat photo (same-origin API route).
  const mediaUrl = (mediaId: string) =>
    `/api/community/chat-media/${mediaId}`;

  // Context-menu media helpers. Copy/Download/Forward all operate on the
  // clicked message's photo (Forward opens Telegram's share sheet so the
  // member can save it to Saved Messages, matching the real client).
  const copyImage = async (mediaId: string) => {
    try {
      const res = await fetch(mediaUrl(mediaId));
      const blob = await res.blob();
      // Normalise to PNG (the only universally clipboard-writable image type).
      const bmp = await createImageBitmap(blob);
      const canvas = document.createElement("canvas");
      canvas.width = bmp.width;
      canvas.height = bmp.height;
      canvas.getContext("2d")?.drawImage(bmp, 0, 0);
      const png = await new Promise<Blob | null>((r) =>
        canvas.toBlob(r, "image/png"),
      );
      if (png)
        await navigator.clipboard.write([
          new ClipboardItem({ "image/png": png }),
        ]);
    } catch {
      /* clipboard/image API unavailable — ignore */
    }
  };
  const downloadImage = (mediaId: string) => {
    const a = document.createElement("a");
    a.href = mediaUrl(mediaId);
    a.download = `photo-${mediaId}.jpg`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  // Copy Message Link targets the Telegram Mini App (this replica is only ever
  // opened inside Telegram, never on the web): a `t.me/<bot>?startapp=…` deep
  // link re-opens the app on this topic and scrolls to the message. The
  // website-hash fallback only fires when the bot username is unknown (i.e.
  // outside a Mini App), so nothing breaks in a plain browser.
  const copyMessageLink = (m: ChatMessage) => {
    const bot = state?.botUsername;
    const link = bot
      ? buildMiniAppLink(bot, buildStartParam(topic, m.id))
      : `${window.location.href.split("#")[0]}#msg-${m.id}`;
    void navigator.clipboard?.writeText(link).catch(() => undefined);
  };
  // Forward = REPOST into a chosen section (Telegram "forward to this chat"),
  // ADMIN ONLY. The picker chooses the destination topic; we post a fresh
  // message there carrying a [fwd:origin] token so it renders with a
  // "Forwarded from …" banner. A photo is re-uploaded so the image forwards
  // too, and the completion toast reports the destination + success/failure.
  const postForward = (
    body: string,
    dest: { topic: ChatTopic; title: string },
    photo?: { blob: Blob; name: string },
  ) => {
    const finish = (data: { ok?: boolean; error?: string } | null) =>
      showToast(
        data?.ok
          ? `Forwarded to ${dest.title}`
          : data?.error || "Couldn't forward",
      );
    if (photo) {
      const form = new FormData();
      form.append("photo", photo.blob, photo.name);
      form.append("text", body);
      form.append("topic", dest.topic);
      void fetch("/api/community/chat", { method: "POST", body: form })
        .then((r) => r.json().catch(() => null))
        .then(finish)
        .catch(() => finish(null));
      return;
    }
    void fetch("/api/community/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: body, topic: dest.topic }),
    })
      .then((r) => r.json().catch(() => null))
      .then(finish)
      .catch(() => finish(null));
  };
  // Run the forward once the admin has picked a destination section. A
  // re-forward preserves the ORIGINAL author (keeps any existing [fwd:] token)
  // and re-uploads any attached photo.
  const forwardOne = (m: ChatMessage, dest: { topic: ChatTopic; title: string }) => {
    const src = parseForward(m.body ?? "");
    const origin = src.name || m.authorName || "a member";
    // Voice/poll tokens are server-composed only — the chat POST strips them,
    // so forwarding one raw would land as an empty banner. Forward the text
    // preview ("🎤 Voice message" / "📊 Poll") instead.
    const rest = isTokenBody(src.rest) ? tokenPreview(src.rest) : src.rest;
    const body = buildForwardBody(origin, rest);
    if (m.mediaId) {
      const id = m.mediaId;
      void (async () => {
        try {
          const res = await fetch(mediaUrl(id));
          const blob = await res.blob();
          postForward(body, dest, { blob, name: `photo-${id}.jpg` });
        } catch {
          postForward(body || buildForwardBody(origin, "📷 Photo"), dest);
        }
      })();
      return;
    }
    postForward(body, dest);
  };
  const runForward = (
    target: NonNullable<typeof forwardTarget>,
    dest: { topic: ChatTopic; title: string },
  ) => {
    setForwardTarget(null);
    if (target.kind === "text") {
      postForward(buildForwardBody(target.origin, target.text), dest);
      return;
    }
    if (target.kind === "multi") {
      // Sequential: each selected message forwards as its own post (Telegram
      // parity), spaced past the server flood gate (default 2s) so a batch
      // isn't rejected mid-run; postForward toasts per message.
      const ms = [...target.ms];
      void (async () => {
        for (let i = 0; i < ms.length; i++) {
          if (i > 0) await new Promise((r) => setTimeout(r, 2600));
          forwardOne(ms[i], dest);
        }
      })();
      return;
    }
    forwardOne(target.m, dest);
  };
  // Open the reduced context menu for a read-only history bubble.
  const openReadonlyMenu = (
    pos: { x: number; y: number },
    payload: {
      id: string;
      text: string;
      pinned: boolean;
      canModify?: boolean;
      canPin?: boolean;
    },
  ) =>
    setCtxMenu({
      kind: "readonly",
      id: payload.id,
      text: payload.text,
      pinned: payload.pinned,
      canModify: payload.canModify ?? true,
      canPin: payload.canPin ?? true,
      x: pos.x,
      y: pos.y,
    });
  // Persist an admin edit of a read-only history post, then patch the parent's
  // cached body (no refetch → no flicker) and toast the result.
  const saveEditPost = () => {
    if (!editPost) return;
    const id = editPost.id;
    const body = editPost.body.trim();
    if (!body) {
      showToast("Post is empty");
      return;
    }
    setEditSaving(true);
    void fetch("/api/community/vouch/edit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, body }),
    })
      .then((r) => r.json().catch(() => null))
      .then((data: { ok?: boolean; body?: string; error?: string } | null) => {
        if (data?.ok) {
          const nextBody = data.body ?? body;
          // Seed bubbles have no vouch row → patch the parent's seed override
          // instead of its cached vouch body.
          if (id.startsWith("seed:")) onSeedEdited?.(id, nextBody);
          else onVouchEdited?.(id, nextBody);
          setEditPost(null);
          showToast("Post updated");
        } else {
          showToast(data?.error || "Couldn't update");
        }
      })
      .catch(() => showToast("Couldn't update"))
      .finally(() => setEditSaving(false));
  };
  // Pin/unpin a read-only history post, then patch the parent's cached pin
  // state (no refetch → no flicker) so the 📌 badge + banner update instantly.
  const pinReadonlyPost = (id: string, pinned: boolean) => {
    void fetch("/api/community/vouch/pin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, pinned }),
    })
      .then((r) => r.json().catch(() => null))
      .then(
        (data: { ok?: boolean; pinned?: boolean; error?: string } | null) => {
          if (data?.ok) {
            onVouchPinned?.(id, data.pinned ?? pinned);
            showToast(pinned ? "Post pinned" : "Post unpinned");
          } else {
            showToast(data?.error || "Couldn't update pin");
          }
        },
      )
      .catch(() => showToast("Couldn't update pin"));
  };
  // Jump to a quoted message when its reply preview is tapped, briefly
  // highlighting the target the way the real client does.
  const scrollToMessage = (id: string) => {
    const root = chat.scrollRef.current;
    if (!root) return;
    const el = root.querySelector<HTMLElement>(
      `[data-mid="${CSS.escape(id)}"]`,
    );
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.remove("tg-flash");
    void el.offsetWidth;
    el.classList.add("tg-flash");
    window.setTimeout(() => el.classList.remove("tg-flash"), 1200);
  };

  // Append an emoji character / custom-emoji token to the composer text and
  // keep the contenteditable + caret in sync.
  const insertAtComposer = (snippet: string) => {
    const next = (chat.text + snippet).slice(0, MAX_LEN);
    chat.setText(next);
    const el = inputRef.current;
    if (el) {
      el.innerText = next;
      el.focus();
      const sel = window.getSelection();
      sel?.selectAllChildren(el);
      sel?.collapseToEnd();
    }
  };

  // Replace the composer text with a chosen slash command (+ trailing space)
  // and drop the caret at the end so the admin can type its argument.
  const applyCommand = (cmd: string) => {
    const next = `/${cmd} `;
    chat.setText(next);
    const el = inputRef.current;
    if (el) {
      el.innerText = next;
      el.focus();
      const sel = window.getSelection();
      sel?.selectAllChildren(el);
      sel?.collapseToEnd();
    }
  };

  // Turn a picked/pasted image into the pending attachment (downscaled
  // client-side so the server's 3 MB cap is practically never hit).
  const attachImage = async (file: Blob) => {
    const prepared = await prepareChatImage(file);
    if (prepared) {
      chat.setAttachment(prepared);
      chat.setError(null);
    } else {
      chat.setError("That file doesn't look like an image");
    }
  };

  // Offer fullscreen as an entry prompt instead of a buried menu item. A
  // remembered choice (localStorage) is honoured across sessions: "fs" enters
  // fullscreen automatically (requestFullscreen needs no user gesture), "skip"
  // stays windowed. With no stored choice it is asked once per session
  // (sessionStorage).
  useEffect(() => {
    if (!chat.canFullscreen || chat.isFullscreen) return;
    try {
      const pref = localStorage.getItem(FS_PREF_KEY);
      if (pref) {
        if (pref === "fs") chat.toggleFullscreen();
        return;
      }
      if (sessionStorage.getItem(FS_PROMPT_KEY)) return;
    } catch {
      /* storage unavailable — still prompt */
    }
    setFsPrompt(true);
    // chat.toggleFullscreen is stable; excluded to avoid re-prompting churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.canFullscreen, chat.isFullscreen]);

  // Chain a notifications prompt once per user (persisted), gated on being
  // signed in. Opens the NotificationSettings sheet.
  const maybePromptNotif = () => {
    if (!chat.me) return;
    try {
      if (localStorage.getItem(NOTIF_PROMPT_KEY)) return;
      localStorage.setItem(NOTIF_PROMPT_KEY, "1");
    } catch {
      /* storage unavailable — prompt once anyway */
    }
    setShowNotif(true);
  };

  // Surface the notif prompt once the signed-in user is known and fullscreen
  // is settled — i.e. FS isn't offered, is already active, or a choice was
  // already persisted so no FS prompt will appear. Never fires while the FS
  // modal is open (resolveFsPrompt chains the notif prompt in that case).
  // maybePromptNotif is idempotent (NOTIF_PROMPT_KEY), so this can't double-up.
  useEffect(() => {
    if (!chat.me || fsPrompt) return;
    let fsSettled = !chat.canFullscreen || chat.isFullscreen;
    try {
      if (!fsSettled && localStorage.getItem(FS_PREF_KEY)) fsSettled = true;
    } catch {
      /* storage unavailable — treat as unsettled, prompt via FS path */
    }
    if (!fsSettled) return;
    maybePromptNotif();
    // maybePromptNotif is a stable inline helper; excluded to avoid churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chat.canFullscreen, chat.isFullscreen, chat.me, fsPrompt]);

  const resolveFsPrompt = (choice: "skip" | "fs") => {
    setFsPrompt(false);
    try {
      if (fsRemember) localStorage.setItem(FS_PREF_KEY, choice);
      else sessionStorage.setItem(FS_PROMPT_KEY, "1");
    } catch {
      /* ignore */
    }
    if (choice === "fs") chat.toggleFullscreen();
    maybePromptNotif();
  };

  const { state, me } = chat;

  // Reactions on readonly bubbles (imported vouches + seed posts) live in
  // their own TEXT key space ("v<id>" / "seed:<key>"); live chat messages
  // keep the useCommunityChat flow. reactAny routes by key shape.
  const extraReactions = useExtraReactions(!!me, () =>
    showToast("Sign in with Telegram to react"),
  );
  const reactAny = (targetId: string, emoji: string) => {
    if (/^\d+$/.test(targetId)) void chat.react(targetId, emoji);
    else void extraReactions.toggle(targetId, emoji);
  };

  // ——— Voice notes, polls, multi-select, scroll FAB, unread + autocomplete.
  const recorder = useVoiceRecorder();
  const polls = usePolls(!!me, () =>
    showToast("Sign in with Telegram to vote"),
  );
  const [attachOpen, setAttachOpen] = useState(false);
  const [pollModal, setPollModal] = useState(false);
  const [pollBusy, setPollBusy] = useState(false);
  const [pollError, setPollError] = useState<string | null>(null);
  // Multi-select mode: Copy N messages for everyone, Forward N for admins.
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // Scroll-to-latest FAB with an unread badge + the one-shot unread divider.
  const [showFab, setShowFab] = useState(false);
  const [unread, setUnread] = useState(0);
  const prevMsgCountRef = useRef(0);
  const [unreadDividerId, setUnreadDividerId] = useState<string | null>(null);
  const dividerDoneRef = useRef(false);

  // Surface mic failures through the composer's normal error alert.
  useEffect(() => {
    if (recorder.error) chat.setError(recorder.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recorder.error]);

  // Freeze the "Unread Messages" divider position ONCE per mount from the
  // last-seen live id stored on the previous visit — Web A keeps the divider
  // where it was even as newer messages keep arriving.
  useEffect(() => {
    if (dividerDoneRef.current) return;
    const msgs = state?.messages;
    if (!msgs || msgs.length === 0) return;
    dividerDoneRef.current = true;
    try {
      const seen = Number(localStorage.getItem(`rg_seen_${topic}`) ?? "");
      if (!Number.isFinite(seen) || seen <= 0) return;
      const firstUnread = msgs.find(
        (m) => /^\d+$/.test(m.id) && Number(m.id) > seen,
      );
      if (firstUnread) setUnreadDividerId(firstUnread.id);
    } catch {
      /* storage unavailable */
    }
  }, [state?.messages, topic]);

  // Count arrivals while scrolled up (FAB badge) and persist the newest seen
  // live id whenever the viewer is at the bottom.
  useEffect(() => {
    const msgs = state?.messages ?? [];
    const prev = prevMsgCountRef.current;
    prevMsgCountRef.current = msgs.length;
    if (msgs.length === 0) return;
    if (chat.atBottomRef.current) {
      setUnread(0);
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (/^\d+$/.test(msgs[i].id)) {
          try {
            localStorage.setItem(`rg_seen_${topic}`, msgs[i].id);
          } catch {
            /* storage unavailable */
          }
          break;
        }
      }
    } else if (prev > 0 && msgs.length > prev) {
      setUnread((u) => u + (msgs.length - prev));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state?.messages, topic]);

  const jumpToLatest = () => {
    const el = chat.scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    chat.atBottomRef.current = true;
    setUnread(0);
    setShowFab(false);
  };

  // Wraps the hook's scroll handler to also drive the FAB show/hide state.
  const handleScroll = (e: ReactUIEvent<HTMLDivElement>) => {
    chat.onScroll();
    const el = e.currentTarget;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    setShowFab(!nearBottom);
    if (nearBottom) setUnread(0);
  };

  const exitSelect = () => {
    setSelecting(false);
    setSelectedIds(new Set());
  };
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const copySelected = () => {
    const parts = (state?.messages ?? [])
      .filter((m) => selectedIds.has(m.id))
      .map((m) => {
        const rest = parseForward(m.body ?? "").rest;
        const text = tokenPreview(rest).trim() || "📷 Photo";
        return `${m.authorName}:\n${text}`;
      });
    if (parts.length === 0) return;
    void navigator.clipboard
      ?.writeText(parts.join("\n\n"))
      .then(() =>
        showToast(
          `${parts.length} message${parts.length === 1 ? "" : "s"} copied`,
        ),
      )
      .catch(() => showToast("Couldn't copy"));
    exitSelect();
  };
  const forwardSelected = () => {
    const ms = (state?.messages ?? []).filter((m) => selectedIds.has(m.id));
    if (ms.length === 0) return;
    setForwardTarget({ kind: "multi", ms });
    exitSelect();
  };

  // Voice/poll message bodies are structured tokens — editing them raw would
  // corrupt the token, so the Edit action is hidden for them.
  const isTokenBody = (b: string) => {
    const rest = parseForward(b).rest;
    return Boolean(parseVoiceToken(rest) || parsePollToken(rest));
  };

  const startVoice = () => {
    void recorder.start();
  };
  const stopAndSendVoice = () => {
    void recorder.stop().then((rec) => {
      if (rec) void chat.sendVoice(rec.blob, rec.durationSec, rec.waveform);
    });
  };

  const createPoll = (
    question: string,
    options: string[],
    multiple: boolean,
  ) => {
    setPollBusy(true);
    setPollError(null);
    void fetch("/api/community/chat/poll", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ topic, question, options, multiple }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as {
          ok?: boolean;
          error?: string;
        } | null;
        if (res.ok && data?.ok) {
          setPollModal(false);
          showToast("Poll created");
        } else {
          setPollError(data?.error ?? "Couldn't create the poll — try again");
        }
      })
      .catch(() => setPollError("Couldn't create the poll — try again"))
      .finally(() => setPollBusy(false));
  };

  // @mention / :emoji autocomplete over the RAW composer text (matching the
  // slash-command popup: never trim, the trailing token must end the text).
  const acMatch = useMemo(() => {
    if (!me || chat.editing) return null;
    const t = chat.text;
    const at = /(?:^|\s)@([\w ]{1,24})$/.exec(t);
    if (at && !at[1].endsWith(" ")) {
      return {
        kind: "mention" as const,
        partial: at[1].toLowerCase(),
        start: t.length - at[1].length - 1,
      };
    }
    const em = /(?:^|\s):([\w+-]{2,24})$/.exec(t);
    if (em) {
      return {
        kind: "emoji" as const,
        partial: em[1].toLowerCase(),
        start: t.length - em[1].length - 1,
      };
    }
    return null;
  }, [me, chat.editing, chat.text]);

  const mentionNames = useMemo(() => {
    const names = new Set<string>();
    for (const m of state?.messages ?? []) {
      if (m.authorName && m.authorName !== me?.name) names.add(m.authorName);
    }
    return Array.from(names);
  }, [state?.messages, me?.name]);

  const acItems = useMemo(() => {
    if (!acMatch) return [];
    if (acMatch.kind === "mention") {
      const p = acMatch.partial;
      return mentionNames
        .filter((n) => {
          const low = n.toLowerCase();
          return low.startsWith(p) || low.replace(/\s+/g, "").startsWith(p);
        })
        .slice(0, 6)
        .map((n) => ({
          key: `@${n}`,
          label: n,
          snippet: `@${n} `,
          emoji: null as string | null,
        }));
    }
    return EMOJI_SHORTCODES.filter((s) => s.name.startsWith(acMatch.partial))
      .slice(0, 8)
      .map((s) => ({
        key: `:${s.name}`,
        label: `:${s.name}:`,
        snippet: s.emoji,
        emoji: s.emoji as string | null,
      }));
  }, [acMatch, mentionNames]);

  // Replace the trailing @partial / :partial with the chosen snippet and put
  // the caret at the end (same contenteditable sync as insertAtComposer).
  const applyAutocomplete = (snippet: string) => {
    if (!acMatch) return;
    const next = (chat.text.slice(0, acMatch.start) + snippet).slice(
      0,
      MAX_LEN,
    );
    chat.setText(next);
    const el = inputRef.current;
    if (el) {
      el.innerText = next;
      el.focus();
      const sel = window.getSelection();
      sel?.selectAllChildren(el);
      sel?.collapseToEnd();
    }
  };

  // Web A collapses the quick-reaction row again every time a context menu
  // closes; without this the next menu would open pre-expanded.
  useEffect(() => {
    if (!ctxMenu) setReactionsExpanded(false);
  }, [ctxMenu]);

  // Web A quick-reaction row (+ show-more expand → full picker) shared by the
  // chat AND readonly context menus, so seed/vouch bubbles react exactly like
  // live messages. targetKey is the namespaced reaction id.
  const reactionRow = (targetKey: string, x: number, y: number) => (
    <div className="ReactionSelector__items-wrapper tg-ctx-reactions">
      <div className="ReactionSelector__bubble-big" aria-hidden />
      <div className="ReactionSelector__items">
        <div
          className={
            "ReactionSelector__reactions" +
            (reactionsExpanded ? " tg-ctx-reactions-expanded" : "")
          }
        >
          {REACTIONS.map((e) => (
            <button
              key={e}
              type="button"
              className="tg-ctx-reaction ReactionSelector__reaction"
              onClick={() => {
                reactAny(targetKey, e);
                setCtxMenu(null);
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={emojiSrc(e)}
                alt={e}
                className="emoji"
                draggable={false}
              />
            </button>
          ))}
          <button
            type="button"
            className="Button ReactionSelector__show-more default translucent"
            aria-label="Show more reactions"
            onClick={() => {
              if (!reactionsExpanded) {
                setReactionsExpanded(true);
                return;
              }
              setReactTarget({ id: targetKey, x, y });
              setCtxMenu(null);
            }}
          >
            <i className="icon icon-down" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );

  const query = (search ?? "").trim().toLowerCase();
  const groups = useMemo(() => {
    const all = state?.messages ?? [];
    const shown = pinnedOnly
      ? all.filter((m) => m.pinned)
      : query
        ? all.filter(
            (m) =>
              m.body.toLowerCase().includes(query) ||
              m.authorName.toLowerCase().includes(query),
          )
        : all;
    return buildGroups(shown);
  }, [state?.messages, query, pinnedOnly]);

  // All pinned messages surfaced in the banner under the header and in the
  // pinned-only panel (Web A parity). Migrated history pins (pinnedExtras, id
  // prefixed `v<id>` to match their bubble data-mid) come first in DOM/visual
  // order, then live chat pins chronologically, so the default banner index
  // (last = newest) still previews the newest live pin.
  const pinnedItems = useMemo(
    () => [
      ...(pinnedExtras ?? []),
      ...(state?.messages ?? [])
        .filter((m) => m.pinned)
        .map((m) => ({ id: m.id, body: m.body ?? "" })),
    ],
    [state?.messages, pinnedExtras],
  );
  const pinnedCount = pinnedItems.length;
  const pinnedBannerIdx =
    pinnedCount === 0
      ? 0
      : pinnedIdx == null
        ? pinnedCount - 1
        : ((pinnedIdx % pinnedCount) + pinnedCount) % pinnedCount;
  const pinnedBannerMsg = pinnedCount ? pinnedItems[pinnedBannerIdx] : null;

  // Deep link: `#msg-<id>` (from Copy Message Link / Forward) scrolls to that
  // message once the chat has loaded. Runs a single time per mount.
  const hashScrolledRef = useRef(false);
  useEffect(() => {
    if (hashScrolledRef.current) return;
    if (!state?.messages?.length) return;
    const m = /^#msg-(.+)$/.exec(window.location.hash);
    hashScrolledRef.current = true;
    if (!m) return;
    const id = m[1];
    const t = window.setTimeout(() => {
      document
        .querySelector(`[data-mid="${CSS.escape(id)}"]`)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [state?.messages?.length]);

  // Keep the contenteditable input in sync with chat.text when it changes
  // programmatically (e.g. cleared after send) without clobbering the caret
  // while the user is typing.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const current = el.innerText.replace(/\n$/, "");
    if (chat.text === "" && current !== "") {
      el.innerText = "";
    } else if (current !== chat.text && document.activeElement !== el) {
      el.innerText = chat.text;
    }
  }, [chat.text]);

  // Entering composer edit mode: seed the input with the message body and drop
  // the caret at the end. We set innerText explicitly (not relying on the
  // chat.text sync effect, which skips seeding while the composer is focused —
  // Safari/Firefox don't move focus to the ctx-menu button on click) so the
  // body always appears even if the user was mid-draft.
  const editingId = chat.editing?.id ?? null;
  const editingBody = chat.editing?.body ?? "";
  useEffect(() => {
    if (!editingId) return;
    const el = inputRef.current;
    if (!el) return;
    el.innerText = editingBody;
    el.focus();
    const sel = window.getSelection();
    sel?.selectAllChildren(el);
    sel?.collapseToEnd();
  }, [editingId, editingBody]);

  // Live "X is typing…" presence takes over the subtitle line (Web A shows
  // typing state in the chat header's status slot).
  const typingNames = chat.typing ?? [];
  const subtitle =
    typingNames.length > 0
      ? `${typingNames.join(", ")} ${typingNames.length === 1 ? "is" : "are"} typing…`
      : state === null
        ? "connecting…"
        : state.memberCount !== null && state.memberCount > 0
          ? `${state.memberCount} member${state.memberCount === 1 ? "" : "s"}`
          : state.memberCount === 0
            ? "public group"
            : "members hidden";

  return (
    <>
      {pinnedOnly ? (
        <MiddleHeader
          title={
            pinnedCount === 1
              ? "1 Pinned Message"
              : `${pinnedCount} Pinned Messages`
          }
          subtitle={undefined}
          onBack={() => setPinnedOnly(false)}
        >
          <span aria-hidden />
        </MiddleHeader>
      ) : search !== null ? (
        <>
          <div className="MiddleHeaderPanes M5bA2n6Z opacity-transition fast shown open" />
          <div className="MiddleHeader tg-chat-search-header">
            <div className="back-button">
              <button
                type="button"
                className="Button smaller translucent round"
                aria-label="Close search"
                title="Close search"
                onClick={() => setSearch(null)}
              >
                <i className="icon icon-arrow-left" aria-hidden />
              </button>
            </div>
            <div className="SearchInput tg-list-search" dir="ltr">
              <input
                type="text"
                dir="auto"
                placeholder="Search messages"
                className="form-control"
                value={search}
                autoFocus
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </>
      ) : (
        <MiddleHeader
          title={title}
          subtitle={subtitle}
          icon={
            icon ?? (
              <i
                className="icon icon-hashtag I0-98vJl P6JY5GgC general-forum-icon"
                aria-hidden
              />
            )
          }
          onBack={onBack}
        >
          <button
            type="button"
            className="Button smaller translucent round"
            aria-label="Search this chat"
            title="Search this chat"
            onClick={() => setSearch("")}
          >
            <i className="icon icon-search" aria-hidden />
          </button>
          <button
            type="button"
            className="Button smaller translucent round"
            aria-label="More actions"
            title="More actions"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
          >
            <i className="icon icon-more" aria-hidden />
          </button>
        </MiddleHeader>
      )}

      {pinnedBannerMsg && search === null && !pinnedOnly && (
        <div
          className="HeaderPinnedMessageWrapper tg-pinned-banner"
          data-is-panel-open="true"
        >
          <button
            type="button"
            className="tg-pinned-body-btn"
            onClick={() => {
              // Reuse the reply-jump highlighter so tapping the banner briefly
              // flashes the target message (same subtle grey fade as a quote
              // jump) instead of scrolling with no visual cue.
              scrollToMessage(pinnedBannerMsg.id);
              if (pinnedCount > 1)
                setPinnedIdx(
                  ((pinnedBannerIdx - 1) % pinnedCount + pinnedCount) %
                    pinnedCount,
                );
            }}
          >
            <span className="tg-pinned-bar" aria-hidden />
            <span className="tg-pinned-body">
              <span className="tg-pinned-label">
                {pinnedCount > 1
                  ? `Pinned message #${pinnedBannerIdx + 1}`
                  : "Pinned message"}
              </span>
              <span className="tg-pinned-text">
                {tokenPreview(
                  parseForward(pinnedBannerMsg.body ?? "").rest,
                ).trim() || "Photo"}
              </span>
            </span>
          </button>
          <button
            type="button"
            className="Button smaller translucent round tg-pinned-list-btn"
            aria-label="Pinned messages"
            title="Pinned messages"
            onClick={() => setPinnedOnly(true)}
          >
            <i className="icon icon-pin-list zqsoZNdU" aria-hidden />
          </button>
        </div>
      )}

      {menuOpen && (
        <>
          <button
            type="button"
            className="tg-menu-backdrop"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          />
          <div className="tg-menu" role="menu">
            {me && (
              <button
                type="button"
                className="tg-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  setShowNotif(true);
                }}
              >
                <IconBell />
                Notifications
              </button>
            )}
            {me?.admin && (
              <button
                type="button"
                className="tg-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  setShowAdmin(true);
                }}
              >
                <IconSettings />
                Admin panel
              </button>
            )}
            {me?.admin && state && (
              <button
                type="button"
                className="tg-menu-item"
                onClick={() => {
                  setMenuOpen(false);
                  void chat.toggleHideMembers();
                }}
              >
                <IconBell />
                {state.hideMembers ? "Show member count" : "Hide member count"}
              </button>
            )}
            <a
              className="tg-menu-item"
              href={ADMIN_TG}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
            >
              <IconChat />
              Message admin
            </a>
          </div>
        </>
      )}

      {showNotif && <NotificationSettings onClose={() => setShowNotif(false)} />}
      {showAdmin && me?.admin && <AdminPanel onClose={() => setShowAdmin(false)} />}

      {/* Fullscreen entry prompt — asked once per session, or remembered. */}
      {fsPrompt && (
        <div
          className="tg-modal-backdrop tg-fs-backdrop"
          onClick={() => resolveFsPrompt("skip")}
        >
          <div
            className="tg-modal tg-fs-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Fullscreen"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="tg-fs-title">
              <IconExpand />
              <h3>Fullscreen</h3>
            </div>
            <p className="tg-fs-text">
              Open the community in fullscreen for the full experience?
            </p>
            <label className="tg-fs-remember">
              <input
                type="checkbox"
                checked={fsRemember}
                onChange={(e) => setFsRemember(e.target.checked)}
              />
              <span>Remember my choice</span>
            </label>
            <div className="tg-fs-actions">
              <button
                type="button"
                className="tg-fs-btn"
                onClick={() => resolveFsPrompt("skip")}
              >
                Not now
              </button>
              <button
                type="button"
                className="tg-fs-btn is-primary"
                onClick={() => resolveFsPrompt("fs")}
              >
                Fullscreen
              </button>
            </div>
          </div>
        </div>
      )}

      {editPost &&
        overlayEl &&
        createPortal(
          /* Web A edit flow for readonly/seed posts: instead of a generic
             dialog, a floating composer — ComposerEmbeddedMessage bar
             ("Edit Message" + original preview) docked on a contentEditable
             input, with the round check send-button to save. */
          <div
            className="tg-modal-backdrop"
            onClick={() => (editSaving ? undefined : setEditPost(null))}
          >
            <div
              className="tg-edit-composer"
              role="dialog"
              aria-modal="true"
              aria-label="Edit message"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="composer-wrapper">
                <div className="ComposerEmbeddedMessage opacity-transition fast open shown">
                  <div className="ComposerEmbeddedMessage_inner">
                    <div
                      className="embedded-left-icon"
                      role="button"
                      tabIndex={0}
                    >
                      <i className="icon icon-edit" aria-hidden />
                    </div>
                    <div className="EmbeddedMessage inside-input no-selection">
                      <div className="message-text">
                        <p className="embedded-text-wrapper">
                          {editPost.orig.trim() || "message"}
                        </p>
                        <div className="message-title">Edit Message</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="Button embedded-cancel default translucent round faded"
                      aria-label="Cancel editing"
                      title="Cancel editing"
                      onClick={() => setEditPost(null)}
                      disabled={editSaving}
                    >
                      <i className="icon icon-close" aria-hidden />
                    </button>
                  </div>
                </div>
                <div
                  ref={(el) => {
                    editInputRef.current = el;
                    // Seed the editable once per opened post (innerText, not
                    // dangerouslySetInnerHTML — the body is plain markdown-lite
                    // text) and park the caret at the end like Web A.
                    if (el && el.dataset.seededFor !== editPost.id) {
                      el.dataset.seededFor = editPost.id;
                      el.innerText = editPost.body;
                      el.focus();
                      const sel = window.getSelection();
                      sel?.selectAllChildren(el);
                      sel?.collapseToEnd();
                    }
                  }}
                  className="form-control allow-selection tg-edit-input"
                  contentEditable
                  suppressContentEditableWarning
                  role="textbox"
                  dir="auto"
                  tabIndex={0}
                  aria-label="Edit message"
                  onInput={(e) => {
                    let v = e.currentTarget.innerText.replace(/\u00A0/g, " ");
                    if (v === "\n") v = "";
                    if (v.length > MAX_LEN) {
                      v = v.slice(0, MAX_LEN);
                      e.currentTarget.innerText = v;
                      const sel = window.getSelection();
                      sel?.selectAllChildren(e.currentTarget);
                      sel?.collapseToEnd();
                    }
                    setEditPost((p) => (p ? { ...p, body: v } : p));
                  }}
                  onKeyDown={(e) => {
                    if (
                      e.key === "Enter" &&
                      !e.shiftKey &&
                      !e.nativeEvent.isComposing
                    ) {
                      e.preventDefault();
                      if (!editSaving) saveEditPost();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      if (!editSaving) setEditPost(null);
                    }
                  }}
                />
              </div>
              <button
                type="button"
                className="Button send main-button default secondary round click-allowed"
                aria-label="Save edited message"
                title="Save edited message"
                onClick={saveEditPost}
                disabled={editSaving || !editPost.body.trim()}
              >
                <i className="icon icon-check" aria-hidden />
              </button>
              <TextFormatter inputRef={editInputRef} overlayEl={overlayEl} />
            </div>
          </div>,
          overlayEl,
        )}

      {/* Web A message context menu — Reply/Copy for members, moderation for
          admins. Admin items ride the slash-command pipeline (/pin /del /ban)
          so server-side auth + audit apply exactly as if typed. */}
      {ctxMenu &&
        overlayEl &&
        createPortal(
          <>
          <button
            type="button"
            className="tg-menu-backdrop"
            onClick={() => setCtxMenu(null)}
            onContextMenu={(e) => {
              e.preventDefault();
              setCtxMenu(null);
            }}
            aria-label="Close menu"
          />
          <div
            ref={ctxMenuRef}
            className="tg-menu tg-ctx-menu"
            role="menu"
            style={{
              left: ctxPos ? ctxPos.left : ctxMenu.x,
              top: ctxPos ? ctxPos.top : ctxMenu.y,
              visibility: ctxPos ? "visible" : "hidden",
            }}
          >
            {ctxMenu.kind === "chat" ? (
              <>
                {reactionRow(ctxMenu.m.id, ctxMenu.x, ctxMenu.y)}
                <button
                  type="button"
                  className="tg-menu-item"
                  onClick={() => {
                    chat.setReplyTo({
                      id: ctxMenu.m.id,
                      authorName: ctxMenu.m.authorName,
                      body: ctxMenu.m.body,
                    });
                    showToast("Replying to message");
                    setCtxMenu(null);
                  }}
                >
                  <IconReply />
                  Reply
                </button>
                {ctxMenu.m.mediaId && (
                  <button
                    type="button"
                    className="tg-menu-item"
                    onClick={() => {
                      const id = ctxMenu.m.mediaId;
                      if (id) void copyImage(id);
                      showToast("Image copied");
                      setCtxMenu(null);
                    }}
                  >
                    <IconCopy />
                    Copy Image
                  </button>
                )}
                {ctxMenu.m.body && (
                  <button
                    type="button"
                    className="tg-menu-item"
                    onClick={() => {
                      void navigator.clipboard
                        ?.writeText(
                          tokenPreview(parseForward(ctxMenu.m.body).rest) ||
                            ctxMenu.m.body,
                        )
                        .catch(() => undefined);
                      showToast("Text copied");
                      setCtxMenu(null);
                    }}
                  >
                    <IconCopy />
                    Copy Text
                  </button>
                )}
                {(ctxMenu.m.tgId === me?.tid || me?.admin) &&
                  !isTokenBody(ctxMenu.m.body ?? "") && (
                  <button
                    type="button"
                    className="tg-menu-item"
                    onClick={() => {
                      chat.beginEdit(ctxMenu.m);
                      showToast("Editing message");
                      setCtxMenu(null);
                    }}
                  >
                    <IconEdit />
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  className="tg-menu-item"
                  onClick={() => {
                    const id = ctxMenu.m.id;
                    setCtxMenu(null);
                    setSelecting(true);
                    setSelectedIds(new Set([id]));
                  }}
                >
                  <i className="icon icon-select" aria-hidden />
                  Select
                </button>
                <button
                  type="button"
                  className="tg-menu-item"
                  onClick={() => {
                    copyMessageLink(ctxMenu.m);
                    showToast("Link copied");
                    setCtxMenu(null);
                  }}
                >
                  <IconLink />
                  Copy Message Link
                </button>
                {me?.admin && (
                  <button
                    type="button"
                    className="tg-menu-item"
                    onClick={() => {
                      const willPin = !ctxMenu.m.pinned;
                      const id = ctxMenu.m.id;
                      setCtxMenu(null);
                      void chat
                        .sendCommand(willPin ? "/pin" : "/unpin", id)
                        .then((ok) => {
                          if (ok)
                            showToast(
                              willPin ? "Message pinned" : "Message unpinned",
                            );
                        });
                    }}
                  >
                    <IconPin />
                    {ctxMenu.m.pinned ? "Unpin" : "Pin"}
                  </button>
                )}
                {me?.admin && ctxMenu.m.mediaId && (
                  <button
                    type="button"
                    className="tg-menu-item"
                    onClick={() => {
                      const id = ctxMenu.m.mediaId;
                      if (id) downloadImage(id);
                      showToast("Downloading photo");
                      setCtxMenu(null);
                    }}
                  >
                    <IconDownload />
                    Download
                  </button>
                )}
                {me?.admin && (
                  <button
                    type="button"
                    className="tg-menu-item"
                    onClick={() => {
                      const m = ctxMenu.m;
                      setCtxMenu(null);
                      setForwardTarget({ kind: "msg", m });
                    }}
                  >
                    <IconForward />
                    Forward
                  </button>
                )}
                {me?.admin && (
                  <button
                    type="button"
                    className="tg-menu-item tg-menu-item-danger"
                    onClick={() => {
                      const id = ctxMenu.m.id;
                      setCtxMenu(null);
                      void chat.deleteMessage(id).then((ok) => {
                        if (ok) showToast("Message deleted");
                      });
                    }}
                  >
                    <IconDelete />
                    Delete
                  </button>
                )}
                {me?.admin &&
                  ctxMenu.m.tgId !== me.tid &&
                  !ctxMenu.m.isAdmin && (
                    <button
                      type="button"
                      className="tg-menu-item tg-menu-item-danger"
                      onClick={() => {
                        const id = ctxMenu.m.id;
                        setCtxMenu(null);
                        void chat.sendCommand("/ban", id).then((ok) => {
                          if (ok) showToast("User banned");
                        });
                      }}
                    >
                      <IconBan />
                      Ban User
                    </button>
                  )}
              </>
            ) : (
              <>
                {reactionRow(
                  /^\d+$/.test(ctxMenu.id) ? `v${ctxMenu.id}` : ctxMenu.id,
                  ctxMenu.x,
                  ctxMenu.y,
                )}
                {me?.admin && ctxMenu.canModify && (
                  <button
                    type="button"
                    className="tg-menu-item"
                    onClick={() => {
                      setEditPost({
                        id: ctxMenu.id,
                        body: ctxMenu.text,
                        orig: ctxMenu.text,
                      });
                      setCtxMenu(null);
                    }}
                  >
                    <IconEdit />
                    Edit
                  </button>
                )}
                {me?.admin && ctxMenu.canPin && (
                  <button
                    type="button"
                    className="tg-menu-item"
                    onClick={() => {
                      const willPin = !ctxMenu.pinned;
                      const id = ctxMenu.id;
                      setCtxMenu(null);
                      pinReadonlyPost(id, willPin);
                    }}
                  >
                    <IconPin />
                    {ctxMenu.pinned ? "Unpin" : "Pin"}
                  </button>
                )}
                <button
                  type="button"
                  className="tg-menu-item"
                  onClick={() => {
                    void navigator.clipboard
                      ?.writeText(ctxMenu.text)
                      .catch(() => undefined);
                    showToast("Text copied");
                    setCtxMenu(null);
                  }}
                >
                  <IconCopy />
                  Copy Text
                </button>
                {me?.admin && (
                  <button
                    type="button"
                    className="tg-menu-item"
                    onClick={() => {
                      const text = ctxMenu.text;
                      setCtxMenu(null);
                      setForwardTarget({ kind: "text", origin: title, text });
                    }}
                  >
                    <IconForward />
                    Forward
                  </button>
                )}
              </>
            )}
          </div>
        </>,
          overlayEl,
        )}

      {reactTarget &&
        overlayEl &&
        createPortal(
          (() => {
            const rt = reactTarget;
            const W = 352;
            const H = 420;
            const m = 8;
            const vw =
              typeof window !== "undefined" ? window.innerWidth : W + 2 * m;
            const vh =
              typeof window !== "undefined" ? window.innerHeight : H + 2 * m;
            const left = Math.max(m, Math.min(rt.x, vw - W - m));
            const top = Math.max(m, Math.min(rt.y, vh - H - m));
            return (
              <div className="tg-reaction-pop" style={{ left, top }}>
                <EmojiPanel
                  onPick={(snippet) => {
                    // Only plain-unicode emoji are valid reactions; skip custom
                    // pack tokens ([ce:…]) the reaction chips can't render.
                    if (!snippet.startsWith("[ce:")) reactAny(rt.id, snippet);
                    setReactTarget(null);
                  }}
                  onClose={() => setReactTarget(null)}
                  isAdmin={!!me?.admin}
                />
              </div>
            );
          })(),
          overlayEl,
        )}

      {forwardTarget &&
        overlayEl &&
        createPortal(
          <>
          <button
            type="button"
            className="tg-menu-backdrop"
            onClick={() => setForwardTarget(null)}
            aria-label="Close forward menu"
          />
          <div
            className="tg-menu tg-forward-picker"
            role="menu"
            aria-label="Forward to section"
          >
            <div className="tg-forward-picker-title">Forward to…</div>
            {FORWARD_TARGETS.map((dest) => (
              <button
                key={dest.topic}
                type="button"
                className="tg-menu-item"
                onClick={() => runForward(forwardTarget, dest)}
              >
                <IconForward />
                {dest.title}
              </button>
            ))}
          </div>
        </>,
          overlayEl,
        )}

      <div className="Transition">
        <div className="Transition_slide Transition_slide-active">
          <div
            ref={chat.scrollRef}
            onScroll={handleScroll}
            className="Transition MessageList custom-scroll with-default-bg"
            data-has-pinned-banner={
              pinnedBannerMsg && search === null && !pinnedOnly
                ? "true"
                : undefined
            }
            style={LIST_STYLE}
          >
            <div className="Transition_slide Transition_slide-active">
              <div
                className="messages-container"
                style={{
                  // Header + pinned-pill clearance both come from CSS
                  // (.messages-container, plus the [data-has-pinned-banner]
                  // variant on the scroll container); only the dynamic composer
                  // padding is set inline here.
                  paddingBottom: composerPad,
                }}
              >
                <div className="backwards-trigger" />
                {state === null ? (
                  <div className="tg-loading">Loading chat…</div>
                ) : (
                  <>
                    {isGroupChat && state.welcome && !query && (
                      <div className="tg-service-card">
                        {renderBody(state.welcome)}
                      </div>
                    )}
                    {/* Read-only migrated history (vouch topics). */}
                    {typeof history === "function"
                      ? history(
                          query,
                          openReadonlyMenu,
                          (src) => setLightbox(src),
                          pinnedOnly,
                          extraReactions.reactionsFor,
                          reactAny,
                        )
                      : history}
                    {(isGroupChat || topic === "testimonials") &&
                      !query &&
                      !pinnedOnly && (
                      <div className="sender-group-container sKXqbu2I">
                        <MessageBubble
                          own={false}
                          first
                          last
                          showAvatarGutter
                          sender={{
                            name: SEED_AUTHOR,
                            peer: peerIdx(SEED_AUTHOR),
                            admin: true,
                          }}
                          avatar={{
                            name: SEED_AUTHOR,
                            photo: SEED_AVATAR,
                            peer: peerIdx(SEED_AUTHOR),
                          }}
                          hasAppendix
                          pinned
                          body={
                            chatNoticeOverridden
                              ? renderBody(chatNoticeText)
                              : CHAT_NOTICE_SEED_BODY
                          }
                          time={CHAT_NOTICE_SEED_TIME}
                          reactions={extraReactions.reactionsFor(
                            "seed:chat-notice",
                          )}
                          onReact={(e) => reactAny("seed:chat-notice", e)}
                          onOpenMenu={(pos) =>
                            openReadonlyMenu(pos, {
                              id: "seed:chat-notice",
                              text: chatNoticeText,
                              pinned: true,
                              // Editable like the other seeds — the edit
                              // persists to content_blocks
                              // community_seed:chat-notice. Not pinnable: the
                              // pin route is numeric-vouch-only.
                              canModify: true,
                              canPin: false,
                            })
                          }
                        />
                      </div>
                    )}
                    {groups.map((g, gi) => (
                      <div
                        key={g.key}
                        className={`message-date-group${
                          gi === 0 ? " first-message-date-group" : ""
                        }`}
                      >
                        <div className="sticky-date interactive">
                          <span dir="auto">{g.label}</span>
                        </div>
                        {g.runs.map((run) => (
                          <div
                            key={run[0].id}
                            className="sender-group-container sKXqbu2I"
                          >
                            {run.map((m, i) => {
                              const own = Boolean(me && m.tgId === me.tid);
                              const first = i === 0;
                              const last = i === run.length - 1;
                              const peer = peerIdx(m.authorName);
                              const fwd = parseForward(m.body ?? "");
                              // Structured token bodies render as rich
                              // bubbles: voice notes, polls and the jumbo
                              // single-custom-emoji "video sticker".
                              const voice = parseVoiceToken(fwd.rest);
                              const pollId = voice
                                ? null
                                : parsePollToken(fwd.rest);
                              const single =
                                voice || pollId
                                  ? null
                                  : isSingleCustomEmoji(fwd.rest);
                              const body = voice ? (
                                <VoiceMessage
                                  src={mediaUrl(voice.mediaId)}
                                  duration={voice.duration}
                                  waveform={voice.waveform}
                                  own={own}
                                />
                              ) : pollId ? (
                                <PollBubble
                                  poll={polls.pollFor(pollId)}
                                  canClose={own || !!me?.admin}
                                  onVote={(idxs) => polls.vote(pollId, idxs)}
                                  onClose={() => polls.close(pollId)}
                                />
                              ) : single ? (
                                <span className="tg-jumbo-sticker">
                                  <CustomEmojiImg
                                    id={single.id}
                                    alt={single.alt}
                                  />
                                </span>
                              ) : fwd.rest ? (
                                renderBody(fwd.rest)
                              ) : undefined;
                              return (
                                <Fragment key={m.id}>
                                  {unreadDividerId === m.id && (
                                    <div className="tg-unread-divider">
                                      <span>Unread Messages</span>
                                    </div>
                                  )}
                                  <MessageBubble
                                  mid={m.id}
                                  own={own}
                                  first={first}
                                  last={last}
                                  showAvatarGutter
                                  sender={
                                    first
                                      ? {
                                          name: m.authorName,
                                          peer,
                                          admin: m.isAdmin,
                                        }
                                      : null
                                  }
                                  avatar={
                                    last
                                      ? {
                                          name: m.authorName,
                                          photo: m.authorPhoto,
                                          peer,
                                        }
                                      : null
                                  }
                                  hasAppendix={last}
                                  pinned={m.pinned}
                                  reply={
                                    m.reply
                                      ? {
                                          ...m.reply,
                                          body: tokenPreview(m.reply.body),
                                        }
                                      : m.reply
                                  }
                                  body={body}
                                  plain={!!single}
                                  media={
                                    m.mediaId
                                      ? [
                                          `/api/community/chat-media/${m.mediaId}`,
                                        ]
                                      : undefined
                                  }
                                  time={<LocalTime iso={m.createdAt} />}
                                  edited={!!m.editedAt}
                                  ticks={own}
                                  reactions={m.reactions}
                                  onReact={(emoji) =>
                                    void chat.react(m.id, emoji)
                                  }
                                  onOpenMedia={(src) => setLightbox(src)}
                                  onOpenMenu={(pos) =>
                                    setCtxMenu({
                                      kind: "chat",
                                      m,
                                      x: pos.x,
                                      y: pos.y,
                                    })
                                  }
                                  onReplyClick={scrollToMessage}
                                  forward={fwd.name ? { name: fwd.name } : null}
                                  onDoubleTap={
                                    me
                                      ? () => reactAny(m.id, "❤️")
                                      : undefined
                                  }
                                  onSwipeReply={
                                    me && !selecting
                                      ? () =>
                                          chat.setReplyTo({
                                            id: m.id,
                                            authorName: m.authorName,
                                            body: tokenPreview(m.body ?? ""),
                                          })
                                      : undefined
                                  }
                                  selectMode={selecting}
                                  selected={selectedIds.has(m.id)}
                                  onToggleSelect={() => toggleSelect(m.id)}
                                  />
                                </Fragment>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`middle-column-footer${
          lockedForMembers && !me?.admin ? " tg-locked-footer" : ""
        }`}
        ref={footerRef}
      >
        {showFab && (
          <button
            type="button"
            className="tg-scroll-fab"
            aria-label="Go to latest messages"
            onClick={jumpToLatest}
          >
            {unread > 0 && (
              <span className="tg-scroll-fab-badge">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
            <i className="icon icon-arrow-down" aria-hidden />
          </button>
        )}
        {selecting && (
          <div className="tg-select-bar">
            <span className="tg-select-count">
              {selectedIds.size} selected
            </span>
            <div className="tg-select-actions">
              <button
                type="button"
                className="Button smaller translucent"
                onClick={copySelected}
                disabled={selectedIds.size === 0}
              >
                Copy
              </button>
              {me?.admin && (
                <button
                  type="button"
                  className="Button smaller translucent"
                  onClick={forwardSelected}
                  disabled={selectedIds.size === 0}
                >
                  Forward
                </button>
              )}
              <button
                type="button"
                className="Button smaller translucent"
                onClick={exitSelect}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {chat.error && (
          <div className="tg-composer-alert is-error">
            <span>{chat.error}</span>
            <button
              type="button"
              onClick={() => chat.setError(null)}
              aria-label="Dismiss"
            >
              <IconClose />
            </button>
          </div>
        )}
        {chat.systemNote && (
          <div className="tg-composer-alert">
            <span>{chat.systemNote}</span>
            <button
              type="button"
              onClick={() => chat.setSystemNote(null)}
              aria-label="Dismiss"
            >
              <IconClose />
            </button>
          </div>
        )}

        {state !== null && me && (!lockedForMembers || me.admin) && (
          <div className="Composer shown mounted">
            {emojiOpen && (
              <EmojiPanel
                onPick={insertAtComposer}
                onClose={() => setEmojiOpen(false)}
                isAdmin={!!me?.admin}
              />
            )}
            <TextFormatter inputRef={inputRef} overlayEl={overlayEl} />
            <div className="composer-wrapper">
              <Appendix own={false} composer />
              {chat.editing && (
                /* Web A ComposerEmbeddedMessage — the edit bar that docks on
                   top of the input (pencil icon / "Edit Message" + preview /
                   round cancel), styled entirely by the vendored stylesheet. */
                <div className="ComposerEmbeddedMessage opacity-transition fast open shown">
                  <div className="ComposerEmbeddedMessage_inner">
                    <div className="embedded-left-icon" role="button" tabIndex={0}>
                      <i className="icon icon-edit" aria-hidden />
                    </div>
                    <div className="EmbeddedMessage inside-input no-selection">
                      <div className="message-text">
                        <p className="embedded-text-wrapper">
                          {chat.editing.body || "message"}
                        </p>
                        <div className="message-title">Edit Message</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="Button embedded-cancel default translucent round faded"
                      aria-label="Cancel editing"
                      title="Cancel editing"
                      onClick={() => chat.cancelEdit()}
                    >
                      <i className="icon icon-close" aria-hidden />
                    </button>
                  </div>
                </div>
              )}
              {chat.replyTo && (
                <div className="tg-reply-bar">
                  <span className="tg-reply-embed">
                    <span className="tg-reply-sender">
                      Reply to {chat.replyTo.authorName || "message"}
                    </span>
                    <span className="tg-reply-text">
                      {tokenPreview(chat.replyTo.body ?? "") || "message"}
                    </span>
                  </span>
                  <button
                    type="button"
                    className="tg-icon-btn"
                    onClick={() => chat.setReplyTo(null)}
                    aria-label="Cancel reply"
                  >
                    <IconClose />
                  </button>
                </div>
              )}
              {chat.attachment && (
                <div className="tg-attach-preview">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={chat.attachment.previewUrl}
                    alt="Attached image"
                  />
                  <span className="tg-attach-preview-label">
                    Photo attached — add a caption or hit send
                  </span>
                  <button
                    type="button"
                    className="tg-icon-btn"
                    onClick={() => chat.setAttachment(null)}
                    aria-label="Remove attachment"
                  >
                    <IconClose />
                  </button>
                </div>
              )}
              {me.admin && isGroupChat && (
                <div className="tg-ttl-row">
                  <span>Auto-delete:</span>
                  <select
                    value={chat.ttlSeconds}
                    onChange={(e) => chat.setTtlSeconds(Number(e.target.value))}
                  >
                    <option value={0}>Never</option>
                    <option value={3600}>1 hour</option>
                    <option value={86400}>1 day</option>
                    <option value={604800}>1 week</option>
                  </select>
                </div>
              )}
              {(() => {
                // Match the RAW composer text (not trimmed): applyCommand fills
                // "/cmd " with a trailing space, so an un-trimmed match lets that
                // space dismiss the popup instead of leaving it stuck open (the
                // tap otherwise "did nothing" because the trimmed text still
                // matched and re-rendered the same list).
                const t = chat.text;
                const m = t.match(/^\/(\w*)$/);
                if (!m) return null;
                const partial = m[1].toLowerCase();
                const matches = COMMAND_SPECS.filter(
                  (c) => (me.admin || !c.admin) && c.cmd.startsWith(partial),
                );
                if (matches.length === 0) return null;
                return (
                  <div
                    className="tg-command-list"
                    role="listbox"
                    aria-label="Commands"
                  >
                    {matches.map((c) => (
                      <button
                        key={c.cmd}
                        type="button"
                        role="option"
                        className="tg-command-item"
                        onClick={() => applyCommand(c.cmd)}
                      >
                        <span className="tg-command-main">
                          <span className="tg-command-name">/{c.cmd}</span>
                          {c.args ? (
                            <span className="tg-command-args">{c.args}</span>
                          ) : null}
                        </span>
                        <span className="tg-command-desc">{c.desc}</span>
                      </button>
                    ))}
                  </div>
                );
              })()}
              {acItems.length > 0 && (
                <div
                  className="tg-command-list tg-autocomplete"
                  role="listbox"
                  aria-label="Suggestions"
                >
                  {acItems.map((it) => (
                    <button
                      key={it.key}
                      type="button"
                      role="option"
                      className="tg-command-item"
                      onClick={() => applyAutocomplete(it.snippet)}
                    >
                      <span className="tg-command-main">
                        {it.emoji ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={emojiSrc(it.emoji)}
                            className="emoji emoji-small tg-ac-emoji"
                            alt={it.emoji}
                            draggable={false}
                            loading="lazy"
                          />
                        ) : (
                          <span className="tg-ac-at" aria-hidden>
                            @
                          </span>
                        )}
                        <span className="tg-command-name">{it.label}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
              <div
                className={`message-input-wrapper${
                  recorder.recording || recorder.processing
                    ? " is-recording"
                    : ""
                }`}
              >
                {(recorder.recording || recorder.processing) && (
                  <div className="tg-voice-rec">
                    <span className="tg-voice-rec-dot" aria-hidden />
                    <span className="tg-voice-rec-time">
                      {recorder.processing
                        ? "Sending…"
                        : `${Math.floor(recorder.elapsed / 60)}:${String(
                            recorder.elapsed % 60,
                          ).padStart(2, "0")}`}
                    </span>
                    {recorder.recording && (
                      <button
                        type="button"
                        className="tg-voice-rec-cancel"
                        onClick={recorder.cancel}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                )}
                <button
                  type="button"
                  className="Button symbol-menu-button composer-action-button default translucent round"
                  aria-label="Choose an emoji"
                  title="Choose an emoji"
                  onClick={() => setEmojiOpen((v) => !v)}
                >
                  <i className="icon icon-smile" aria-hidden />
                </button>
                <div id="message-input-text">
                  <div className="custom-scroll input-scroller">
                    <div className="input-scroller-content">
                      <div
                        ref={inputRef}
                        id="editable-message-text"
                        className="form-control allow-selection"
                        contentEditable
                        suppressContentEditableWarning
                        role="textbox"
                        dir="auto"
                        tabIndex={0}
                        aria-label={`Message as ${me.name}`}
                        onInput={(e) => {
                          let v = e.currentTarget.innerText.replace(
                            /\u00A0/g,
                            " ",
                          );
                          if (v === "\n") v = "";
                          if (v.length > MAX_LEN) {
                            v = v.slice(0, MAX_LEN);
                            e.currentTarget.innerText = v;
                            const sel = window.getSelection();
                            sel?.selectAllChildren(e.currentTarget);
                            sel?.collapseToEnd();
                          }
                          chat.setText(v);
                          if (v.trim()) chat.notifyTyping();
                        }}
                        onKeyDown={(e) => {
                          if (
                            e.key === "Enter" &&
                            !e.shiftKey &&
                            !e.nativeEvent.isComposing
                          ) {
                            e.preventDefault();
                            void chat.send();
                          }
                        }}
                        onPaste={(e) => {
                          e.preventDefault();
                          // A pasted screenshot/photo becomes the pending
                          // attachment (Web A parity), text pastes as plain.
                          const items = Array.from(e.clipboardData.items);
                          const img = items.find((it) =>
                            it.type.startsWith("image/"),
                          );
                          if (img) {
                            const file = img.getAsFile();
                            if (file) {
                              void attachImage(file);
                              return;
                            }
                          }
                          const text = e.clipboardData.getData("text/plain");
                          document.execCommand("insertText", false, text);
                        }}
                      />
                      {!chat.text && (
                        <span className="placeholder-text" dir="auto">
                          Message
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="AttachMenu">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) void attachImage(file);
                      e.target.value = "";
                    }}
                  />
                  <button
                    id="attach-menu-button"
                    type="button"
                    className="Button AttachMenu--button composer-action-button default translucent round"
                    aria-label="Add an attachment"
                    title="Add an attachment"
                    onClick={() => setAttachOpen((v) => !v)}
                  >
                    <i className="icon icon-attach" aria-hidden />
                  </button>
                  {attachOpen && (
                    <>
                      <button
                        type="button"
                        className="tg-menu-backdrop"
                        aria-label="Close menu"
                        onClick={() => setAttachOpen(false)}
                      />
                      <div className="tg-menu tg-attach-menu" role="menu">
                        <button
                          type="button"
                          className="tg-menu-item"
                          onClick={() => {
                            setAttachOpen(false);
                            fileInputRef.current?.click();
                          }}
                        >
                          <i className="icon icon-photo" aria-hidden />
                          Photo
                        </button>
                        <button
                          type="button"
                          className="tg-menu-item"
                          onClick={() => {
                            setAttachOpen(false);
                            setPollError(null);
                            setPollModal(true);
                          }}
                        >
                          <i className="icon icon-poll" aria-hidden />
                          Poll
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            {!chat.text.trim() &&
            !chat.attachment &&
            !chat.editing &&
            !recorder.processing ? (
              recorder.recording ? (
                <button
                  type="button"
                  className="Button send main-button default secondary round click-allowed"
                  aria-label="Send voice message"
                  title="Send voice message"
                  onClick={stopAndSendVoice}
                >
                  <i className="icon icon-send" aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  className="Button send main-button default secondary round click-allowed tg-mic-button"
                  aria-label="Record voice message"
                  title="Record voice message"
                  onClick={startVoice}
                  disabled={chat.sending}
                >
                  <i className="icon icon-microphone-alt" aria-hidden />
                </button>
              )
            ) : (
              <button
                type="button"
                className="Button send main-button default secondary round click-allowed"
                aria-label={
                  chat.editing ? "Save edited message" : "Send message"
                }
                title={chat.editing ? "Save edited message" : "Send message"}
                onClick={() => void chat.send()}
                disabled={
                  chat.sending ||
                  recorder.processing ||
                  (!chat.text.trim() && !chat.attachment)
                }
              >
                {/* Web A swaps the paper plane for a check while editing. */}
                <i
                  className={`icon ${chat.editing ? "icon-check" : "icon-send"}`}
                  aria-hidden
                />
              </button>
            )}
          </div>
        )}

        {state !== null && lockedForMembers && !me?.admin && (
          <div className="messaging-disabled shown">
            <div className="messaging-disabled-inner">
              <span>
                <i className="icon icon-lock" aria-hidden /> Topic locked
              </span>
            </div>
          </div>
        )}
        {state !== null && !me && !lockedForMembers && (
          <div className="tg-composer-notice">
            {chat.inTelegram ? (
              <span>
                {chat.authError ??
                  "Sign-in didn't complete — close and reopen the mini app to try again."}
              </span>
            ) : (
              <>
                <span>
                  This chat is for Telegram members — open it in Telegram to
                  join the conversation.
                </span>
                {state.botUsername ? (
                  <a
                    className="tg-signin-btn"
                    href={`https://t.me/${state.botUsername}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Telegram
                  </a>
                ) : (
                  <span>Chat access is being set up — check back shortly.</span>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {lightbox &&
        overlayEl &&
        createPortal(
          <div
          className="tg-lightbox"
          role="dialog"
          aria-modal="true"
          onClick={() => setLightbox(null)}
        >
          <button
            type="button"
            className="tg-lightbox-close"
            aria-label="Close photo"
            onClick={() => setLightbox(null)}
          >
            <IconClose />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightbox}
            alt="Photo"
            onClick={(e) => e.stopPropagation()}
          />
        </div>,
          overlayEl,
        )}

      {overlayEl &&
        createPortal(
          <PollCreateModal
            open={pollModal}
            busy={pollBusy}
            error={pollError}
            onCancel={() => setPollModal(false)}
            onCreate={createPoll}
          />,
          overlayEl,
        )}

      {toast &&
        typeof document !== "undefined" &&
        createPortal(
          <div
          key={toast.n}
          className="tg-toast"
          role="status"
          aria-live="polite"
        >
          {toast.msg}
        </div>,
          document.body,
        )}
    </>
  );
}
