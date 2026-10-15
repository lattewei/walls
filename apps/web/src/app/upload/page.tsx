"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

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

function UploadForm() {
  const { token, user, loading } = useAuth();
  const router = useRouter();
  const search = useSearchParams();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [artistSlugs, setArtistSlugs] = useState(
    search.get("artist") ?? "",
  );
  const [tags, setTags] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (!token || !user) {
    return (
      <div className="space-y-4">
        <PageTitle title="Upload" subtitle="You need an account to upload." />
        <Link
          href="/login"
          className="inline-flex rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950"
        >
          Log in
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
      if (description.trim()) form.append("description", description.trim());
      form.append("artist_slugs", artistSlugs.trim());
      if (tags.trim()) form.append("tags", tags.trim());
      const res = await api.uploadTrack(token, form);
      const slug = res.track.artist_slugs?.[0];
      router.push(slug ? `/artists/${slug}` : "/artists");
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Upload failed. Check API and file type (mp3/wav).",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <PageTitle
        title="Upload a production"
        subtitle="MP3 or WAV. Tag at least one existing artist slug so it appears on their wall."
      />
      <form onSubmit={onSubmit} className="space-y-4">
        {error ? <ErrorBanner>{error}</ErrorBanner> : null}
        <Field label="Title">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            maxLength={120}
          />
        </Field>
        <Field label="Artist slugs (comma-separated)">
          <Input
            value={artistSlugs}
            onChange={(e) => setArtistSlugs(e.target.value)}
            placeholder="johnny"
            required
          />
        </Field>
        <Field label="Tags (optional)">
          <Input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="drill, dark"
          />
        </Field>
        <Field label="Description (optional)">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />
        </Field>
        <Field label="Audio file (mp3 or wav)">
          <Input
            type="file"
            accept=".mp3,.wav,audio/mpeg,audio/wav"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            required
          />
        </Field>
        <Button type="submit" disabled={busy || !file} className="w-full">
          {busy ? "Uploading…" : "Publish on wall"}
        </Button>
      </form>
    </div>
  );
}

export default function UploadPage() {
  return (
    <Suspense fallback={<p className="text-sm text-zinc-500">Loading…</p>}>
      <UploadForm />
    </Suspense>
  );
}
