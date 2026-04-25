/**
 * Admin authentication — credentials are stored ONLY in environment variables,
 * never in the database.
 *
 * Login flow:
 *  1. User submits plain-text password via the login form.
 *  2. Server reads ADMIN_PASSWORD_HASH from process.env (Replit secret).
 *  3. bcrypt.compare(plainText, hash) runs entirely in memory.
 *  4. The plain-text password is a local variable — it is discarded when
 *     the function returns and never written to any storage.
 *  5. On success a short-lived JWT cookie is set; no session is stored server-side.
 */
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const COOKIE_NAME = "rg_admin";

function jwtSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET must be set (min 16 chars).");
  }
  return new TextEncoder().encode(s);
}

/**
 * Verify credentials purely from environment — no DB reads or writes.
 * The plain-text password exists only as a function argument and is
 * garbage-collected after this call returns.
 */
export async function verifyCredentials(
  username: string,
  password: string
): Promise<boolean> {
  const expectedUser = (process.env.ADMIN_USERNAME || "admin").trim();
  const hash = (process.env.ADMIN_PASSWORD_HASH || "").trim();

  if (!hash) {
    console.error("[auth] ADMIN_PASSWORD_HASH is not set — login disabled.");
    return false;
  }
  if (username.trim() !== expectedUser) return false;

  // bcrypt.compare only returns true if the hash matches; false otherwise.
  // The plaintext 'password' arg is local-scope only.
  const ok = await bcrypt.compare(password, hash);
  return ok;
}

export async function createSession(username: string): Promise<void> {
  const token = await new SignJWT({ u: username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(jwtSecret());
  cookies().set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSession(): Promise<void> {
  cookies().delete(COOKIE_NAME);
}

export async function readSession(): Promise<{ username: string } | null> {
  const c = cookies().get(COOKIE_NAME);
  if (!c) return null;
  try {
    const { payload } = await jwtVerify(c.value, jwtSecret());
    return { username: String(payload.u) };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<{ username: string }> {
  const s = await readSession();
  if (!s) throw new Error("UNAUTHORIZED");
  return s;
}
