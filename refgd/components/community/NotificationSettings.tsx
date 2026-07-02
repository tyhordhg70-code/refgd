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
      className="tg-modal-backdrop"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div className="tg-modal" onClick={(e) => e.stopPropagation()}>
        <div className="tg-modal-header">
          <h3>Notifications</h3>
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
          {note && <p className="tg-note is-good">{note}</p>}

          {/* Browser push */}
          <div className="tg-section-head">
            <h4 className="tg-section-title">Browser</h4>
            {pushSupported && endpoint && (
              <button
                type="button"
                className="tg-link-btn"
                onClick={() => void disableWeb()}
                disabled={busy}
              >
                Turn off
              </button>
            )}
          </div>
          {pushSupported ? (
            CATEGORIES.map((c) => (
              <button
                key={c.key}
                type="button"
                className="tg-row"
                disabled={busy}
                onClick={() => toggleWeb(c.key)}
              >
                <span className="tg-row-label">{c.label}</span>
                <span
                  className={`tg-toggle${web.includes(c.key) ? " is-on" : ""}`}
                />
              </button>
            ))
          ) : (
            <p className="tg-note">
              Browser notifications aren&apos;t available here.
            </p>
          )}

          {/* Telegram */}
          <h4 className="tg-section-title">Telegram DM</h4>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              className="tg-row"
              onClick={() => void toggleTelegram(c.key)}
            >
              <span className="tg-row-label">{c.label}</span>
              <span
                className={`tg-toggle${
                  telegram.includes(c.key) ? " is-on" : ""
                }`}
              />
            </button>
          ))}
          <p className="tg-note">
            You must have started the community bot on Telegram to receive DMs.
          </p>
        </div>
      </div>
    </div>
  );
}
