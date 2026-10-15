"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

import { api, ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";

function UploadForm() {
  const { token, loading } = useAuth();
  const router = useRouter();
  const preset = useSearchParams().get("artist") ?? "";
  const [title, setTitle] = useState("");
  const [slugs, setSlugs] = useState(preset);
  const [tags, setTags] = useState("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) return <p className="text-sm text-[var(--ink-3)]">Loading…</p>;
  if (!token) {
    return (
      <div>
        <h1 className="font-[family-name:var(--font-display)] text-4xl">Upload</h1>
        <Link href="/login" className="mt-4 inline-block text-sm underline">
          Log in first
        </Link>
      </div>
    );
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token || !file) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("audio", file);
      form.append("title", title.trim());
      form.append("artist_slugs", slugs.trim());
      if (tags.trim()) form.append("tags", tags.trim());
      if (description.trim()) form.append("description", description.trim());
      const res = await api.uploadTrack(token, form);
      const slug = res.track.artist_slugs?.[0];
      router.push(slug ? `/artists/${slug}` : "/");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Upload failed. MP3 or WAV only.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-3)]">Drop</p>
      <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl font-semibold tracking-tight">
        Put it on a wall.
      </h1>
      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {error ? <p className="text-sm text-[#e23b2f]">{error}</p> : null}
        <label className="block text-sm">
          <span className="text-[var(--ink-2)]">Title</span>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1.5 w-full rounded-2xl border border-[var(--line)] bg-transparent px-4 py-3 outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--ink-2)]">Artist slugs</span>
          <input
            required
            value={slugs}
            onChange={(e) => setSlugs(e.target.value)}
            placeholder="johnny"
            className="mt-1.5 w-full rounded-2xl border border-[var(--line)] bg-transparent px-4 py-3 outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--ink-2)]">Tags</span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="drill, night"
            className="mt-1.5 w-full rounded-2xl border border-[var(--line)] bg-transparent px-4 py-3 outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--ink-2)]">Note</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="mt-1.5 w-full rounded-2xl border border-[var(--line)] bg-transparent px-4 py-3 outline-none"
          />
        </label>
        <label className="block text-sm">
          <span className="text-[var(--ink-2)]">File</span>
          <input
            required
            type="file"
            accept=".mp3,.wav,audio/mpeg,audio/wav"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1.5 block w-full text-sm text-[var(--ink-2)] file:mr-3 file:rounded-full file:border-0 file:bg-white/10 file:px-4 file:py-2 file:text-[var(--ink)]"
          />
        </label>
        <button
          type="submit"
          disabled={busy || !file}
          className="rounded-full bg-[var(--accent)] px-6 py-3 text-sm font-medium text-white disabled:opacity-40"
        >
          {busy ? "Sending" : "Publish"}
        </button>
      </form>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--ink-3)]">Loading…</p>}>
      <UploadForm />
    </Suspense>
  );
}
