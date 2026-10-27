"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useRef, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { createArtist } from "@/lib/catalog";
import { useSessionToken } from "@/lib/session";

function parseGenres(raw: string): string[] {
  return raw
    .split(/[,/|]/)
    .map((g) => g.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
}

export function CreateWallForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [genres, setGenres] = useState("");
  const [lookingFor, setLookingFor] = useState("");
  const [cover, setCover] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const token = useSessionToken();
  const preview = useMemo(() => (cover ? URL.createObjectURL(cover) : null), [cover]);

  useEffect(() => {
    if (!token) router.replace("/login?next=/artists/new");
  }, [router, token]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

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

    setBusy(true);
    try {
      const artist = await createArtist(
        {
          name,
          slug: slug || undefined,
          bio: bio || undefined,
          genres: parseGenres(genres),
          looking_for: lookingFor || undefined,
          cover,
        },
        session,
      );
      router.push(`/artists/${artist.slug}`);
      router.refresh();
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not create the wall.");
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
        <h1>New wall</h1>
        <p className="hint">A page for an artist. Producers drop instrumentals on it.</p>

        <label className="field">
          <span>Cover</span>
          <div className="cover-pick">
            <div className="cover-pick__face" aria-hidden>
              {preview ? <img src={preview} alt="" /> : <span>+</span>}
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => setCover(e.target.files?.[0] ?? null)}
            />
          </div>
        </label>

        <label className="field">
          <span>Name</span>
          <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
        </label>

        <label className="field">
          <span>Slug (optional)</span>
          <input
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="artist-name"
            maxLength={64}
            autoCapitalize="none"
          />
        </label>

        <label className="field">
          <span>Bio</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500} />
        </label>

        <label className="field">
          <span>Genres</span>
          <input
            value={genres}
            onChange={(e) => setGenres(e.target.value)}
            placeholder="drill, rnb"
            maxLength={120}
          />
        </label>

        <label className="field">
          <span>Looking for</span>
          <input
            value={lookingFor}
            onChange={(e) => setLookingFor(e.target.value)}
            placeholder="dark 140 bpm"
            maxLength={120}
          />
        </label>

        {error ? <p className="note note--err">{error}</p> : null}

        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Creating…" : "Create wall"}
        </button>
      </form>
      <p className="alt">
        <Link href="/app">Back</Link>
      </p>
    </div>
  );
}
