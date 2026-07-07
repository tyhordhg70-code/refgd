"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import { CustomEmojiImg, emojiSrc, warmEmojiTiles } from "./format";
import { EMOJI_CATEGORIES } from "./emoji-data";
import { CUSTOM_EMOJI, EMOJI_CACHE_VERSION } from "@/lib/custom-emoji";
import {
  getEmojiDebugSnapshot,
  runEmojiSelfTest,
  type EmojiDebugSnapshot,
} from "./emoji-debug";

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

// Last successfully fetched pack list — module-level so it survives the
// panel unmounting (the picker closes on every send). Reopening paints the
// full list instantly from this memo while a background refetch checks for
// changes; without it every open flashed the small static seed set first,
// then jumped to the full packs when the fetch landed.
let packMemoCache: PackGroup[] | null = null;

/* alt character → document id lookup built from the discovered packs, so a
 * PLAIN emoji character pasted from the native Telegram app (whose clipboard
 * carries no data-document-id html, unlike the Web A/K clients) can be
 * upgraded back into the community's animated pack emoji token. Keyed by the
 * exact alt AND its FE0F-stripped form (pack alts are inconsistent about the
 * variation selector). Collision policy: Telegram's official "Animated
 * Emoji" set always wins (same glyph, canonical artwork); otherwise an alt
 * upgrades ONLY when exactly one artwork claims it. "First pack wins" was
 * the wrong-artwork generator — a pasted ➡️ upgraded into a random
 * decoration pack's GREEN arrow because that pack happened to sort first. */
let ceAltMap: Map<string, string> = new Map();

/** Telegram's official animated versions of the standard emoji set. */
function isOfficialPack(g: PackGroup): boolean {
  return g.setName === "RestrictedEmoji" || g.title === "Animated Emoji";
}
function rebuildCeAltMap(groups: PackGroup[] | null): void {
  const claims = new Map<
    string,
    { id: string; official: boolean; ids: Set<string> }
  >();
  for (const g of groups ?? []) {
    const official = isOfficialPack(g);
    for (const c of g.emoji) {
      if (!c.alt || !/^\d+$/.test(c.id)) continue;
      const bare = c.alt.replace(/\uFE0F/g, "");
      for (const key of new Set([c.alt, bare])) {
        if (!key) continue;
        const cl = claims.get(key);
        if (!cl) {
          claims.set(key, { id: c.id, official, ids: new Set([c.id]) });
        } else {
          cl.ids.add(c.id);
          if (official && !cl.official) {
            cl.id = c.id;
            cl.official = true;
          }
        }
      }
    }
  }
  const next = new Map<string, string>();
  for (const [key, cl] of claims) {
    if (cl.official || cl.ids.size === 1) next.set(key, cl.id);
  }
  ceAltMap = next;
}

/** Pack lookup for the paste-upgrade path (null = not a known pack emoji). */
export function ceAltToId(alt: string): string | null {
  const bare = alt.replace(/\uFE0F/g, "");
  return (
    ceAltMap.get(alt) ??
    ceAltMap.get(bare) ??
    // Skin-tone fallback: packs publish only base-tone alts, so a toned
    // paste (👍🏽) otherwise never upgrades — strip the modifier and serve
    // the base artwork, the same substitution Telegram itself makes.
    ceAltMap.get(bare.replace(/[\u{1F3FB}-\u{1F3FF}]/gu, "")) ??
    null
  );
}

/**
 * Background alt-map refresh for the paste-upgrade path: the map is built
 * once per page load, so packs taught to the bot (or auto-downloaded by a
 * doc-id paste) mid-session are invisible to it until reload. When a paste
 * leaves plain pictographs un-upgraded, the composer calls this — the list
 * refetches and the NEXT paste of the same emoji upgrades without a reload.
 * Throttled so paste spam can't hammer the list endpoint.
 */
let ceAltRefreshAt = 0;
export function refreshCeAltMap(): void {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (now - ceAltRefreshAt < 15_000) return;
  ceAltRefreshAt = now;
  void fetch("/api/community/emoji/list")
    .then((r) => r.json() as Promise<{ ok?: boolean; groups?: PackGroup[] }>)
    .then((data) => {
      const groups =
        data?.ok && Array.isArray(data.groups) ? data.groups : null;
      if (groups && groups.length > 0) {
        packMemoCache = groups;
        rebuildCeAltMap(groups);
      }
    })
    .catch(() => undefined);
}

