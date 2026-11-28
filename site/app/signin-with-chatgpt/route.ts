import { env } from "cloudflare:workers";
import { SESSION_COOKIE, makeSessionCookie } from "../chatgpt-auth";

type Env = { SITE_PASSWORD?: string; SESSION_SECRET?: string };

function safeReturn(value: string | null): string {
  return value && value.startsWith("/") && !value.startsWith("//") && !value.startsWith("/signin") ? value : "/";
}

function page(returnTo: string, error = "", status = 200) {
  const esc = (v: string) => v.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>دخول رِحلة</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F7F3EC;font-family:"IBM Plex Sans Arabic",Tahoma,sans-serif;color:#1F2A2E}
form{background:#fff;border:1px solid #E6DFD3;border-radius:18px;padding:28px;width:min(360px,90vw);display:grid;gap:14px}
h1{margin:0;font-size:26px;color:#0F5C5A}label{display:grid;gap:6px;font-size:14px;color:#55625F}
input{min-height:46px;border:1px solid #D9D1C3;border-radius:10px;padding:0 12px;font:inherit;font-size:16px}
button{min-height:46px;border:0;border-radius:12px;background:#A9531A;color:#fff;font:inherit;font-weight:700;font-size:16px}
.e{color:#B42318;font-size:14px;margin:0}</style></head><body>
<form method="post"><h1>رِحلة</h1><input type="hidden" name="return_to" value="${esc(returnTo)}">
<label>كلمة المرور<input type="password" name="password" autocomplete="current-password" required autofocus></label>
${error ? `<p class="e" role="alert">${esc(error)}</p>` : ""}<button type="submit">دخول</button></form></body></html>`;
  return new Response(html, { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

export function GET(request: Request) {
  return page(safeReturn(new URL(request.url).searchParams.get("return_to")));
}

export async function POST(request: Request) {
  const config = env as Env;
  const url = new URL(request.url);
  const origin = request.headers.get("origin");
  if (origin && origin !== url.origin) return new Response("forbidden", { status: 403 });
  const form = await request.formData();
  const returnTo = safeReturn(String(form.get("return_to") || "/"));
  const password = String(form.get("password") || "");
  if (!config.SITE_PASSWORD || !config.SESSION_SECRET) return page(returnTo, "الدخول غير مهيأ بعد.", 503);
  const a = new TextEncoder().encode(password), b = new TextEncoder().encode(config.SITE_PASSWORD);
  let diff = a.length ^ b.length;
  for (let i = 0; i < Math.max(a.length, b.length); i++) diff |= (a[i] ?? 0) ^ (b[i] ?? 0);
  if (diff !== 0) {
    await new Promise((r) => setTimeout(r, 1200));
    return page(returnTo, "كلمة المرور غير صحيحة.", 401);
  }
  const cookie = await makeSessionCookie(config.SESSION_SECRET);
  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL(returnTo, url.origin).toString(),
      "Set-Cookie": `${SESSION_COOKIE}=${cookie}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${180 * 86400}`,
    },
  });
}
