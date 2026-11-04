"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useRef, useState } from "react";

import { apiUrl, isApiRequestError } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { getArtist, listArtists } from "@/lib/catalog";
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
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<PublicArtist | null>(null);
  const [hits, setHits] = useState<PublicArtist[]>([]);
  const [open, setOpen] = useState(false);
  const [looking, setLooking] = useState(false);
  const [audio, setAudio] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submitting = useRef(false);
  const pickRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!token) {
      const next = presetSlug
        ? `/login?next=${encodeURIComponent(`/upload?artist=${presetSlug}`)}`
        : "/login?next=/upload";
      router.replace(next);
    }
  }, [router, presetSlug, token]);

  useEffect(() => {
    if (!token || !presetSlug) return;
    let cancelled = false;
    (async () => {
      try {
        const artist = await getArtist(presetSlug);
        if (!cancelled && artist) {
          setSelected(artist);
          setQuery(artist.name);
        }
      } catch {
        if (!cancelled) setError("Could not load that wall.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [presetSlug, token]);

  useEffect(() => {
    const q = query.trim();
    if (selected || q.length < 1) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      if (!cancelled) setLooking(true);
      try {
        const data = await listArtists(8, q);
        if (cancelled) return;
        setHits(data.artists);
        setOpen(true);
      } catch {
        if (!cancelled) setHits([]);
      } finally {
        if (!cancelled) setLooking(false);
      }
    }, 180);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [query, selected]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!pickRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function pick(artist: PublicArtist) {
    setSelected(artist);
    setQuery(artist.name);
    setHits([]);
    setOpen(false);
  }

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
    if (!selected) {
      setError("Search and pick a wall to tag.");
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
          artistSlugs: [selected.slug],
          tags: parseTags(tags),
          audio,
          cover,
        },
        session,
      );
      router.push(`/artists/${selected.slug}`);
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
          {selected ? `Tag ${selected.name} and drop the file.` : "Search a wall and drop the file."}
        </p>

        <div className="field" ref={pickRef}>
          <span>Wall</span>
          <input
            value={query}
            onChange={(e) => {
              setSelected(null);
              setQuery(e.target.value);
            }}
            onFocus={() => {
              if (!selected && hits.length > 0) setOpen(true);
            }}
            placeholder="Search a wall"
            autoComplete="off"
            role="combobox"
            aria-expanded={open && !selected}
            aria-controls="wall-hits"
            aria-autocomplete="list"
          />
          {selected ? (
            <span className="field__help">Tagged {selected.name}</span>
          ) : looking ? (
            <span className="field__help">Searching…</span>
          ) : query.trim() && open && hits.length === 0 ? (
            <span className="field__help">
              No walls. <Link href="/artists/new">New wall</Link>
            </span>
          ) : null}
          {open && !selected && query.trim() && hits.length > 0 ? (
            <ul id="wall-hits" className="wall-pick" role="listbox">
              {hits.map((artist) => {
                const coverSrc = artist.cover_url || artist.avatar_url;
                return (
                  <li key={artist.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={false}
                      onClick={() => pick(artist)}
                    >
                      <span className="wall-pick__art" aria-hidden>
                        {coverSrc ? <img src={apiUrl(coverSrc)} alt="" /> : artist.name.slice(0, 1)}
                      </span>
                      <span>
                        <strong>{artist.name}</strong>
                        <em>{artist.slug}</em>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <label className="field">
          <span>Title</span>
          <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={120} />
        </label>

        <label className="field">
          <span>Cover</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
            onChange={(e) => setCover(e.target.files?.[0] ?? null)}
          />
          {cover ? <span className="field__help">{cover.name}</span> : null}
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
