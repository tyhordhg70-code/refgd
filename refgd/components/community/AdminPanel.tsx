"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Admin console for /community (admins only — the API is gated server-side).
 * Two tabs: invite links (create / copy / delete, with click + join tracking)
 * and the 3-day actions log (moderation, ingestion and invite events).
 * Styled as a Telegram Web A light-theme modal.
 */

interface InviteLink {
  slug: string;
  name: string;
  clicks: number;
  joins: number;
  createdBy: string | null;
  createdAt: string;
}

interface ActionRow {
  id: string;
  actorName: string | null;
  action: string;
  target: string | null;
  meta: Record<string, unknown>;
  createdAt: string;
}

interface RosterMember {
  tgId: string;
  name: string;
  photo: string | null;
  isAdmin: boolean;
  isBanned: boolean;
  mutedUntil: string | null;
  warnCount: number;
  lastSeen: string | null;
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

export default function AdminPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"invites" | "members" | "log">("invites");
  const [invites, setInvites] = useState<InviteLink[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [members, setMembers] = useState<RosterMember[]>([]);
  const [membersLoaded, setMembersLoaded] = useState(false);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/community/admin", { cache: "no-store" });
      if (!res.ok) {
        setError("Couldn't load the admin console.");
        return;
      }
      const d = (await res.json()) as {
        invites: InviteLink[];
        actions: ActionRow[];
      };
      setInvites(d.invites);
      setActions(d.actions);
    } catch {
      setError("Couldn't load the admin console.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const create = useCallback(async () => {
    const s = slug.trim().toLowerCase();
    if (!s || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/community/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: s, name: name.trim() }),
      });
      const out = (await res.json()) as { ok: boolean; error?: string };
      if (!res.ok || !out.ok) {
        setError(out.error ?? "Couldn't create the link");
        return;
      }
      setSlug("");
      setName("");
      await load();
    } catch {
      setError("Couldn't create the link");
    } finally {
      setBusy(false);
    }
  }, [slug, name, busy, load]);

  const remove = useCallback(
    async (s: string) => {
      setError(null);
      try {
        await fetch("/api/community/admin", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: s }),
        });
        await load();
      } catch {
        setError("Couldn't delete the link");
      }
    },
    [load],
  );

  const copy = useCallback(async (s: string) => {
    const link = `${window.location.origin}/i/${s}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(s);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }, []);

  const loadMembers = useCallback(async () => {
    try {
      const res = await fetch("/api/community/members", { cache: "no-store" });
      if (!res.ok) {
        setError("Couldn't load the member list.");
        return;
      }
      const d = (await res.json()) as { ok: boolean; members: RosterMember[] };
      setMembers(d.members ?? []);
      setMembersLoaded(true);
    } catch {
      setError("Couldn't load the member list.");
    }
  }, []);

  useEffect(() => {
    if (tab === "members" && !membersLoaded) void loadMembers();
  }, [tab, membersLoaded, loadMembers]);

  const copyId = useCallback(async (id: string) => {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedId(id);
      window.setTimeout(() => setCopiedId(null), 1500);
    } catch {
      /* clipboard blocked — ignore */
    }
  }, []);

  return (
    <div
      className="tg-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="tg-modal is-wide"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="tg-modal-header">
          <div className="tg-tabs">
            <button
              type="button"
              className={`tg-tab${tab === "invites" ? " is-active" : ""}`}
              onClick={() => setTab("invites")}
            >
              Invite links
            </button>
            <button
              type="button"
              className={`tg-tab${tab === "members" ? " is-active" : ""}`}
              onClick={() => setTab("members")}
            >
              Members
            </button>
            <button
              type="button"
              className={`tg-tab${tab === "log" ? " is-active" : ""}`}
              onClick={() => setTab("log")}
            >
              Actions log
            </button>
          </div>
          <button
            type="button"
            className="tg-icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="tg-modal-body tg-scroll">
          {error && <p className="tg-note is-error">{error}</p>}

          {tab === "invites" ? (
            <>
              <div className="tg-invite-form">
                <input
                  className="tg-field"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="slug (e.g. twitter)"
                  maxLength={64}
                />
                <input
                  className="tg-field"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="label (optional)"
                  maxLength={120}
                />
                <button
                  type="button"
                  className="tg-btn"
                  onClick={() => void create()}
                  disabled={busy || !slug.trim()}
                >
                  Create
                </button>
              </div>

              {invites.length === 0 ? (
                <p className="tg-note">No invite links yet.</p>
              ) : (
                <ul className="tg-invite-list">
                  {invites.map((inv) => (
                    <li key={inv.slug} className="tg-invite-row">
                      <div className="tg-invite-top">
                        <div className="tg-invite-name">
                          <p>{inv.name}</p>
                          <p className="tg-row-sub">/i/{inv.slug}</p>
                        </div>
                        <button
                          type="button"
                          className="tg-chip-btn"
                          onClick={() => void copy(inv.slug)}
                        >
                          {copied === inv.slug ? "Copied!" : "Copy"}
                        </button>
                        <button
                          type="button"
                          className="tg-chip-btn is-danger"
                          onClick={() => void remove(inv.slug)}
                        >
                          Delete
                        </button>
                      </div>
                      <p className="tg-row-sub">
                        {inv.clicks} clicks · {inv.joins} joins
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : tab === "members" ? (
            members.length === 0 ? (
              <p className="tg-note">
                {membersLoaded ? "No members yet." : "Loading members…"}
              </p>
            ) : (
              <ul className="tg-invite-list">
                {members.map((m) => (
                  <li key={m.tgId} className="tg-invite-row">
                    <div className="tg-invite-top">
                      <div className="tg-invite-name">
                        <p>
                          {m.name || "Unknown"}
                          {m.isAdmin && (
                            <span className="tg-member-badge is-admin">
                              admin
                            </span>
                          )}
                          {m.isBanned && (
                            <span className="tg-member-badge is-danger">
                              banned
                            </span>
                          )}
                          {m.mutedUntil && (
                            <span className="tg-member-badge">muted</span>
                          )}
                          {m.warnCount > 0 && (
                            <span className="tg-member-badge">
                              {m.warnCount} warn
                            </span>
                          )}
                        </p>
                        <p className="tg-row-sub">ID {m.tgId}</p>
                      </div>
                      <button
                        type="button"
                        className="tg-chip-btn"
                        onClick={() => void copyId(m.tgId)}
                      >
                        {copiedId === m.tgId ? "Copied!" : "Copy ID"}
                      </button>
                    </div>
                    <p className="tg-row-sub">
                      {m.lastSeen
                        ? `Last seen ${formatTime(m.lastSeen)}`
                        : "Never seen"}
                    </p>
                  </li>
                ))}
              </ul>
            )
          ) : actions.length === 0 ? (
            <p className="tg-note">No actions in the last 3 days.</p>
          ) : (
            <ul className="tg-invite-list">
              {actions.map((a) => (
                <li key={a.id} className="tg-invite-row">
                  <div className="tg-invite-top">
                    <span className="tg-log-action">{a.action}</span>
                    <span className="tg-row-sub">{formatTime(a.createdAt)}</span>
                  </div>
                  <p className="tg-row-sub">
                    {a.actorName ? `${a.actorName} · ` : ""}
                    {a.target ?? ""}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
