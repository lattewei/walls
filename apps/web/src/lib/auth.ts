import { apiFetch } from "./api";

const TOKEN_KEY = "walls_token";
const USER_KEY = "walls_user";

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

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(TOKEN_KEY, session.access_token);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
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
}
