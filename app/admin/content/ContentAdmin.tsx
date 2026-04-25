"use client";
import Link from "next/link";
import { useState } from "react";
import type { ContentBlock } from "@/lib/types";

export default function ContentAdmin({ initial }: { initial: ContentBlock[] }) {
  const [blocks, setBlocks] = useState<ContentBlock[]>(initial);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function update(id: string, value: string) {
    setBlocks((curr) => curr.map((b) => (b.id === id ? { ...b, value } : b)));
  }

  async function save() {
    setBusy(true);
    setMsg(null);
    try {
      const r = await fetch("/api/admin/content", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ blocks: blocks.map((b) => ({ id: b.id, value: b.value })) }),
      });
      if (!r.ok) throw new Error(`Save failed (${r.status})`);
      setMsg("Saved!");
    } catch (err) {
      setMsg((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/admin/dashboard" className="text-sm text-white/55 hover:text-white">
            ← Back to dashboard
          </Link>
          <h1 className="heading-display mt-1 text-3xl font-bold text-white">Site content</h1>
        </div>
        <button onClick={save} disabled={busy} className="btn-primary text-sm">
          {busy ? "Saving…" : "Save changes"}
        </button>
      </div>
      {msg && <p className="mb-4 text-sm text-amber-300">{msg}</p>}
      <div className="space-y-3">
        {blocks.map((b) => (
          <div key={b.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
            <label className="text-xs font-semibold uppercase tracking-wider text-amber-300/85">{b.id}</label>
            <textarea
              value={b.value}
              onChange={(e) => update(b.id, e.target.value)}
              rows={Math.min(4, Math.max(1, Math.ceil(b.value.length / 80)))}
              className="mt-1 w-full rounded-lg border border-white/10 bg-ink-950/50 px-3 py-2 text-sm text-white"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
