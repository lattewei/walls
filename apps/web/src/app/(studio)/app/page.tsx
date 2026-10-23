import Link from "next/link";

import { isApiRequestError } from "@/lib/api";
import { listArtists } from "@/lib/catalog";

export const dynamic = "force-dynamic";

export default async function AppHome() {
  let artists: Awaited<ReturnType<typeof listArtists>>["artists"] = [];
  let loadError: string | null = null;

  try {
    const data = await listArtists(24);
    artists = data.artists;
  } catch (err) {
    loadError = isApiRequestError(err)
      ? err.message
      : "Could not load artists. Is the API running?";
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
        <p className="shelf__empty">Producer directory comes next. Open a wall to see who uploaded.</p>
      </section>
    </div>
  );
}
