"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Sleeve } from "@/components/sleeve";
import { api, ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await login(handle.trim().toLowerCase(), password);
      router.push("/");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[100dvh] md:grid-cols-2">
      <div className="relative hidden md:block">
        <Sleeve seed="login-room" className="absolute inset-6" />
        <p className="absolute bottom-12 left-12 max-w-xs font-[family-name:var(--font-display)] text-4xl leading-none text-white">
          The wall is already open.
        </p>
      </div>
      <div className="flex items-center px-6 py-16 md:px-16">
        <form onSubmit={onSubmit} className="w-full max-w-sm space-y-5">
          <Link href="/" className="font-[family-name:var(--font-display)] text-lg">
            Studio
          </Link>
          <h1 className="font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight">
            Log in
          </h1>
          {error ? <p className="text-sm text-[#e23b2f]">{error}</p> : null}
          <label className="block space-y-1.5 text-sm">
            <span className="text-[var(--ink-2)]">Handle</span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              required
              autoComplete="username"
              className="w-full rounded-2xl border border-[var(--line)] bg-transparent px-4 py-3 outline-none"
            />
          </label>
          <label className="block space-y-1.5 text-sm">
            <span className="text-[var(--ink-2)]">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-2xl border border-[var(--line)] bg-transparent px-4 py-3 outline-none"
            />
          </label>
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[var(--accent)] py-3 text-sm font-medium text-white disabled:opacity-50"
          >
            {busy ? "Signing in" : "Enter"}
          </button>
          <p className="text-sm text-[var(--ink-3)]">
            New here?{" "}
            <Link href="/register" className="text-[var(--ink)] underline-offset-4 hover:underline">
              Create a handle
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
