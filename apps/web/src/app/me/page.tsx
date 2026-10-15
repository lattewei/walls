"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import {
  Button,
  ErrorBanner,
  Field,
  Input,
  PageTitle,
  Textarea,
} from "@/components/ui";
import { ApiClientError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function MePage() {
  const { user, contacts, token, loading, refresh } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.display_name ?? "");
    setBio(user.bio ?? "");
    setEmail(contacts?.public_contact_email ?? "");
    setInstagram(contacts?.instagram_url ?? "");
  }, [user, contacts]);

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (!user || !token) {
    return (
      <div className="space-y-4">
        <PageTitle title="Your profile" />
        <Link href="/login" className="text-amber-400 hover:underline">
          Log in
        </Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    setOk("");
    try {
      await api.updateMe(token, {
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        public_contact_email: email.trim() || null,
        instagram_url: instagram.trim() || null,
      });
      await refresh();
      setOk("Saved.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageTitle
        title={`@${user.handle}`}
        subtitle="Public contacts are optional. Only fill what you want artists to see."
      />
      <p className="mb-6 text-sm text-zinc-500">
        Public page:{" "}
        <Link
          href={`/u/${user.handle}`}
          className="text-amber-400 hover:underline"
        >
          /u/{user.handle}
        </Link>
      </p>
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        {ok ? (
          <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            {ok}
          </div>
        ) : null}
        <Field label="Display name">
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
          />
        </Field>
        <Field label="Bio">
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
          />
        </Field>
        <Field label="Public contact email">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="pro@example.com"
          />
        </Field>
        <Field label="Instagram URL">
          <Input
            value={instagram}
            onChange={(e) => setInstagram(e.target.value)}
            placeholder="https://instagram.com/you"
          />
        </Field>
        <Button type="submit" disabled={busy}>
          {busy ? "Saving…" : "Save profile"}
        </Button>
      </form>
    </div>
  );
}
