"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { listArtists } from "@/lib/catalog";
import { useSessionToken } from "@/lib/session";
import { uploadTrack } from "@/lib/tracks";
import type { PublicArtist } from "@/lib/types";

function parseTags(raw: string): string[] {
  return raw
    .split(/[,/|]/)
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
}

const MAX_AUDIO_BYTES = 50 * 1024 * 1024;

export function UploadProdForm() {
  const router = useRouter();
  const search = useSearchParams();
  const presetSlug = search.get("artist")?.trim().toLowerCase() ?? "";

  const token = useSessionToken();
  const [artists, setArtists] = useState<PublicArtist[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [artistSlug, setArtistSlug] = useState(presetSlug);
  const [audio, setAudio] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      const next = presetSlug
        ? `/login?next=${encodeURIComponent(`/upload?artist=${presetSlug}`)}`
        : "/login?next=/upload";
      router.replace(next);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const data = await listArtists(50);
        if (cancelled) return;
        setArtists(data.artists);
        if (!presetSlug && data.artists.length === 1) {
          setArtistSlug(data.artists[0].slug);
        }
      } catch (err) {
        if (cancelled) return;
        setLoadError(
          isApiRequestError(err) ? err.message : "Could not load walls.",
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [router, presetSlug, token]);

  const selectedName = useMemo(() => {
    return artists.find((a) => a.slug === artistSlug)?.name ?? artistSlug;
  }, [artists, artistSlug]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (submitting.current) return;
    submitting.current = true;
    setError(null);
    const token = getToken();
    if (!token) {
      router.push("/login");
      return;
    }
    if (!audio) {
      setError("Choose an mp3 or wav file.");
      return;
    }
    if (!artistSlug) {
      setError("Pick a wall to tag.");
      return;
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      setError("Audio file must be under 50MB.");
      return;
    }

    setBusy(true);
    try {
      await uploadTrack(
        {
          title,
          description: description || undefined,
          artistSlugs: [artistSlug],
          tags: parseTags(tags),
          audio,
        },
        token,
      );
      router.push(`/artists/${artistSlug}`);
      router.refresh();
    } catch (err) {
      if (isApiRequestError(err)) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Upload failed.");
      }
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="wall-form">
        <p className="wall-form__hint">Checking session…</p>
      </div>
    );
  }

  return (
    <div className="wall-form">
      <div className="wall-form__inner">
        <h1>Upload a production</h1>
        <p className="wall-form__hint">
          Tag a wall. The track shows on that artist page for anyone to hear.
        </p>

        {loadError ? <p className="auth__error">{loadError}</p> : null}

        {artists.length === 0 && !loadError ? (
          <p className="wall-form__hint">
            No walls yet.{" "}
            <Link href="/artists/new">Create a wall</Link> first.
          </p>
        ) : (
          <form onSubmit={onSubmit}>
            <label className="auth__field">
              <span>Audio (mp3 or wav)</span>
              <input
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,.mp3,.wav"
                required
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  setError(null);
                  setAudio(file);
                }}
              />
              {audio ? (
                <span className="upload__file">
                  {audio.name} · {(audio.size / (1024 * 1024)).toFixed(1)} MB
                </span>
              ) : null}
            </label>

            <label className="auth__field">
              <span>Title</span>
              <input
                name="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Night run"
                required
                maxLength={120}
              />
            </label>

            <label className="auth__field">
              <span>Wall</span>
              <select
                name="artist_slug"
                value={artistSlug}
                onChange={(e) => setArtistSlug(e.target.value)}
                required
              >
                <option value="" disabled>
                  Select a wall
                </option>
                {artists.map((a) => (
                  <option key={a.id} value={a.slug}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="auth__field">
              <span>Description (optional)</span>
              <textarea
                name="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="BPM, key, notes…"
              />
            </label>

            <label className="auth__field">
              <span>Tags (optional)</span>
              <input
                name="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="drill, dark, 140"
                maxLength={120}
              />
            </label>

            {error ? <p className="auth__error">{error}</p> : null}

            <button
              type="submit"
              className="auth__submit"
              disabled={busy || !title.trim() || !audio || !artistSlug}
            >
              {busy ? "Uploading…" : selectedName ? `Upload to ${selectedName}` : "Upload"}
            </button>
          </form>
        )}

        <p className="auth__alt">
          <Link href={artistSlug ? `/artists/${artistSlug}` : "/app"}>Cancel</Link>
        </p>
      </div>
    </div>
  );
}
