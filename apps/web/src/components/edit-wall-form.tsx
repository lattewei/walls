"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";

import { apiUrl, isApiRequestError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { getArtistForSession, updateArtist } from "@/lib/catalog";
import { useSessionToken } from "@/lib/session";
import type { PublicArtist } from "@/lib/types";

function parseGenres(raw: string): string[] {
  return raw
    .split(/[,/|]/)
    .map((g) => g.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 20);
}

export function EditWallForm({ artist }: { artist: PublicArtist }) {
  const router = useRouter();
  const token = useSessionToken();
  const [name, setName] = useState(artist.name);
  const [bio, setBio] = useState(artist.bio ?? "");
  const [genres, setGenres] = useState((artist.genres ?? []).join(", "));
  const [lookingFor, setLookingFor] = useState(artist.looking_for ?? "");
  const [cover, setCover] = useState<File | null>(null);
  const [checking, setChecking] = useState(true);
  const [denied, setDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const preview = useMemo(() => (cover ? URL.createObjectURL(cover) : null), [cover]);
  const currentCover = apiUrl(artist.cover_url || artist.avatar_url);
  const shown = preview || currentCover;

  useEffect(() => {
    if (!token) {
      router.replace(`/login?next=${encodeURIComponent(`/artists/${artist.slug}/edit`)}`);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const fresh = await getArtistForSession(artist.slug, token);
        if (cancelled) return;
        if (!fresh) setError("This wall no longer exists.");
        else if (!fresh.can_edit) setDenied(true);
      } catch (err) {
        if (!cancelled) {
          setError(isApiRequestError(err) ? err.message : "Could not check permissions.");
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [artist.slug, router, token]);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const session = getToken();
    if (!session) {
      router.push("/login");
      return;
    }
    setBusy(true);
    try {
      await updateArtist(
        artist.slug,
        {
          name: name.trim(),
          bio: bio.trim(),
          genres: parseGenres(genres),
          looking_for: lookingFor.trim(),
          cover,
        },
        session,
      );
      router.push(`/artists/${artist.slug}`);
      router.refresh();
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not save the wall.");
    } finally {
      setBusy(false);
    }
  }

  if (!token || checking) {
    return (
      <div className="sheet">
        <p className="hint">Checking this wall…</p>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="sheet">
        <h1>Cannot edit</h1>
        <p className="hint">
          You no longer have edit rights on this wall. If it was claimed, the owner edits it now.
        </p>
        <p className="alt">
          <Link href={`/artists/${artist.slug}`}>Back to the wall</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="sheet">
      <form onSubmit={onSubmit}>
        <h1>Edit wall</h1>
        <p className="hint">{artist.name}</p>

        <label className="field">
          <span>Cover</span>
          <div className="cover-pick">
            <div className="cover-pick__face" aria-hidden>
              {shown ? <img src={shown} alt="" /> : <span>{name.slice(0, 1).toUpperCase()}</span>}
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
          <span>Bio</span>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500} />
        </label>

        <label className="field">
          <span>Genres</span>
          <input value={genres} onChange={(e) => setGenres(e.target.value)} maxLength={120} />
        </label>

        <label className="field">
          <span>Looking for</span>
          <input value={lookingFor} onChange={(e) => setLookingFor(e.target.value)} maxLength={120} />
        </label>

        {error ? <p className="note note--err">{error}</p> : null}

        <button type="submit" className="btn" disabled={busy}>
          {busy ? "Saving…" : "Save wall"}
        </button>
      </form>
      <p className="alt">
        <Link href={`/artists/${artist.slug}`}>Back to the wall</Link>
      </p>
    </div>
  );
}
