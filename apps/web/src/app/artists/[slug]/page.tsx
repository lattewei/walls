"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { ArtistBadge } from "@/components/artist-badge";
import { TrackRow } from "@/components/track-row";
import { EmptyState, ErrorBanner, PageTitle } from "@/components/ui";
import { ApiClientError, api } from "@/lib/api";
import type { PublicArtist, PublicTrack } from "@/lib/types";

export default function ArtistPage() {
  const params = useParams();
  const slug = String(params.slug ?? "");
  const [artist, setArtist] = useState<PublicArtist | null>(null);
  const [tracks, setTracks] = useState<PublicTrack[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError("");
      try {
        const [a, t] = await Promise.all([
          api.getArtist(slug),
          api.listArtistTracks(slug, { limit: 50 }),
        ]);
        if (cancelled) return;
        setArtist(a.artist);
        setTracks(t.tracks);
      } catch (err) {
        if (cancelled) return;
        setError(
          err instanceof ApiClientError
            ? err.message
            : "Could not load this page",
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (error || !artist) {
    return (
      <div className="space-y-4">
        <ErrorBanner>{error || "Artist not found"}</ErrorBanner>
        <Link href="/artists" className="text-sm text-amber-400 hover:underline">
          Back to artists
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <ArtistBadge artist={artist} />
        {artist.genres?.length ? (
          <span className="text-xs text-zinc-500">{artist.genres.join(" · ")}</span>
        ) : null}
      </div>
      <PageTitle
        title={artist.name}
        subtitle={
          artist.bio ||
          "Community wall of productions tagged for this artist. Not an official account unless marked Official."
        }
      />

      <div className="mb-6 flex flex-wrap gap-3">
        <Link
          href={`/upload?artist=${encodeURIComponent(artist.slug)}`}
          className="rounded-md bg-amber-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-amber-400"
        >
          Add a production
        </Link>
        <span className="self-center font-mono text-xs text-zinc-600">
          /artists/{artist.slug}
        </span>
      </div>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
          Productions ({tracks.length})
        </h2>
        {tracks.length === 0 ? (
          <EmptyState>
            No prods yet. Be the first to upload something for {artist.name}.
          </EmptyState>
        ) : (
          <div className="rounded-lg border border-zinc-800 px-3">
            {tracks.map((t) => (
              <TrackRow key={t.id} track={t} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
