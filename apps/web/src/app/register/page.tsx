"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { api, ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await register(handle.trim().toLowerCase(), password, displayName.trim() || undefined);
      router.push("/me");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create the account.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-6 py-16">
      <Link href="/" className="font-[family-name:var(--font-display)] text-lg">
        Studio
      </Link>
      <h1 className="mt-8 font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight">
        A handle is enough.
      </h1>
      <p className="mt-3 text-sm text-[var(--ink-2)]">
        No email. Add a public contact later if you want artists to write back.
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {error ? <p className="text-sm text-[#e23b2f]">{error}</p> : null}
        <label className="block space-y-1.5 text-sm">
          <span className="text-[var(--ink-2)]">Handle</span>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            required
            pattern="[A-Za-z0-9_]{3,32}"
            className="w-full rounded-2xl border border-[var(--line)] bg-transparent px-4 py-3 outline-none"
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-[var(--ink-2)]">Display name</span>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full rounded-2xl border border-[var(--line)] bg-transparent px-4 py-3 outline-none"
          />
        </label>
        <label className="block space-y-1.5 text-sm">
          <span className="text-[var(--ink-2)]">Password</span>
          <input
            type="password"
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full rounded-2xl border border-[var(--line)] bg-transparent px-4 py-3 outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-[var(--ink)] py-3 text-sm font-medium text-[var(--bg)] disabled:opacity-50"
        >
          {busy ? "Creating" : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-sm text-[var(--ink-3)]">
        <Link href="/login" className="text-[var(--ink)] hover:underline">
          Already in
        </Link>
      </p>
    </div>
  );
}
