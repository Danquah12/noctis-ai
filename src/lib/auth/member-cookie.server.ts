import { createHmac, timingSafeEqual } from "node:crypto";

export const MEMBER_COOKIE = "vibetok_member";
const SECRET =
  (typeof process !== "undefined" && process.env.BETTER_AUTH_SECRET?.trim()) ||
  "vibetok-meet-session-7f3c9a1e6b2048d5a0c1e2f3948576ab";

export type MemberCookiePayload = {
  id: string;
  email: string;
  name: string;
  iat: number;
};

function signData(dataB64: string): string {
  return createHmac("sha256", SECRET).update(dataB64).digest("base64url");
}

/** Sign the fallback member payload for use in cookies. */
export function signMemberCookie(user: { id: string; email: string; name?: string | null }): string {
  const payload: MemberCookiePayload = {
    id: user.id,
    email: user.email.trim().toLowerCase(),
    name: (user.name || user.email.split("@")[0] || "Member").trim(),
    iat: Date.now(),
  };
  const dataB64 = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = signData(dataB64);
  return `${dataB64}.${sig}`;
}

export function buildMemberSetCookie(user: { id: string; email: string; name?: string | null }): string {
  const maxAge = 60 * 60 * 24 * 30; // 30 days
  return `${MEMBER_COOKIE}=${signMemberCookie(user)}; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=${maxAge}`;
}

export function buildMemberClearCookie(): string {
  return `${MEMBER_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=None; Partitioned; Max-Age=0`;
}

export function buildLegacyMemberClearCookie(): string {
  return `${MEMBER_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readMemberCookieFromHeaders(headers: Headers): MemberCookiePayload | null {
  const rawCookie = headers.get("cookie") || "";
  if (!rawCookie) return null;
  const parts = rawCookie.split(";");
  let token = "";
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(`${MEMBER_COOKIE}=`)) {
      token = trimmed.slice(MEMBER_COOKIE.length + 1).trim();
      break;
    }
  }
  if (!token) return null;
  const dot = token.indexOf(".");
  if (dot <= 0) return null;
  const dataB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expectedSig = signData(dataB64);
  try {
    const a = Buffer.from(sig, "utf8");
    const b = Buffer.from(expectedSig, "utf8");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const parsed = JSON.parse(Buffer.from(dataB64, "base64url").toString("utf8")) as Partial<MemberCookiePayload>;
    if (!parsed || typeof parsed.id !== "string" || typeof parsed.email !== "string") return null;
    return {
      id: parsed.id,
      email: parsed.email,
      name: typeof parsed.name === "string" && parsed.name ? parsed.name : parsed.email.split("@")[0] || "Member",
      iat: typeof parsed.iat === "number" ? parsed.iat : Date.now(),
    };
  } catch {
    return null;
  }
}
