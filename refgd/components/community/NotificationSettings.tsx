"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Per-category notification opt-in for signed-in members. This community only
 * runs inside the Telegram Mini App, so the sole channel is a Telegram DM from
 * the community bot. Categories: Testimonials, BUY4U, Announcements, Chat.
 */

const CATEGORIES: { key: string; label: string }[] = [
  { key: "testimonials", label: "Testimonials" },
  { key: "buy4u", label: "BUY4U" },
  { key: "announcements", label: "Announcements" },
  { key: "chat", label: "Chat" },
];

interface NotifState {
  member: { tid: string; admin: boolean } | null;
  telegram: string[];
}

export default function NotificationSettings({
  onClose,
}: {
  onClose: () => void;
}) {
  const [telegram, setTelegram] = useState<string[]>([]);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/community/notifications", {
        cache: "no-store",
      });
      const d = (await res.json()) as NotifState;
      setTelegram(d.telegram ?? []);
    } catch {
      setError("Couldn't load notification settings.");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

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
