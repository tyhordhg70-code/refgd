"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Admin console for /community (admins only — the API is gated server-side).
 * Two tabs: invite links (create / copy / delete, with click + join tracking)
 * and the 3-day actions log (moderation, ingestion and invite events).
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
  const [tab, setTab] = useState<"invites" | "log">("invites");
  const [invites, setInvites] = useState<InviteLink[]>([]);
  const [actions, setActions] = useState<ActionRow[]>([]);
  const [slug, setSlug] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTab("invites")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                tab === "invites"
                  ? "bg-amber-400/20 text-amber-200"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              Invite links
            </button>
            <button
              type="button"
              onClick={() => setTab("log")}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                tab === "log"
                  ? "bg-amber-400/20 text-amber-200"
                  : "text-white/50 hover:text-white/80"
              }`}
            >
              Actions log
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-white/40 hover:text-white/80"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <p className="mb-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-xs text-rose-200">
              {error}
            </p>
          )}

          {tab === "invites" ? (
            <>
              <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="slug (e.g. twitter)"
                    maxLength={64}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-amber-400/50 focus:outline-none"
                  />
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="label (optional)"
                    maxLength={120}
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/35 focus:border-amber-400/50 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void create()}
                    disabled={busy || !slug.trim()}
                    className="shrink-0 rounded-lg bg-amber-400 px-4 py-2 text-sm font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Create
                  </button>
                </div>
              </div>

              {invites.length === 0 ? (
                <p className="py-6 text-center text-sm text-white/45">
                  No invite links yet.
                </p>
              ) : (
                <ul className="space-y-2">
                  {invites.map((inv) => (
                    <li
                      key={inv.slug}
                      className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {inv.name}
                          </p>
                          <p className="truncate text-xs text-white/45">
                            /i/{inv.slug}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => void copy(inv.slug)}
                            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/70 hover:bg-white/10"
                          >
                            {copied === inv.slug ? "Copied!" : "Copy"}
                          </button>
                          <button
                            type="button"
                            onClick={() => void remove(inv.slug)}
                            className="rounded-full border border-rose-400/30 bg-rose-400/10 px-2.5 py-1 text-xs text-rose-200 hover:bg-rose-400/20"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                      <div className="mt-1.5 flex gap-4 text-[11px] text-white/45">
                        <span>{inv.clicks} clicks</span>
                        <span>{inv.joins} joins</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : actions.length === 0 ? (
            <p className="py-6 text-center text-sm text-white/45">
              No actions in the last 3 days.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {actions.map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold text-amber-200/90">
                      {a.action}
                    </span>
                    <span className="shrink-0 text-white/35">
                      {formatTime(a.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-white/55">
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
