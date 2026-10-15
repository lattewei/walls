"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Button, ErrorBanner, Field, Input, PageTitle } from "@/components/ui";
import { ApiClientError } from "@/lib/api";
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
    setError("");
    setBusy(true);
    try {
      await login(handle.trim().toLowerCase(), password);
      router.push("/artists");
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Could not log in. Is the API running?",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <PageTitle
        title="Log in"
        subtitle="Use your handle and password. No email required."
      />
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        <Field label="Handle">
          <Input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            autoComplete="username"
            placeholder="johnny_beats"
            required
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        <Button type="submit" disabled={busy} className="w-full">
          {busy ? "Signing in…" : "Log in"}
        </Button>
      </form>
      <p className="mt-6 text-sm text-zinc-500">
        No account?{" "}
        <Link href="/register" className="text-amber-400 hover:underline">
          Join
        </Link>
      </p>
    </div>
  );
}
