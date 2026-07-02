"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Per-category notification opt-in for signed-in members. Two independent
 * channels: browser web-push (needs the VAPID public key + a service worker)
 * and Telegram DMs from the community bot. Categories: Testimonials, BUY4U,
 * Announcements, Chat.
 *
 * The /community page suppresses the global LoadingScreen (the site's usual
 * service-worker registrar), so this component registers `/sw.js` itself the
 * first time a member enables web push. If the VAPID key is not configured the
 * web-push controls are hidden and only Telegram opt-in is offered.
 */

const CATEGORIES: { key: string; label: string }[] = [
  { key: "testimonials", label: "Testimonials" },
  { key: "buy4u", label: "BUY4U" },
  { key: "announcements", label: "Announcements" },
  { key: "chat", label: "Chat" },
];

interface NotifState {
  member: { tid: string; admin: boolean } | null;
  publicKey: string | null;
  web: string[];
  telegram: string[];
}

function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

export default function NotificationSettings({
  onClose,
}: {
  onClose: () => void;
}) {
  const [data, setData] = useState<NotifState | null>(null);
  const [web, setWeb] = useState<string[]>([]);
  const [telegram, setTelegram] = useState<string[]>([]);
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/community/notifications", {
        cache: "no-store",
      });
      const d = (await res.json()) as NotifState;
      setData(d);
      setWeb(d.web);
      setTelegram(d.telegram);
    } catch {
      setError("Couldn't load notification settings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Detect an existing web-push subscription so toggles reflect reality.
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }
    void (async () => {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) setEndpoint(sub.endpoint);
      } catch {
        /* not subscribed yet */
      }
    })();
  }, []);

  const pushSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    Boolean(data?.publicKey);

  const saveWeb = useCallback(
    async (categories: string[]) => {
      if (!data?.publicKey) return;
      setBusy(true);
      setError(null);
      setNote(null);
      try {
        const perm = await Notification.requestPermission();
        if (perm !== "granted") {
          setError("Notifications are blocked in your browser settings.");
          return;
        }
        const reg = await navigator.serviceWorker.register("/sw.js");
        await navigator.serviceWorker.ready;
        let sub = await reg.pushManager.getSubscription();
        if (!sub) {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(data.publicKey),
          });
        }
        setEndpoint(sub.endpoint);
        const json = sub.toJSON();
        const res = await fetch("/api/community/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription: {
              endpoint: sub.endpoint,
              keys: json.keys,
            },
            categories,
          }),
        });
        const out = (await res.json()) as { ok: boolean; web?: string[] };
        if (out.ok && out.web) {
          setWeb(out.web);
          setNote("Browser notifications updated.");
        }
      } catch {
        setError("Couldn't enable browser notifications.");
      } finally {
        setBusy(false);
      }
    },
    [data],
  );

  const toggleWeb = useCallback(
    (key: string) => {
      const next = web.includes(key)
        ? web.filter((c) => c !== key)
        : [...web, key];
      setWeb(next);
      void saveWeb(next);
    },
    [web, saveWeb],
  );

  const disableWeb = useCallback(async () => {
    setBusy(true);
    setError(null);
    setNote(null);
    try {
      if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.getRegistration();
        const sub = await reg?.pushManager.getSubscription();
        if (sub) {
          await fetch("/api/community/notifications", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint }),
          });
          await sub.unsubscribe();
        }
      }
      setEndpoint(null);
      setWeb([]);
      setNote("Browser notifications turned off.");
    } catch {
      setError("Couldn't turn off browser notifications.");
    } finally {
      setBusy(false);
    }
  }, []);

  const toggleTelegram = useCallback(
    async (key: string) => {
      const next = telegram.includes(key)
        ? telegram.filter((c) => c !== key)
        : [...telegram, key];
      setTelegram(next);
      setError(null);
      setNote(null);
      try {
        const res = await fetch("/api/community/notifications", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ telegram: true, telegramCategories: next }),
        });
        const out = (await res.json()) as { ok: boolean; telegram?: string[] };
        if (out.ok && out.telegram) setTelegram(out.telegram);
      } catch {
        setError("Couldn't update Telegram notifications.");
      }
    },
    [telegram],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-white/10 bg-ink-950 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-white">Notifications</h2>
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
          {note && (
            <p className="mb-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-xs text-emerald-200">
              {note}
            </p>
          )}

          {/* Browser push */}
          <section className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">
                Browser
              </h3>
              {pushSupported && endpoint && (
                <button
                  type="button"
                  onClick={() => void disableWeb()}
                  disabled={busy}
                  className="text-[11px] text-rose-300/80 underline decoration-dotted hover:text-rose-200 disabled:opacity-50"
                >
                  turn off
                </button>
              )}
            </div>
            {pushSupported ? (
              <div className="space-y-1.5">
                {CATEGORIES.map((c) => (
                  <label
                    key={c.key}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/80"
                  >
                    <span>{c.label}</span>
                    <input
                      type="checkbox"
                      checked={web.includes(c.key)}
                      disabled={busy}
                      onChange={() => toggleWeb(c.key)}
                      className="h-4 w-4 accent-amber-400"
                    />
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-white/40">
                Browser notifications aren&apos;t available here.
              </p>
            )}
          </section>

          {/* Telegram */}
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/50">
              Telegram DM
            </h3>
            <div className="space-y-1.5">
              {CATEGORIES.map((c) => (
                <label
                  key={c.key}
                  className="flex cursor-pointer items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white/80"
                >
                  <span>{c.label}</span>
                  <input
                    type="checkbox"
                    checked={telegram.includes(c.key)}
                    onChange={() => void toggleTelegram(c.key)}
                    className="h-4 w-4 accent-amber-400"
                  />
                </label>
              ))}
            </div>
            <p className="mt-2 text-[11px] text-white/40">
              You must have started the community bot on Telegram to receive DMs.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
