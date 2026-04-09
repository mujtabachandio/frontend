/**
 * JWT for proxied FastAPI routes (Authorization: Bearer).
 * Login response stores access_token here (sessionStorage).
 */
const TOKEN_KEY = "voice_chat_access_token";

export function getToken() {
  if (typeof window === "undefined") return null;
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (typeof window === "undefined") return;
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

export function clearSession() {
  setToken(null);
}
