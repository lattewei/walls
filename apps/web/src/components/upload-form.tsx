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

export function UploadForm() {
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
        if (!cancelled) {
          setLoadError(isApiRequestError(err) ? err.message : "Could not load walls.");
        }
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
    const session = getToken();
    if (!session) {
      router.push("/login");
      return;
    }
    if (!audio) {
      setError("Choose an mp3 or wav file.");
      submitting.current = false;
      return;
    }
    if (!artistSlug) {
      setError("Pick a wall to tag.");
      submitting.current = false;
      return;
    }
    if (audio.size > MAX_AUDIO_BYTES) {
      setError("Audio file must be under 50MB.");
      submitting.current = false;
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
        session,
      );
      router.push(`/artists/${artistSlug}`);
      router.refresh();
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Upload failed.");
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <div className="sheet">
        <p className="hint">Loading…</p>
      </div>
    );
  }

  return (
    <div className="sheet">
      <form onSubmit={onSubmit}>
        <h1>Upload</h1>
        <p className="hint">
          {selectedName ? `Tag ${selectedName} and drop the file.` : "Tag a wall and drop the file."}
        </p>

        {loadError ? <p className="note note--err">{loadError}</p> : null}

        <label className="field">
          <span>Wall</span>
          <select
            value={artistSlug}
            onChange={(e) => setArtistSlug(e.target.value)}
            required
          >
            <option value="">Pick a wall</option>
            {artists.map((a) => (
              <option key={a.id} value={a.slug}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
        </label>

        <label className="field">
          <span>Audio</span>
          <input
            type="file"
            accept="audio/mpeg,audio/wav,audio/x-wav,.mp3,.wav"
            onChange={(e) => setAudio(e.target.files?.[0] ?? null)}
            required
          />
          {audio ? <span className="field__help">{audio.name}</span> : null}
        </label>

        <label className="field">
          <span>Tags</span>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="drill, dark, 140"
            maxLength={120}
          />
        </label>

        <label className="field">
          <span>Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={2000}
          />
        </label>

        {error ? <p className="note note--err">{error}</p> : null}

        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Uploading…" : "Upload production"}
        </button>
      </form>
      <p className="alt">
        <Link href="/artists/new">Need a new wall?</Link>
      </p>
    </div>
  );
}
