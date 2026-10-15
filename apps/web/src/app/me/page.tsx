"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

import { api, ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export default function MePage() {
  const { user, contacts, token, loading, refresh } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [instagram, setInstagram] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.display_name ?? "");
    setBio(user.bio ?? "");
    setEmail(contacts?.public_contact_email ?? "");
    setInstagram(contacts?.instagram_url ?? "");
  }, [user, contacts]);

  if (loading) return <p className="text-sm text-[var(--ink-3)]">Loading…</p>;
  if (!user || !token) {
    return (
      <Link href="/login" className="underline">
        Log in
      </Link>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setBusy(true);
    setError("");
    setSaved(false);
    try {
      await api.updateMe(token, {
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        public_contact_email: email.trim() || null,
        instagram_url: instagram.trim() || null,
      });
      await refresh();
      setSaved(true);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-3)]">
        @{user.handle}
      </p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl font-semibold">
        Your card
      </h1>
      <p className="mt-3 text-sm text-[var(--ink-2)]">
        Public page{" "}
        <Link href={`/u/${user.handle}`} className="underline">
          /u/{user.handle}
        </Link>
      </p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {error ? <p className="text-sm text-[#e23b2f]">{error}</p> : null}
        {saved ? <p className="text-sm text-emerald-400">Saved.</p> : null}
        {[
          ["Display name", displayName, setDisplayName, "text"],
          ["Public email", email, setEmail, "email"],
          ["Instagram URL", instagram, setInstagram, "url"],
        ].map(([label, value, set, type]) => (
          <label key={String(label)} className="block text-sm">
            <span className="text-[var(--ink-2)]">{label as string}</span>
            <input
              type={type as string}
              value={value as string}
              onChange={(e) => (set as (v: string) => void)(e.target.value)}
              className="mt-1.5 w-full rounded-2xl border border-[var(--line)] bg-transparent px-4 py-3 outline-none"
            />
          </label>
        ))}
        <label className="block text-sm">
          <span className="text-[var(--ink-2)]">Bio</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-2xl border border-[var(--line)] bg-transparent px-4 py-3 outline-none"
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded-full bg-[var(--ink)] px-6 py-3 text-sm font-medium text-[var(--bg)]"
        >
          {busy ? "Saving" : "Save"}
        </button>
      </form>
    </div>
  );
}
