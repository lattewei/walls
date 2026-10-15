"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { Sleeve } from "@/components/sleeve";
import { api, ApiClientError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { PublicArtist } from "@/lib/types";

export default function ArtistsPage() {
  const { token } = useAuth();
  const [q, setQ] = useState("");
  const [artists, setArtists] = useState<PublicArtist[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (query?: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.listArtists({ q: query || undefined, limit: 40 });
      setArtists(res.artists);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not reach the API.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setError("");
    try {
      const res = await api.createArtist(token, { name: name.trim() });
      window.location.href = `/artists/${res.artist.slug}`;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Could not create the page.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-3)]">
            Directory
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl font-semibold tracking-tight md:text-6xl">
            Artist walls
          </h1>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void load(q.trim());
          }}
          className="w-full md:max-w-xs"
        >
          <label className="sr-only" htmlFor="q">
            Search artists
          </label>
          <input
            id="q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search a name"
            className="w-full rounded-full border border-[var(--line)] bg-transparent px-4 py-2.5 text-sm outline-none placeholder:text-[var(--ink-3)] focus:border-white/30"
          />
        </form>
      </div>

      {token ? (
        <form onSubmit={create} className="mb-10 flex flex-col gap-2 sm:flex-row">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="New wall, e.g. Johnny"
            required
            className="flex-1 rounded-full border border-[var(--line)] bg-transparent px-4 py-2.5 text-sm outline-none"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-full bg-[var(--ink)] px-5 py-2.5 text-sm font-medium text-[var(--bg)] disabled:opacity-50"
          >
            {creating ? "Creating" : "Create wall"}
          </button>
        </form>
      ) : (
        <p className="mb-10 text-sm text-[var(--ink-3)]">
          <Link href="/login" className="text-[var(--ink)] underline-offset-4 hover:underline">
            Log in
          </Link>{" "}
          to open a missing page.
        </p>
      )}

      {error ? <p className="mb-6 text-sm text-[#e23b2f]">{error}</p> : null}

      {loading ? (
        <p className="text-sm text-[var(--ink-3)]">Loading walls…</p>
      ) : artists.length === 0 ? (
        <p className="text-sm text-[var(--ink-3)]">Nothing under that name yet.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4">
          {artists.map((a) => (
            <li key={a.id}>
              <Link href={`/artists/${a.slug}`} className="group block">
                <Sleeve
                  seed={a.slug}
                  label={a.name}
                  className="aspect-square w-full transition duration-500 group-hover:scale-[1.02]"
                />
                <div className="mt-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{a.name}</div>
                    <div className="truncate font-mono text-[11px] text-[var(--ink-3)]">
                      /{a.slug}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] uppercase tracking-wider text-[var(--ink-3)]">
                    {a.is_official ? "Official" : "Open"}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
