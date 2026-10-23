"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { createArtist } from "@/lib/catalog";

function parseGenres(raw: string): string[] {
  return raw
    .split(/[,/|]/)
    .map((g) => g.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 8);
}

export function CreateWallForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [bio, setBio] = useState("");
  const [genres, setGenres] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    setReady(true);
  }, [router]);

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
      const artist = await createArtist(
        {
          name,
          slug: slug || undefined,
          bio: bio || undefined,
          genres: parseGenres(genres),
        },
        token,
      );
      router.push(`/artists/${artist.slug}`);
      router.refresh();
    } catch (err) {
      if (isApiRequestError(err)) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Could not create the wall.");
      }
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="auth">
        <p className="auth__hint">Checking session…</p>
      </div>
    );
  }

  return (
    <div className="wall-form">
      <div className="wall-form__inner">
        <h1>Create a wall</h1>
        <p className="wall-form__hint">
          Open a public page for an artist. Anyone can upload prods tagged to it.
        </p>

        <form onSubmit={onSubmit}>
          <label className="auth__field">
            <span>Artist name</span>
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kendrick Lamar"
              required
              maxLength={80}
              autoFocus
            />
          </label>

          <label className="auth__field">
            <span>Slug (optional)</span>
            <input
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="kendrick-lamar"
              pattern="[a-z0-9\-]*"
              maxLength={64}
              autoCapitalize="none"
              spellCheck={false}
            />
          </label>

          <label className="auth__field">
            <span>Bio (optional)</span>
            <textarea
              name="bio"
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Short note about this wall"
              rows={3}
              maxLength={500}
            />
          </label>

          <label className="auth__field">
            <span>Genres (optional, comma-separated)</span>
            <input
              name="genres"
              value={genres}
              onChange={(e) => setGenres(e.target.value)}
              placeholder="rap, r&b"
              maxLength={120}
            />
          </label>

          {error ? <p className="auth__error">{error}</p> : null}

          <button type="submit" className="auth__submit" disabled={busy || !name.trim()}>
            {busy ? "Creating…" : "Create wall"}
          </button>
        </form>

        <p className="auth__alt">
          <Link href="/app">Cancel</Link>
        </p>
      </div>
    </div>
  );
}
