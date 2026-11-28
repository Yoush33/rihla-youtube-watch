import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "cloudflare:workers";

export type ChatGPTUser = {
  userId: string;
  displayName: string;
  email: string;
  fullName: string | null;
};

const SIGN_IN_PATH = "/signin-with-chatgpt";
const SIGN_OUT_PATH = "/signout-with-chatgpt";
const CALLBACK_PATH = "/callback";

// الدخول عبر Cloudflare Access: الموقع كله محمي، وCloudflare يرسل توكن موقّع
// في ترويسة Cf-Access-Jwt-Assertion. نتحقق من توقيعه وجمهوره وصلاحيته قبل ما نثق فيه.
const ACCESS_JWT_HEADER = "cf-access-jwt-assertion";
type AccessEnv = { ACCESS_TEAM_DOMAIN?: string; ACCESS_AUD?: string; SESSION_SECRET?: string; OWNER_EMAIL?: string };
type Jwk = JsonWebKey & { kid?: string };
let jwksCache: { at: number; keys: Jwk[] } | null = null;

function b64urlBytes(value: string): Uint8Array<ArrayBuffer> {
  const b64 = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function b64urlJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(b64urlBytes(value))) as T;
}

async function accessKeys(team: string, refresh = false): Promise<Jwk[]> {
  if (!refresh && jwksCache && Date.now() - jwksCache.at < 3600000) return jwksCache.keys;
  const response = await fetch(`https://${team}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("access_certs");
  const body = (await response.json()) as { keys?: Jwk[] };
  jwksCache = { at: Date.now(), keys: body.keys ?? [] };
  return jwksCache.keys;
}

async function verifyAccessToken(token: string, config: AccessEnv): Promise<{ sub: string; email: string; name?: string } | null> {
  const team = config.ACCESS_TEAM_DOMAIN?.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const audience = config.ACCESS_AUD;
  if (!team || !audience) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = b64urlJson<{ alg?: string; kid?: string }>(parts[0]);
  if (header.alg !== "RS256" || !header.kid) return null;
  let key = (await accessKeys(team)).find((k) => k.kid === header.kid);
  if (!key) key = (await accessKeys(team, true)).find((k) => k.kid === header.kid);
  if (!key) return null;
  const cryptoKey = await crypto.subtle.importKey("jwk", { kty: key.kty, n: key.n, e: key.e, alg: "RS256", ext: true }, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const valid = await crypto.subtle.verify("RSASSA-PKCS1-v1_5", cryptoKey, b64urlBytes(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!valid) return null;
  const claims = b64urlJson<{ aud?: string | string[]; exp?: number; nbf?: number; iss?: string; sub?: string; email?: string; name?: string }>(parts[1]);
  const now = Math.floor(Date.now() / 1000);
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
  if (!audiences.includes(audience)) return null;
  if (!claims.exp || claims.exp < now - 30) return null;
  if (claims.nbf && claims.nbf > now + 30) return null;
  if (claims.iss !== `https://${team}`) return null;
  if (!claims.email) return null;
  return { sub: claims.sub || claims.email, email: claims.email, name: claims.name };
}

// الدخول بكلمة مرور: كوكي موقّع بـ HMAC (اسم المالك + تاريخ الانتهاء).
export const SESSION_COOKIE = "rihla_session";
const enc = new TextEncoder();

async function hmac(secret: string, value: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(value)));
  let bin = "";
  for (const b of sig) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sameText(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function makeSessionCookie(secret: string, days = 180): Promise<string> {
  const payload = `owner.${Math.floor(Date.now() / 1000) + days * 86400}`;
  return `${payload}.${await hmac(secret, payload)}`;
}

export async function readSessionCookie(value: string | undefined, secret: string | undefined): Promise<boolean> {
  if (!value || !secret) return false;
  const parts = value.split(".");
  if (parts.length !== 3 || parts[0] !== "owner") return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Date.now() / 1000) return false;
  return sameText(parts[2], await hmac(secret, `${parts[0]}.${parts[1]}`));
}

export async function getChatGPTUser(): Promise<ChatGPTUser | null> {
  const config = env as AccessEnv;
  const owner = (config.OWNER_EMAIL || "owner@rihla").toLowerCase();
  const asOwner = (name: string | null = null): ChatGPTUser => ({ userId: owner, displayName: name ?? owner, email: owner, fullName: name });

  const token = (await headers()).get(ACCESS_JWT_HEADER);
  if (token) {
    try {
      const claims = await verifyAccessToken(token, config);
      if (claims) {
        const email = claims.email.toLowerCase();
        return { userId: email, displayName: claims.name ?? email, email, fullName: claims.name ?? null };
      }
    } catch {
      /* نكمل بالكوكي */
    }
  }

  const cookie = (await cookies()).get(SESSION_COOKIE)?.value;
  if (await readSessionCookie(cookie, config.SESSION_SECRET)) return asOwner();
  return null;
}

export async function requireChatGPTUser(
  returnTo: string,
): Promise<ChatGPTUser> {
  const user = await getChatGPTUser();
  if (user) return user;

  redirect(chatGPTSignInPath(returnTo));
}

export function chatGPTSignInPath(returnTo: string): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_IN_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

export function chatGPTSignOutPath(returnTo = "/"): string {
  const safeReturnTo = safeRelativeReturnPath(returnTo);
  return `${SIGN_OUT_PATH}?return_to=${encodeURIComponent(safeReturnTo)}`;
}

function safeRelativeReturnPath(value: string): string {
  if (!value.startsWith("/") || value.startsWith("//")) return "/";

  let url: URL;
  try {
    url = new URL(value, "https://app.local");
  } catch {
    return "/";
  }
  if (url.origin !== "https://app.local") return "/";
  if (isReservedAuthPath(url.pathname)) return "/";

  return `${url.pathname}${url.search}${url.hash}`;
}

function isReservedAuthPath(pathname: string): boolean {
  return (
    pathname === SIGN_IN_PATH ||
    pathname === SIGN_OUT_PATH ||
    pathname === CALLBACK_PATH
  );
}