/**
 * App-open tile warm-up: fetches the full pack list and queues every tile
 * into the background warmer WITHOUT the picker (or its Custom tab) ever
 * being opened — so custom emoji in bubbles and the first picker open paint
 * from cache (owner ask: emojis must load even when the tab was never
 * tapped). Also seeds the pack memo so that first open lists packs
 * instantly. Module-guarded: exactly one kick per page load, no matter how
 * many chat components mount.
 */
let warmKickDone = false;
export function kickstartEmojiWarm(): void {
  if (warmKickDone || typeof window === "undefined") return;
  warmKickDone = true;
  void (async () => {
    try {
      const res = await fetch("/api/community/emoji/list");
      const data = (await res.json()) as { ok?: boolean; groups?: PackGroup[] };
      const groups =
        data?.ok && Array.isArray(data.groups) ? data.groups : null;
      if (groups && groups.length > 0) {
        if (!packMemoCache) packMemoCache = groups;
        rebuildCeAltMap(groups);
        warmEmojiTiles(groups.flatMap((g) => g.emoji.map((c) => c.id)));
        return;
      }
      warmEmojiTiles(CUSTOM_EMOJI.map((c) => c.id));
    } catch {
      // List unreachable — warm the static seed set so SOMETHING is cached.
      warmEmojiTiles(CUSTOM_EMOJI.map((c) => c.id));
    }
  })();
}

