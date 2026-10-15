"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button, ErrorBanner, Field, Input, PageTitle } from "@/components/ui";
import { ApiClientError } from "@/lib/api";
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
    setError("");
    setBusy(true);
    try {
      await register(
        handle.trim().toLowerCase(),
        password,
        displayName.trim() || undefined,
      );
      router.push("/me");
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Could not register. Is the API running?",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageTitle
        title="Create account"
        subtitle="Handle + password only. Add public contacts later so artists can reach you."
      />
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        <Field label="Handle">
          <Input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            autoComplete="username"
            placeholder="johnny_beats"
            pattern="[a-zA-Z0-9_]{3,32}"
            title="3–32 chars: letters, digits, underscore"
            required
          />
        </Field>
        <Field label="Display name (optional)">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Johnny Beats"
          />
        </Field>
        <Field label="Password (min 8)">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
          />
        </Field>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Creating…" : "Create account"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-zinc-500">
        Already have an account?{" "}
        <Link href="/login" className="text-amber-400 hover:underline">
          Log in
        </Link>
      </p>
    </div>
  );
}
