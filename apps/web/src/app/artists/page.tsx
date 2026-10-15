"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";

import { ArtistBadge } from "@/components/artist-badge";
import {
  Button,
  EmptyState,
  ErrorBanner,
  Field,
  Input,
  PageTitle,
} from "@/components/ui";
import { ApiClientError, api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import type { PublicArtist } from "@/lib/types";

export default function ArtistsPage() {
  const { token } = useAuth();
  const [q, setQ] = useState("");
  const [artists, setArtists] = useState<PublicArtist[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async (query?: string) => {
    setLoading(true);
    setError("");
    try {
      const res = await api.listArtists({ q: query || undefined, limit: 40 });
      setArtists(res.artists);
      setTotal(res.total);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Could not load artists. Start the API on :8080.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function onSearch(e: FormEvent) {
    e.preventDefault();
    void load(q.trim());
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    setCreating(true);
    setError("");
    try {
      const res = await api.createArtist(token, { name: newName.trim() });
      setNewName("");
      window.location.href = `/artists/${res.artist.slug}`;
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Create failed");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <PageTitle
        title="Artists"
        subtitle="Community pages first. Official badge only after a verified claim."
      />

      <form onSubmit={onSearch} className="mb-6 flex gap-2">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search name or slug…"
          className="flex-1"
        />
        <Button type="submit" variant="ghost">
          Search
        </Button>
      </form>

      {token ? (
        <form
          onSubmit={onCreate}
          className="mb-8 flex flex-col gap-2 rounded-lg border border-zinc-800 bg-zinc-900/30 p-4 sm:flex-row sm:items-end"
        >
          <div className="flex-1">
            <Field label="Create page">
              <Input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Johnny"
                required
              />
            </Field>
          </div>
          <Button type="submit" disabled={creating || !newName.trim()}>
            {creating ? "Creating…" : "Create"}
          </Button>
        </form>
      ) : (
        <p className="mb-8 text-sm text-zinc-500">
          <Link href="/login" className="text-amber-400 hover:underline">
            Log in
          </Link>{" "}
          to create an artist page.
        </p>
      )}

      {error ? (
        <div className="mb-4">
          <ErrorBanner>{error}</ErrorBanner>
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : artists.length === 0 ? (
        <EmptyState>
          No artists yet. Create Johnny&apos;s page to start the wall.
        </EmptyState>
      ) : (
        <>
          <p className="mb-3 text-xs text-zinc-600">{total} page(s)</p>
          <ul className="divide-y divide-zinc-900 rounded-lg border border-zinc-800">
            {artists.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/artists/${a.slug}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition hover:bg-zinc-900/50"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-zinc-100">
                      {a.name}
                    </div>
                    <div className="truncate font-mono text-xs text-zinc-500">
                      /{a.slug}
                    </div>
                  </div>
                  <ArtistBadge artist={a} />
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