export default function EmojiPanel({
  onPick,
  onClose,
  isAdmin = false,
}: {
  onPick: (snippet: string) => void;
  onClose: () => void;
  /** Shows the admin pack-management toolbar in the Custom tab. */
  isAdmin?: boolean;
}) {
  const [tab, setTab] = useState<"standard" | "custom">("standard");
  const [expanded, setExpanded] = useState(false);
  const [activeCat, setActiveCat] = useState(EMOJI_CATEGORIES[0].key);
  const sectionRefs = useRef(new Map<string, HTMLDivElement>());

  // Discovered custom packs (seeded from the module memo when this isn't the
  // first open; falls back to static only after a load confirms none exist).
  const [packs, setPacks] = useState<PackGroup[] | null>(packMemoCache);
  const [packsLoaded, setPacksLoaded] = useState(false);
  const [activePack, setActivePack] = useState<string>(() =>
    packMemoCache && packMemoCache.length > 0
      ? packMemoCache[0].setName || packMemoCache[0].title || "0"
      : "",
  );
  const packRefs = useRef(new Map<string, HTMLDivElement>());

  // Hidden diagnostics overlay: tap the "Custom" tab 5 times fast to toggle.
  // Shows live cascade counters + a device self-test (script/fetch/render) so
  // an unreachable device (Telegram webview) can report which step breaks.
  const [debugOn, setDebugOn] = useState(false);
  const [debugSnap, setDebugSnap] = useState<EmojiDebugSnapshot | null>(null);
  const [debugTest, setDebugTest] = useState<string[]>([]);
  const tapCountRef = useRef(0);
  const tapLastRef = useRef(0);

  const onCustomTabTap = () => {
    setTab("custom");
    const now = Date.now();
    tapCountRef.current = now - tapLastRef.current < 700 ? tapCountRef.current + 1 : 1;
    tapLastRef.current = now;
    if (tapCountRef.current >= 5) {
      tapCountRef.current = 0;
      setDebugOn((v) => !v);
    }
  };

  useEffect(() => {
    if (!debugOn) return undefined;
    setDebugSnap(getEmojiDebugSnapshot());
    const iv = window.setInterval(
      () => setDebugSnap(getEmojiDebugSnapshot()),
      800,
    );
    const sampleId =
      packs?.[0]?.emoji?.[0]?.id ?? CUSTOM_EMOJI[0]?.id ?? "";
    setDebugTest([`ua: ${navigator.userAgent}`]);
    void runEmojiSelfTest(sampleId, EMOJI_CACHE_VERSION, (line) =>
      setDebugTest((prev) => [...prev, line]),
    );
    return () => window.clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debugOn]);

  // Admin pack-management state (Custom tab). Declared here so the loader
  // effect below can drive the auto-discovery status message.
  const [adminId, setAdminId] = useState("");
  const [adminAlt, setAdminAlt] = useState("");
  const [adminPack, setAdminPack] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);
  const [adminMsg, setAdminMsg] = useState<string | null>(null);
  // Guards the one-shot admin auto-discovery so it can never loop.
  const autoTriedRef = useRef(false);

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
    // null = fetch/parse FAILED (keep whatever is on screen + in the memo);
    // [] = the server CONFIRMED there are no packs (safe to drop the memo).
    const load = async (): Promise<PackGroup[] | null> => {
      try {
        const res = await fetch("/api/community/emoji/list");
        const data = (await res.json()) as { ok?: boolean; groups?: PackGroup[] };
        return data?.ok && Array.isArray(data.groups) ? data.groups : null;
      } catch {
        return null;
      }
    };
    (async () => {
      let loaded = await load();
      let groups = loaded ?? [];
      // Admin auto-discovery: when the pack DB is empty, expand the seed ids
      // into their FULL Telegram packs on first open — so the owner sees every
      // emoji in each pack without having to find/press "Load packs". One-shot
      // per mount; on failure the error surfaces in the admin toolbar and the
      // static seed set stays as the fallback.
      if (!cancelled && groups.length === 0 && isAdmin && !autoTriedRef.current) {
        autoTriedRef.current = true;
        setAdminBusy(true);
        setAdminMsg("Loading full packs…");
        try {
          const res = await fetch("/api/community/emoji/discover", {
            method: "POST",
          });
          const data = (await res.json()) as {
            ok?: boolean;
            discovered?: number;
            error?: string;
          };
          if (data?.ok) {
            setAdminMsg(`Loaded ${data.discovered ?? 0} emoji`);
            loaded = await load();
            groups = loaded ?? [];
          } else {
            setAdminMsg(data?.error || "Discovery failed");
          }
        } catch {
          setAdminMsg("Discovery failed");
        } finally {
          // Unconditional: a tab switch mid-discovery cancels the effect but the
          // panel stays mounted, so a guarded reset would leave the admin
          // toolbar buttons permanently disabled. Post-unmount sets are no-ops.
          setAdminBusy(false);
        }
      }
      if (!cancelled) {
        if (groups.length > 0) {
          // Seamless refresh: when the fetch matches the memo the panel was
          // seeded from (the common case — every reopen), skip the state
          // update entirely so nothing re-renders, scroll position holds and
          // the user's active pack tab isn't clobbered.
          const changed =
            JSON.stringify(groups) !== JSON.stringify(packMemoCache);
          packMemoCache = groups;
          rebuildCeAltMap(groups);
          if (changed) {
            setPacks(groups);
            setActivePack(groups[0].setName || groups[0].title || "0");
          }
        } else if (loaded !== null) {
          // The server CONFIRMED there are no packs (not a failed fetch) —
          // drop the memo + any list it seeded so the seed fallback shows
          // instead of a stale pack list that no longer exists.
          packMemoCache = null;
          rebuildCeAltMap(null);
          setPacks(null);
        }
        setPacksLoaded(true);
        // Telegram-instant: quietly pre-download every tile (a few at a time)
        // into the browser's HTTP cache so tiles paint the moment they mount
        // — and the whole picker is instant on every later visit.
        warmEmojiTiles(
          groups.length > 0
            ? groups.flatMap((g) => g.emoji.map((c) => c.id))
            : CUSTOM_EMOJI.map((c) => c.id),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, packsLoaded, isAdmin]);

  const packKey = (g: PackGroup, i: number) => g.setName || g.title || `pack-${i}`;

  // ── Admin pack management (Custom tab only). ────────────────────────────
  // Keeps the current list on screen while the loader effect refetches — the
  // fresh result replaces it only if it actually differs (no blank flash).
  const reloadPacks = () => {
    setPacksLoaded(false);
  };

  const runDiscover = async () => {
    setAdminBusy(true);
    setAdminMsg(null);
    try {
      const res = await fetch("/api/community/emoji/discover", {
        method: "POST",
      });
      const data = (await res.json()) as {
        ok?: boolean;
        discovered?: number;
        error?: string;
      };
      if (data?.ok) {
        setAdminMsg(`Loaded ${data.discovered ?? 0} emoji`);
        reloadPacks();
      } else {
        setAdminMsg(data?.error || "Discovery failed");
      }
    } catch {
      setAdminMsg("Discovery failed");
    } finally {
      setAdminBusy(false);
    }
  };

  // "Add pack" — paste any pack link (t.me/addemoji/NAME, fullyst.com,
  // fstik.app) or a bare short-name; the discover route pulls the whole set.
  const parsePackName = (raw: string): string => {
    const s = raw.trim();
    const m = s.match(
      /(?:t\.me\/add(?:emoji|stickers)\/|fullyst\.com\/[a-z]{2}\/emoji_set\/|fstik\.app\/stickerSet\/)([A-Za-z0-9_]+)/i,
    );
    if (m) return m[1];
    return /^[A-Za-z0-9_]{1,64}$/.test(s) ? s : "";
  };

  const addPack = async () => {
    const setName = parsePackName(adminPack);
    if (!setName) {
      setAdminMsg("Paste a pack link (t.me/addemoji/…) or its short name");
      return;
    }
    setAdminBusy(true);
    setAdminMsg(null);
    try {
      const res = await fetch("/api/community/emoji/discover", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ setName }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        discovered?: number;
        sets?: Array<{ title?: string }>;
        error?: string;
      };
      if (data?.ok) {
        const title = data.sets?.[0]?.title || setName;
        setAdminMsg(`Added "${title}" (${data.discovered ?? 0} emoji)`);
        setAdminPack("");
        reloadPacks();
      } else {
        setAdminMsg(data?.error || "Add pack failed");
      }
    } catch {
      setAdminMsg("Add pack failed");
    } finally {
      setAdminBusy(false);
    }
  };

  const addById = async () => {
    const id = adminId.trim();
    if (!/^\d{1,32}$/.test(id)) {
      setAdminMsg("Enter a numeric emoji id");
      return;
    }
    setAdminBusy(true);
    setAdminMsg(null);
    try {
      const res = await fetch("/api/community/emoji/list", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, alt: adminAlt.trim() }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (data?.ok) {
        setAdminMsg("Added");
        setAdminId("");
        setAdminAlt("");
        reloadPacks();
      } else {
        setAdminMsg(data?.error || "Add failed");
      }
    } catch {
      setAdminMsg("Add failed");
    } finally {
      setAdminBusy(false);
    }
  };

  const removePack = async (g: PackGroup) => {
    const setName = (g.setName || g.title || "").trim();
    if (!setName) return;
    const label = g.title || g.setName;
    if (
      typeof window !== "undefined" &&
      !window.confirm(
        `Remove the pack "${label}" (${g.emoji.length} emoji) from the picker? Emoji already used in messages keep working.`,
      )
    ) {
      return;
    }
    setAdminBusy(true);
    setAdminMsg(null);
    try {
      const res = await fetch("/api/community/emoji/list", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ setName }),
      });
      const data = (await res.json()) as {
        ok?: boolean;
        removed?: number;
        error?: string;
      };
      if (data?.ok) {
        setAdminMsg(`Removed "${label}" (${data.removed ?? 0} emoji)`);
        setPacks((prev) =>
          prev
            ? prev.filter((p) => (p.setName || p.title || "").trim() !== setName)
            : prev,
        );
        // Keep the reopen memo in step with the on-screen list so the next
        // open doesn't resurrect the removed pack for a frame.
        packMemoCache =
          packMemoCache?.filter(
            (p) => (p.setName || p.title || "").trim() !== setName,
          ) ?? null;
      } else {
        setAdminMsg(data?.error || "Remove failed");
      }
    } catch {
      setAdminMsg("Remove failed");
    } finally {
      setAdminBusy(false);
    }
  };

  return (
    <>
      <button
        type="button"
        className="tg-menu-backdrop"
        onClick={onClose}
        aria-label="Close emoji panel"
      />
      <div className={`tg-emoji-panel${expanded ? " is-expanded" : ""}`}>
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
            onClick={onCustomTabTap}
          >
            Custom
          </button>
          <button
            type="button"
            className="tg-emoji-expand"
            aria-label={expanded ? "Collapse emoji panel" : "Expand emoji panel"}
            aria-pressed={expanded}
            title={expanded ? "Collapse" : "Expand"}
            onClick={() => setExpanded((v) => !v)}
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
              <path
                d="M7 14l5-5 5 5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
        {debugOn && (
          <div
            style={{
              position: "fixed",
              left: 8,
              right: 8,
              top: 8,
              maxHeight: "55vh",
              overflowY: "auto",
              zIndex: 100000,
              background: "rgba(0,0,0,0.92)",
              color: "#7CFC00",
              fontFamily: "monospace",
              fontSize: 10,
              lineHeight: 1.5,
              padding: 8,
              borderRadius: 8,
              whiteSpace: "pre-wrap",
              wordBreak: "break-all",
              textAlign: "left",
            }}
          >
            <div style={{ color: "#fff" }}>
              EMOJI DEBUG v{EMOJI_CACHE_VERSION} — tap Custom 5x to close
            </div>
            <div style={{ color: "#FFD700" }}>— self-test —</div>
            {debugTest.map((l, i) => (
              <div key={`t${i}`}>{l}</div>
            ))}
            <div style={{ color: "#FFD700" }}>— cascade counters —</div>
            <div>
              {debugSnap && Object.keys(debugSnap.counts).length > 0
                ? Object.entries(debugSnap.counts)
                    .map(([k, v]) => `${k}=${v}`)
                    .join("  ")
                : "(none yet)"}
            </div>
            <div style={{ color: "#FFD700" }}>— last errors —</div>
            {debugSnap && debugSnap.errors.length > 0 ? (
              debugSnap.errors.map((l, i) => <div key={`e${i}`}>{l}</div>)
            ) : (
              <div>(none)</div>
            )}
          </div>
        )}
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
            <div className="tg-emoji-grid custom-scroll" data-lenis-prevent>
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
          <>
            {isAdmin && (
              <div className="tg-emoji-admin">
                <button
                  type="button"
                  className="tg-emoji-admin-btn"
                  onClick={() => void runDiscover()}
                  disabled={adminBusy}
                >
                  Load packs
                </button>
                <div className="tg-emoji-admin-add">
                  <input
                    type="text"
                    placeholder="Pack link or name"
                    value={adminPack}
                    onChange={(e) => setAdminPack(e.target.value)}
                  />
                  <button
                    type="button"
                    className="tg-emoji-admin-btn"
                    onClick={() => void addPack()}
                    disabled={adminBusy}
                  >
                    Add pack
                  </button>
                </div>
                <div className="tg-emoji-admin-add">
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Emoji id"
                    value={adminId}
                    onChange={(e) => setAdminId(e.target.value)}
                  />
                  <input
                    type="text"
                    placeholder="alt"
                    value={adminAlt}
                    onChange={(e) => setAdminAlt(e.target.value)}
                  />
                  <button
                    type="button"
                    className="tg-emoji-admin-btn"
                    onClick={() => void addById()}
                    disabled={adminBusy}
                  >
                    Add
                  </button>
                </div>
                {adminMsg && (
                  <span className="tg-emoji-admin-msg">{adminMsg}</span>
                )}
              </div>
            )}
            {packs && packs.length > 0 ? (
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
            <div className="tg-emoji-grid custom-scroll" data-lenis-prevent>
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
                      style={
                        isAdmin
                          ? {
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: "0.5rem",
                            }
                          : undefined
                      }
                    >
                      <span>{g.title || g.setName || "Custom"}</span>
                      {isAdmin && (
                        <button
                          type="button"
                          onClick={() => void removePack(g)}
                          disabled={adminBusy}
                          aria-label={`Remove pack ${g.title || g.setName}`}
                          style={{
                            flex: "0 0 auto",
                            border: "1px solid rgba(255,255,255,0.25)",
                            borderRadius: "0.375rem",
                            background: "transparent",
                            color: "inherit",
                            font: "inherit",
                            fontSize: "0.6875rem",
                            lineHeight: 1,
                            padding: "0.25rem 0.4375rem",
                            opacity: adminBusy ? 0.5 : 0.8,
                            cursor: adminBusy ? "default" : "pointer",
                          }}
                        >
                          ✕ Remove
                        </button>
                      )}
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
        ) : packsLoaded ? (
          <div className="tg-emoji-grid custom-scroll" data-lenis-prevent>
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
        ) : (
          /* First-ever load in flight: hold an empty grid instead of
             flashing the static seed set that the full list then replaces. */
          <div className="tg-emoji-grid custom-scroll" data-lenis-prevent />
            )}
          </>
        )}
      </div>
    </>
  );
}
