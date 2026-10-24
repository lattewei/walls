"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { isApiRequestError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { createArtist } from "@/lib/catalog";

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
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login?next=/artists/new");
      return;
    }
    setReady(true);
  }, [router]);

  useEffect(() => {
    if (!cover) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(cover);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [cover]);

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
      submitting.current = false;
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
            <span>Cover photo (optional)</span>
            <div className="wall-form__cover">
              <div className="wall-form__preview" aria-hidden>
                {preview ? (
                  // eslint-disable-next-line @next/next/no-img-element -- blob preview, not an optimizer source
                  <img src={preview} alt="" />
                ) : (
                  <span>+</span>
                )}
              </div>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0] ?? null;
                  if (file && file.size > 5 * 1024 * 1024) {
                    setError("Cover image must be under 5MB");
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
            <span>Artist name</span>
            <input
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Kendrick Lamar"
              required
              maxLength={100}
            />
          </label>

          <label className="auth__field">
            <span>Slug (optional)</span>
            <input
              name="slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="kendrick-lamar"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
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
              maxLength={2000}
            />
          </label>

          <label className="auth__field">
            <span>Looking for (optional)</span>
            <input
              name="looking_for"
              value={lookingFor}
              onChange={(e) => setLookingFor(e.target.value)}
              placeholder="Melodic hooks, dark 808s"
              maxLength={2000}
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
