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
      router.replace(
        `/login?next=${encodeURIComponent(`/artists/${artist.slug}/edit`)}`,
      );
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const fresh = await getArtistForSession(artist.slug, token);
        if (cancelled) return;
        if (!fresh) {
          setError("This wall no longer exists.");
        } else if (!fresh.can_edit) {
          setDenied(true);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            isApiRequestError(err) ? err.message : "Could not check permissions.",
          );
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
    const token = getToken();
    if (!token) {
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
        token,
      );
      router.push(`/artists/${artist.slug}`);
      router.refresh();
    } catch (err) {
      setError(isApiRequestError(err) ? err.message : "Could not save the wall.");
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return (
      <div className="wall-form">
        <p className="wall-form__hint">Checking permissions…</p>
      </div>
    );
  }

  if (denied) {
    return (
      <div className="wall-form">
        <div className="wall-form__inner">
          <h1>Not your wall</h1>
          <p className="wall-form__hint">
            Only the person who claimed this wall, the producer who created it,
            or an admin can edit it.
          </p>
          <p className="auth__alt">
            <Link href={`/artists/${artist.slug}`}>Back to the wall</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="wall-form">
      <div className="wall-form__inner">
        <h1>Edit wall</h1>
        <p className="wall-form__hint">
          Public page for {artist.name}. The URL stays /artists/{artist.slug}.
        </p>

        <form onSubmit={onSubmit}>
          <label className="auth__field">
            <span>Cover</span>
            <div className="wall-form__cover">
              <div className="wall-form__preview" aria-hidden>
                {shown ? (
                  <img src={shown} alt="" />
                ) : (
                  <span>{artist.name.slice(0, 1).toUpperCase()}</span>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file && file.size > 5 * 1024 * 1024) {
                    setError("Cover must be under 5MB.");
                    setCover(null);
                    return;
                  }
                  setError(null);
                  setCover(file);
                }}
              />
            </div>
          </label>

          <label className="auth__field">
            <span>Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              maxLength={120}
            />
          </label>

          <label className="auth__field">
            <span>Bio</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Who this wall is for…"
            />
          </label>

          <label className="auth__field">
            <span>Genres</span>
            <input
              value={genres}
              onChange={(e) => setGenres(e.target.value)}
              placeholder="rap, drill, plugg"
              maxLength={200}
            />
          </label>

          <label className="auth__field">
            <span>Looking for</span>
            <input
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              placeholder="Dark drill beats, 140 BPM"
              maxLength={500}
            />
          </label>

          {error ? <p className="auth__error">{error}</p> : null}

          <button
            type="submit"
            className="auth__submit"
            disabled={busy || !name.trim()}
          >
            {busy ? "Saving…" : "Save wall"}
          </button>
        </form>

        <p className="auth__alt">
          <Link href={`/artists/${artist.slug}`}>Cancel</Link>
        </p>
      </div>
    </div>
  );
}
