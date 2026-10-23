"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { login, register } from "@/lib/auth";

type Mode = "login" | "register";

export function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search.get("next") || "/app";
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "login") {
        await login(handle.trim(), password);
      } else {
        await register(handle.trim(), password, displayName.trim() || undefined);
      }
      router.push(nextPath.startsWith("/") ? nextPath : "/app");
      router.refresh();
    } catch (err) {
      if (isApiRequestError(err)) {
        setError(err.message);
      } else if (err instanceof Error && err.message) {
        setError(err.message);
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Log in" : "Create account";
  const submit = mode === "login" ? "Log in" : "Create account";
  const alt =
    mode === "login" ? (
      <>
        No account? <Link href="/register">Create one</Link>
      </>
    ) : (
      <>
        Already have one? <Link href="/login">Log in</Link>
      </>
    );

  return (
    <div className="auth">
      <Link href="/app" className="auth__back">
        Back
      </Link>
      <form className="auth__card" onSubmit={onSubmit}>
        <h1>{title}</h1>
        <p className="auth__hint">Handle + password. No email.</p>

        <label className="auth__field">
          <span>Handle</span>
          <input
            name="handle"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder="kay_beats"
            required
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9_]+"
          />
        </label>

        {mode === "register" ? (
          <label className="auth__field">
            <span>Display name</span>
            <input
              name="display_name"
              autoComplete="nickname"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Kay"
            />
          </label>
        ) : null}

        <label className="auth__field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
          />
        </label>

        {error ? <p className="auth__error">{error}</p> : null}

        <button type="submit" className="auth__submit" disabled={busy}>
          {busy ? "…" : submit}
        </button>

        <p className="auth__alt">{alt}</p>
      </form>
    </div>
  );
}
