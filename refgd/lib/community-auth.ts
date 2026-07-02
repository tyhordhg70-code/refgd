/**
 * Community MEMBER authentication — completely separate from the site-admin
 * auth in lib/auth.ts. Members sign in with their Telegram identity so the
 * group chat can show a real name + photo (NEVER an @username, per owner) and
 * tag admins. There is no password and no server-side session store: a signed
 * `rg_member` JWT cookie is the whole session, exactly like `rg_admin`.
 *
 * TWO trust roots, both cryptographically verified against COMMUNITY_BOT_TOKEN:
 *
 *  1. Telegram Mini App `initData` (the community opened INSIDE Telegram via
 *     the bot). Secret key = HMAC_SHA256(key="WebAppData", msg=bot_token);
 *     the payload `hash` = HMAC_SHA256(key=secret, msg=data_check_string).
 *
 *  2. Telegram Login Widget (the community opened on the website, user taps
 *     "Log in with Telegram"). Secret key = SHA256(bot_token) (raw digest);
 *     `hash` = HMAC_SHA256(key=secret, msg=data_check_string).
 *
 * Both include an `auth_date`; we reject anything older than AUTH_MAX_AGE_SEC
 * to stop a captured payload from being replayed later. `is_admin` is NEVER
 * trusted from the client — it is resolved server-side from
 * COMMUNITY_ADMIN_TG_IDS at both mint AND read time.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import {
  isCommunityAdmin,
  communityBotToken,
  communityBotTokenInfo,
} from "@/lib/community-bot";

const COOKIE_NAME = "rg_member";
const SESSION_TTL_SEC = 60 * 60 * 24 * 7; // 7 days
/** How fresh a Telegram auth payload must be to be accepted (replay guard). */
const AUTH_MAX_AGE_SEC = 3600; // 1 hour
const CLOCK_SKEW_SEC = 60;

export interface CommunityMember {
  /** Telegram numeric user id, as a string. */
  tid: string;
  /** Display name (first + last). Never an @username. */
  name: string;
  /** Telegram profile photo URL, or null. */
  photo: string | null;
  /** Resolved server-side from COMMUNITY_ADMIN_TG_IDS — never from the client. */
  admin: boolean;
}

interface TgUser {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
}

function jwtSecret(): Uint8Array {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 16) {
    throw new Error("SESSION_SECRET must be set (min 16 chars).");
  }
  return new TextEncoder().encode(s);
}

/** Constant-time compare of two hex strings. */
function timingEqualHex(a: string, b: string): boolean {
  if (typeof a !== "string" || typeof b !== "string") return false;
  if (a.length !== b.length || a.length === 0) return false;
  let ab: Buffer;
  let bb: Buffer;
  try {
    ab = Buffer.from(a, "hex");
    bb = Buffer.from(b, "hex");
  } catch {
    return false;
  }
  if (ab.length !== bb.length || ab.length === 0) return false;
  return timingSafeEqual(ab, bb);
}

function authDateFresh(authDate: number): boolean {
  if (!Number.isFinite(authDate) || authDate <= 0) return false;
  const now = Math.floor(Date.now() / 1000);
  const age = now - authDate;
  return age >= -CLOCK_SKEW_SEC && age <= AUTH_MAX_AGE_SEC;
}

function toMember(u: TgUser | null | undefined): CommunityMember | null {
  if (!u || u.id === undefined || u.id === null || u.id === "") return null;
  const tid = String(u.id);
  const name =
    [u.first_name, u.last_name]
      .filter((p): p is string => typeof p === "string" && p.length > 0)
      .join(" ")
      .trim() || `User ${tid}`;
  const photo =
    typeof u.photo_url === "string" && u.photo_url.length > 0 ? u.photo_url : null;
  return { tid, name, photo, admin: isCommunityAdmin(tid) };
}

/**
 * Parse a raw `key=value&...` string with proper percent-decoding of values.
 * We do NOT use URLSearchParams because it decodes `+` as a space, which would
 * corrupt the data-check-string and break the hash for any value containing a
 * literal `+`.
 */
function parseRaw(raw: string): Map<string, string> {
  const map = new Map<string, string>();
  for (const part of raw.split("&")) {
    if (!part) continue;
    const i = part.indexOf("=");
    if (i < 0) continue;
    const k = part.slice(0, i);
    const v = part.slice(i + 1);
    try {
      map.set(k, decodeURIComponent(v));
    } catch {
      map.set(k, v);
    }
  }
  return map;
}

function dataCheckString(entries: Map<string, string>, skip: Set<string>): string {
  return [...entries.entries()]
    .filter(([k]) => !skip.has(k))
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .map(([k, v]) => `${k}=${v}`)
    .join("\n");
}

