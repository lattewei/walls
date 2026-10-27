"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { login, register } from "@/lib/auth";
import { safeNext } from "@/lib/safe-next";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = safeNext(search.get("next"));
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
      router.push(nextPath);
      router.refresh();
    } catch (err) {
      setError(
        isApiRequestError(err)
          ? err.message
          : err instanceof Error && err.message
            ? err.message
            : "Could not continue. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const title = mode === "login" ? "Log in" : "Create account";
  const submit = mode === "login" ? "Log in" : "Create account";

  return (
    <div className="auth">
      <Link href="/app" className="auth__back">
        Back
      </Link>
      <form onSubmit={onSubmit}>
        <h1>{title}</h1>
        <p className="hint">Handle and password. No email.</p>

        <label className="field">
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
          <label className="field">
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

        <label className="field">
          <span>Password</span>
          <input
            name="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={8}
            maxLength={72}
          />
        </label>

        {error ? <p className="note note--err">{error}</p> : null}

        <button type="submit" className="btn" disabled={busy}>
          {busy ? "…" : submit}
        </button>

        <p className="alt">
          {mode === "login" ? (
            <>
              No account?{" "}
              <Link href={`/register?next=${encodeURIComponent(nextPath)}`}>Create one</Link>
            </>
          ) : (
            <>
              Already have one?{" "}
              <Link href={`/login?next=${encodeURIComponent(nextPath)}`}>Log in</Link>
            </>
          )}
        </p>
      </form>
    </div>
  );
}
