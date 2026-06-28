"use client";
import { useState, type FormEvent } from "react";
import { INFO_BODY_PROSE } from "./InfoModal";

// Decode a base64 string to bytes in the browser.
function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Derive the AES key from the password and decrypt the instructions. Throws on
 * a wrong password (AES-GCM auth tag mismatch) — that is the gate. The plaintext
 * NEVER exists in the page/source; it is reconstructed here only on success.
 */
async function decryptInstructions(password: string): Promise<string> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new Error("Web Crypto unavailable");
  // Lazy-load the (large) encrypted payload only when the visitor actually
  // unlocks, so the ciphertext + embedded screenshot stay out of the
  // store-list bundle that every visitor downloads.
  const { CRYPTO_INSTRUCTIONS_ENC: ENC } = await import("@/data/crypto-instructions");
  const salt = b64ToBytes(ENC.salt);
  const iv = b64ToBytes(ENC.iv);
  const data = b64ToBytes(ENC.ciphertext); // ciphertext || 16-byte auth tag
  const baseKey = await subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: ENC.iterations, hash: "SHA-256" },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"],
  );
  const plain = await subtle.decrypt({ name: "AES-GCM", iv }, key, data);
  return new TextDecoder().decode(plain);
}

/**
 * Password gate for the crypto step-by-step instructions. The instructions are
 * shipped only as AES-256-GCM ciphertext (see data/crypto-instructions.ts), so
 * inspecting the source / DOM never reveals them — there is no plaintext to
 * "un-blur". A correct password decrypts the block client-side and renders it.
 */
export default function CryptoInstructionsGate() {
  const [stage, setStage] = useState<"locked" | "prompt" | "unlocked">("locked");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [html, setHtml] = useState("");

  const onUnlock = async (e: FormEvent) => {
    e.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError("");
    try {
      const out = await decryptInstructions(password);
      setHtml(out);
      setStage("unlocked");
    } catch {
      setError("Incorrect password — double-check with the admin on Telegram.");
    } finally {
      setBusy(false);
    }
  };

  if (stage === "unlocked") {
    return (
      <div className={INFO_BODY_PROSE} dangerouslySetInnerHTML={{ __html: html }} />
    );
  }

  return (
    <div className="px-5 pb-5 pt-1">
      {stage === "locked" ? (
        <button
          type="button"
          onClick={() => setStage("prompt")}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-amber-300/40 bg-amber-400/15 px-4 py-3 text-sm font-bold uppercase tracking-wide text-amber-200 transition hover:bg-amber-400/25"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          Reveal Instructions
        </button>
      ) : (
        <form
          onSubmit={onUnlock}
          className="rounded-xl border border-amber-300/30 bg-amber-400/5 p-4"
          data-lenis-prevent
        >
          <p className="text-sm font-semibold text-amber-200">
            ⚠️ These step-by-step instructions are locked.
          </p>
          <p className="mt-1 text-sm leading-relaxed text-white/75">
            Message the admin on Telegram{" "}
            <a
              href="https://t.me/refundgod"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-amber-300 underline underline-offset-2 hover:text-amber-200"
            >
              @refundgod
            </a>{" "}
            to get the password, then enter it below to unlock the full guide.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              autoFocus
              autoComplete="off"
              data-lenis-prevent
              className="min-w-0 flex-1 rounded-lg border border-white/15 bg-ink-900 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none ring-amber-300/40 focus:ring-2"
            />
            <button
              type="submit"
              disabled={busy || !password}
              className="shrink-0 rounded-lg border border-emerald-300/40 bg-emerald-400/15 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-400/25 disabled:opacity-50"
            >
              {busy ? "Unlocking…" : "Unlock"}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm font-medium text-rose-300">{error}</p>
          )}
        </form>
      )}
    </div>
  );
}