/** Why a Mini App initData verification failed (for diagnostics). */
export type MiniAppAuthFailReason =
  | "no_token"
  | "no_hash"
  | "bad_signature"
  | "stale_auth_date"
  | "no_user";

/**
 * Non-sensitive diagnostics returned alongside a verification result so a
 * failure can be pinpointed from the client without exposing any secret. NEVER
 * contains token material, the payload hash, or user PII.
 */
export interface MiniAppAuthDebug {
  /** Field names present in initData, sorted (all standard Telegram keys). */
  fields: string[];
  /** Whether Telegram included the newer Ed25519 `signature` field. */
  hasSignature: boolean;
  /** now - auth_date, in seconds (null if auth_date missing/unparseable). */
  authDateAgeSec: number | null;
  /** Length of the trimmed COMMUNITY_BOT_TOKEN (0 = not set). No material. */
  tokenLen: number;
  /** True if the env var had surrounding whitespace — a common silent cause. */
  tokenHadWhitespace: boolean;
}

/**
 * Verify Telegram Mini App `initData`, reporting WHY it failed so the auth
 * route can surface an actionable message instead of a silent 401.
 */
export function verifyMiniAppInitDataDetailed(initData: string): {
  member: CommunityMember | null;
  reason: MiniAppAuthFailReason | null;
  debug?: MiniAppAuthDebug;
} {
  const token = communityBotToken();
  if (!token) return { member: null, reason: "no_token" };
  if (typeof initData !== "string" || !initData)
    return { member: null, reason: "no_hash" };

  const entries = parseRaw(initData);
  const info = communityBotTokenInfo();
  const authDateNum = Number(entries.get("auth_date"));
  const debug: MiniAppAuthDebug = {
    fields: [...entries.keys()].sort(),
    hasSignature: entries.has("signature"),
    authDateAgeSec:
      entries.has("auth_date") && Number.isFinite(authDateNum)
        ? Math.floor(Date.now() / 1000) - authDateNum
        : null,
    tokenLen: info.len,
    tokenHadWhitespace: info.hadWhitespace,
  };

  const hash = entries.get("hash");
  if (!hash) return { member: null, reason: "no_hash", debug };

  // `signature` (Ed25519 third-party validation) is not part of the HMAC hash.
  const dcs = dataCheckString(entries, new Set(["hash", "signature"]));
  const secret = createHmac("sha256", "WebAppData").update(token).digest();
  const computed = createHmac("sha256", secret).update(dcs).digest("hex");
  if (!timingEqualHex(computed, hash))
    return { member: null, reason: "bad_signature", debug };

  if (!authDateFresh(authDateNum))
    return { member: null, reason: "stale_auth_date", debug };

  const userRaw = entries.get("user");
  if (!userRaw) return { member: null, reason: "no_user", debug };
  let u: TgUser;
  try {
    u = JSON.parse(userRaw) as TgUser;
  } catch {
    return { member: null, reason: "no_user", debug };
  }
  const member = toMember(u);
  return member
    ? { member, reason: null, debug }
    : { member: null, reason: "no_user", debug };
}

/**
 * Verify Telegram Mini App `initData`. Returns the member on success, else
 * null (bad signature, stale auth_date, or missing user).
 */
export function verifyMiniAppInitData(initData: string): CommunityMember | null {
  return verifyMiniAppInitDataDetailed(initData).member;
}

/** Audience claim that isolates member tokens from the admin (`rg_admin`) JWT. */
const MEMBER_AUD = "rg_member";

/** Mint the `rg_member` session cookie for a verified member. */
export async function createMemberSession(m: CommunityMember): Promise<void> {
  const token = await new SignJWT({ tid: m.tid, name: m.name, photo: m.photo ?? "" })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(MEMBER_AUD)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(jwtSecret());
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SEC,
  });
}

/**
 * Read the current member session, or null. `admin` is re-resolved from
 * COMMUNITY_ADMIN_TG_IDS on every read so admin grants/revokes take effect
 * immediately without forcing a re-login.
 */
export async function readMemberSession(): Promise<CommunityMember | null> {
  const store = await cookies();
  const c = store.get(COOKIE_NAME);
  if (!c) return null;
  try {
    const { payload } = await jwtVerify(c.value, jwtSecret(), {
      audience: MEMBER_AUD,
    });
    const tid = String(payload.tid ?? "");
    if (!tid) return null;
    const photo = payload.photo ? String(payload.photo) : null;
    return {
      tid,
      name: String(payload.name ?? `User ${tid}`),
      photo,
      admin: isCommunityAdmin(tid),
    };
  } catch {
    return null;
  }
}

export async function clearMemberSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function requireMemberSession(): Promise<CommunityMember> {
  const m = await readMemberSession();
  if (!m) throw new Error("UNAUTHORIZED");
  return m;
}
