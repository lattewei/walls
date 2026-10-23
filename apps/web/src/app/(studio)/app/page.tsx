import Link from "next/link";

import { isApiRequestError } from "@/lib/api";
import { listArtists, listProducers } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function AppHome() {
  let artists: Awaited<ReturnType<typeof listArtists>>["artists"] = [];
  let producers: Awaited<ReturnType<typeof listProducers>>["producers"] = [];
  let loadError: string | null = null;
  let producersError: string | null = null;

  try {
    const data = await listArtists(24);
    artists = data.artists;
  } catch (err) {
    loadError = isApiRequestError(err)
      ? err.message
      : "Could not load artists. Is the API running?";
  }

  try {
    const data = await listProducers(24);
    producers = data.producers;
  } catch (err) {
    producersError = isApiRequestError(err) ? err.message : "Could not load producers.";
  }

  return (
    <div className="home">
      <div className="home__bar">
        <h1 className="home__title">Walls</h1>
        <Link href="/artists/new" className="home__cta">
          Create a wall
        </Link>
      </div>

      <section id="artists" className="shelf shelf--artist">
        <h2>Popular artists</h2>
        {loadError ? (
          <p className="shelf__empty">{loadError}</p>
        ) : artists.length === 0 ? (
          <p className="shelf__empty">
            No walls yet.{" "}
            <Link href="/artists/new" className="shelf__link">
              Create the first one
            </Link>
            .
          </p>
        ) : (
          <ul>
            {artists.map((artist) => {
              const initial = artist.name.slice(0, 1).toUpperCase();
              const cover = artist.cover_url || artist.avatar_url;
              return (
                <li key={artist.id}>
                  <Link href={`/artists/${artist.slug}`} className="tile">
                    <div className="tile__face">
                      {cover ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cover} alt="" />
                      ) : (
                        <span aria-hidden>{initial}</span>
                      )}
                    </div>
                    <p className="tile__title">{artist.name}</p>
                    <p className="tile__meta">
                      {artist.is_official ? "Claimed" : "Community"}
                      {artist.genres?.length ? ` · ${artist.genres.slice(0, 2).join(", ")}` : ""}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section id="beatmakers" className="shelf shelf--producer">
        <h2>Popular producers</h2>
        {producersError ? (
          <p className="shelf__empty">{producersError}</p>
        ) : producers.length === 0 ? (
          <p className="shelf__empty">No uploads yet. Be the first to drop a prod.</p>
        ) : (
          <ul>
            {producers.map((p) => {
              const initial = p.display_name.slice(0, 1).toUpperCase();
              return (
                <li key={p.id}>
                  <Link href={`/users/${p.handle}`} className="tile">
                    <div className="tile__face">
                      {p.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.avatar_url} alt="" />
                      ) : (
                        <span aria-hidden>{initial}</span>
                      )}
                    </div>
                    <p className="tile__title">{p.display_name}</p>
                    <p className="tile__meta">
                      @{p.handle}
                      {p.track_count ? ` · ${p.track_count} prods` : ""}
                    </p>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
