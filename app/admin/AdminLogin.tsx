"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const r = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error || "Login failed");
      }
      router.push("/admin/dashboard");
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-900/80 p-8 backdrop-blur"
    >
      <h1 className="heading-display text-2xl font-bold text-white">Admin sign-in</h1>
      <p className="mt-1 text-sm text-white/55">
        Use your bootstrapped credentials. Default username is{" "}
        <code className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-amber-200">admin</code>{" "}
        (unless overridden via <code className="font-mono text-white/70">ADMIN_USERNAME</code>).
      </p>
      <div className="mt-6 space-y-3">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-white/55">Username</label>
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            placeholder="admin"
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-amber-400/60 focus:outline-none"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-white/55">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
            className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white focus:border-amber-400/60 focus:outline-none"
          />
        </div>
      </div>
      {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      <button type="submit" disabled={busy} className="btn-primary mt-6 w-full !justify-center">
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
