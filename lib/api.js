import { getToken, clearSession } from "./auth";

/**
 * When NEXT_PUBLIC_BACKEND_URL is set, returns absolute URL so the browser can call
 * FastAPI directly (needed for smooth SSE; Next.js dev rewrites may buffer streams).
 * Otherwise returns the path unchanged (same-origin rewrites).
 */
export function publicApiUrl(path) {
  const base = (process.env.NEXT_PUBLIC_BACKEND_URL || "").replace(/\/$/, "");
  const p = path.startsWith("/") ? path : `/${path}`;
  return base ? `${base}${p}` : p;
}

/**
 * Fetch same-origin paths that Next rewrites to FastAPI (see next.config.mjs).
 * Accepts relative paths or full URLs from publicApiUrl().
 */
export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const token = getToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  const res = await fetch(path, { ...options, headers });
  if (res.status === 401) {
    clearSession();
  }
  return res;
}

/** WebSocket base (cannot use Next rewrites). */
export function getWsBase() {
  const env = process.env.NEXT_PUBLIC_WS_URL;
  if (env) return env.replace(/\/$/, "");
  const back = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (back) return back.replace(/^http/, "ws").replace(/\/$/, "");
  return "ws://127.0.0.1:8000";
}
