"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { Sleeve } from "@/components/sleeve";
import { TrackRow } from "@/components/track-row";
import { api } from "@/lib/api";
import type { PublicArtist, PublicTrack } from "@/lib/types";

export default function HomePage() {
  const [artists, setArtists] = useState<PublicArtist[]>([]);
  const [tracks, setTracks] = useState<PublicTrack[]>([]);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.listArtists({ limit: 12 });
        if (cancelled) return;
        setArtists(list.artists);
        const first = list.artists[0];
        if (first) {
          const wall = await api.listArtistTracks(first.slug, { limit: 8 });
          if (!cancelled) setTracks(wall.tracks);
        }
      } catch {
        if (!cancelled) setOffline(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const featured = artists[0];

  return (
    <div className="space-y-14">
      <header className="grid items-end gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div>
          <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--ink-3)]">
            Listening room
          </p>
          <h1 className="mt-3 max-w-xl font-[family-name:var(--font-display)] text-5xl font-semibold leading-[0.95] tracking-tight md:text-7xl">
            Beats, parked on the artist.
          </h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-[var(--ink-2)]">
            A public wall per name. Upload a prod, tag the page, they press play.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/artists"
              className="rounded-full bg-[var(--accent)] px-5 py-2.5 text-sm font-medium text-white transition duration-300 hover:brightness-110 active:scale-[0.98]"
            >
              Open the walls
            </Link>
            <Link
              href="/upload"
              className="rounded-full border border-[var(--line)] px-5 py-2.5 text-sm text-[var(--ink)] hover:bg-white/5"
            >
              Drop a file
            </Link>
          </div>
        </div>

        {featured ? (
          <Link href={`/artists/${featured.slug}`} className="group block">
            <Sleeve
              seed={featured.slug}
              label={featured.name}
              size="lg"
              className="aspect-[4/5] w-full transition duration-700 group-hover:scale-[1.015]"
            />
            <div className="mt-3 flex items-baseline justify-between">
              <span className="font-[family-name:var(--font-display)] text-2xl">
                {featured.name}
              </span>
              <span className="text-xs uppercase tracking-[0.16em] text-[var(--ink-3)]">
                {featured.is_official ? "Official" : "Community"}
              </span>
            </div>
          </Link>
        ) : (
          <div className="rounded-[18px] border border-dashed border-[var(--line)] p-8 text-sm text-[var(--ink-3)]">
            {offline
              ? "API is offline. Start it on port 8080, then the walls appear here."
              : "No artist pages yet. Create the first one."}
          </div>
        )}
      </header>

      {artists.length > 1 ? (
        <section>
          <div className="mb-4 flex items-end justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-2xl">
              Walls
            </h2>
            <Link href="/artists" className="text-sm text-[var(--ink-3)] hover:text-[var(--ink)]">
              All
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {artists.slice(1).map((a) => (
              <Link key={a.id} href={`/artists/${a.slug}`} className="w-36 shrink-0">
                <Sleeve seed={a.slug} label={a.name} className="aspect-square w-full" />
                <div className="mt-2 truncate text-sm">{a.name}</div>
                <div className="truncate font-mono text-[11px] text-[var(--ink-3)]">
                  /{a.slug}
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {tracks.length > 0 && featured ? (
        <section>
          <h2 className="mb-2 font-[family-name:var(--font-display)] text-2xl">
            On {featured.name}
          </h2>
          <div>
            {tracks.map((t, i) => (
              <TrackRow key={t.id} track={t} index={i} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
