import { apiFetch } from "./api";

const TOKEN_KEY = "walls_token";
const USER_KEY = "walls_user";
const EXP_KEY = "walls_expires";

export type AuthUser = {
  id: string;
  handle: string;
  display_name: string;
  role: string;
  created_at: string;
};

export type AuthSession = {
  user: AuthUser;
  access_token: string;
  token_type: string;
  expires_at: string;
};

export function sessionExpired(): boolean {
  if (typeof window === "undefined") return true;
  const exp = localStorage.getItem(EXP_KEY);
  if (!exp) return true;
  const at = Date.parse(exp);
  if (Number.isNaN(at)) return true;
  return Date.now() >= at - 5_000;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  if (sessionExpired()) {
    clearSession();
    return null;
  }
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw || sessionExpired()) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(TOKEN_KEY, session.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  localStorage.setItem(EXP_KEY, session.expires_at);
  emitSession();
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(EXP_KEY);
  emitSession();
}

export function peekToken(): string | null {
  if (typeof window === "undefined") return null;
  if (sessionExpired()) return null;
  return localStorage.getItem(TOKEN_KEY);
}

let cachedUserRaw: string | null | undefined;
let cachedUser: AuthUser | null = null;

export function peekUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  if (sessionExpired()) return null;
  const raw = localStorage.getItem(USER_KEY);
  if (raw === cachedUserRaw) return cachedUser;
  cachedUserRaw = raw;
  if (!raw) {
    cachedUser = null;
    return null;
  }
  try {
    cachedUser = JSON.parse(raw) as AuthUser;
    return cachedUser;
  } catch {
    cachedUser = null;
    return null;
  }
}

function emitSession() {
  cachedUserRaw = undefined;
  cachedUser = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("walls:session"));
  }
}

export function subscribeSession(onStoreChange: () => void) {
  window.addEventListener("walls:session", onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener("walls:session", onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

export async function login(handle: string, password: string) {
  const session = await apiFetch<AuthSession>("/api/v1/auth/login", {
    method: "POST",
    body: JSON.stringify({
      handle: handle.trim().toLowerCase(),
      password,
    }),
  });
  saveSession(session);
  return session;
}

export async function register(handle: string, password: string, displayName?: string) {
  const body: Record<string, string> = {
    handle: handle.trim().toLowerCase(),
    password,
  };
  const name = displayName?.trim();
  if (name) body.display_name = name;

  const session = await apiFetch<AuthSession>("/api/v1/auth/register", {
    method: "POST",
    body: JSON.stringify(body),
  });
  saveSession(session);
  return session;
}

export async function logout() {
  const token = getToken();
  try {
    if (token) {
      await apiFetch("/api/v1/auth/logout", { method: "POST", token });
    }
  } finally {
    clearSession();
  }
}

export function updateStoredUser(partial: Partial<AuthUser>) {
  const current = getStoredUser();
  if (!current) return;
  localStorage.setItem(USER_KEY, JSON.stringify({ ...current, ...partial }));
  emitSession();
}
