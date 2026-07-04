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

  // Discovered custom packs (null until first load; falls back to static).
  const [packs, setPacks] = useState<PackGroup[] | null>(null);
  const [packsLoaded, setPacksLoaded] = useState(false);
  const [activePack, setActivePack] = useState<string>("");
  const packRefs = useRef(new Map<string, HTMLDivElement>());

  // Admin pack-management state (Custom tab). Declared here so the loader
  // effect below can drive the auto-discovery status message.
  const [adminId, setAdminId] = useState("");
  const [adminAlt, setAdminAlt] = useState("");
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
    const load = async (): Promise<PackGroup[]> => {
      try {
        const res = await fetch("/api/community/emoji/list");
        const data = (await res.json()) as { ok?: boolean; groups?: PackGroup[] };
        return data?.ok && Array.isArray(data.groups) ? data.groups : [];
      } catch {
        return [];
      }
    };
    (async () => {
      let groups = await load();
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
            groups = await load();
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
          setPacks(groups);
          setActivePack(groups[0].setName || groups[0].title || "0");
        }
        setPacksLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, packsLoaded, isAdmin]);

  const packKey = (g: PackGroup, i: number) => g.setName || g.title || `pack-${i}`;

  // ── Admin pack management (Custom tab only). ────────────────────────────
  const reloadPacks = () => {
    setPacks(null);
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
            onClick={() => setTab("custom")}
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
            )}
          </>
        )}
      </div>
    </>
  );
}
