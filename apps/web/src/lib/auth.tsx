"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { api } from "./api";
import type { PublicContacts, PublicUser } from "./types";

const TOKEN_KEY = "openstudio_token";

type AuthState = {
  user: PublicUser | null;
  contacts: PublicContacts | null;
  token: string | null;
  loading: boolean;
  login: (handle: string, password: string) => Promise<void>;
  register: (handle: string, password: string, displayName?: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
  setSession: (token: string, user: PublicUser, contacts: PublicContacts) => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<PublicUser | null>(null);
  const [contacts, setContacts] = useState<PublicContacts | null>(null);
  const [loading, setLoading] = useState(true);

  const setSession = useCallback(
    (t: string, u: PublicUser, c: PublicContacts) => {
      setToken(t);
      setUser(u);
      setContacts(c);
      if (typeof window !== "undefined") {
        localStorage.setItem(TOKEN_KEY, t);
      }
    },
    [],
  );

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    setContacts(null);
    if (typeof window !== "undefined") {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, []);

  const refresh = useCallback(async () => {
    const t =
      typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
    if (!t) {
      setLoading(false);
      return;
    }
    try {
      const res = await api.me(t);
      setToken(t);
      setUser(res.user);
      setContacts(res.contacts);
    } catch {
      logout();
    } finally {
      setLoading(false);
    }
  }, [logout]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (handle: string, password: string) => {
      const res = await api.login({ handle, password });
      setSession(res.access_token, res.user, res.contacts);
    },
    [setSession],
  );

  const register = useCallback(
    async (handle: string, password: string, displayName?: string) => {
      const res = await api.register({
        handle,
        password,
        display_name: displayName,
      });
      setSession(res.access_token, res.user, res.contacts);
    },
    [setSession],
  );

  const value = useMemo(
    () => ({
      user,
      contacts,
      token,
      loading,
      login,
      register,
      logout,
      refresh,
      setSession,
    }),
    [user, contacts, token, loading, login, register, logout, refresh, setSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
