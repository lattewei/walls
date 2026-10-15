"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { Sleeve } from "@/components/sleeve";
import { TrackRow } from "@/components/track-row";
import { api, ApiClientError } from "@/lib/api";
import type { PublicArtist, PublicTrack } from "@/lib/types";

export default function ArtistWallPage() {
  const slug = String(useParams().slug ?? "");
  const [artist, setArtist] = useState<PublicArtist | null>(null);
  const [tracks, setTracks] = useState<PublicTrack[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [a, t] = await Promise.all([
          api.getArtist(slug),
          api.listArtistTracks(slug, { limit: 50 }),
        ]);
        if (cancelled) return;
        setArtist(a.artist);
        setTracks(t.tracks);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiClientError ? err.message : "Page not found");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) return <p className="text-sm text-[var(--ink-3)]">Opening wall…</p>;
  if (error || !artist) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-[#e23b2f]">{error || "Not found"}</p>
        <Link href="/artists" className="text-sm underline">
          Back
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="grid items-end gap-6 md:grid-cols-[280px_1fr] md:gap-10">
        <Sleeve
          seed={artist.slug}
          label={artist.name}
          size="lg"
          className="aspect-square w-full max-w-sm"
        />
        <div className="pb-2">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-3)]">
            {artist.is_official ? "Official page" : "Community wall"}
          </p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-5xl font-semibold leading-[0.92] tracking-tight md:text-7xl">
            {artist.name}
          </h1>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-[var(--ink-2)]">
            {artist.bio ||
              "Anyone can leave a production here. Official status only appears after a verified claim."}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href={`/upload?artist=${encodeURIComponent(artist.slug)}`}
              className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white"
            >
              Add a production
            </Link>
            {artist.genres?.length ? (
              <span className="text-xs text-[var(--ink-3)]">
                {artist.genres.join(" · ")}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <section className="mt-12">
        <div className="mb-2 flex items-baseline justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-2xl">Tracklist</h2>
          <span className="text-xs text-[var(--ink-3)]">{tracks.length}</span>
        </div>
        {tracks.length === 0 ? (
          <p className="py-10 text-sm text-[var(--ink-3)]">
            Empty sleeve. Be the first file on this wall.
          </p>
        ) : (
          tracks.map((t, i) => <TrackRow key={t.id} track={t} index={i} />)
        )}
      </section>
    </div>
  );
}
