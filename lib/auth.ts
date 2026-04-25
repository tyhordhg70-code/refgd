import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db, withDb } from "./db";

const COOKIE_NAME = "rg_admin";

function secret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET must be set (min 16 chars). Edit .env");
  }
  return new TextEncoder().encode(s);
}

export async function ensureBootstrapAdmin(): Promise<void> {
  const username = process.env.ADMIN_USERNAME || "admin";
  const password = process.env.ADMIN_PASSWORD;
  if (!password) return;
  const existing = db().admins[username];
  if (existing) return;
  const hash = await bcrypt.hash(password, 12);
  withDb((d) => {
    d.admins[username] = {
      passwordHash: hash,
      createdAt: new Date().toISOString(),
    };
  });
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  await ensureBootstrapAdmin();
  const row = db().admins[username];
  if (!row) return false;
  return bcrypt.compare(password, row.passwordHash);
}

export async function createSession(username: string): Promise<void> {
  const token = await new SignJWT({ u: username })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
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
    const { payload } = await jwtVerify(c.value, secret());
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
