import Link from "next/link";

import { FeaturePlay, SongGrid, Station } from "@/components/am-ui";
import { IconChevron } from "@/components/icons";
import { apiUrl, isApiRequestError } from "@/lib/api";
import { listArtists, listArtistTracks, listProducers, listTracks } from "@/lib/catalog";
import { site } from "@/content/site";
import { toProdRow, type ProdRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata = {
  title: `${site.name} · New`,
};

function blurb(artist: { bio?: string | null; looking_for?: string | null; name: string }) {
  const text = artist.bio?.trim() || artist.looking_for?.trim();
  if (!text) return `Open ${artist.name}`;
  return text.length > 72 ? `${text.slice(0, 69)}…` : text;
}

export default async function AppHome({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; view?: string }>;
}) {
  const params = await searchParams;
  const query = (params.q ?? "").trim();
  const view = params.view === "new" || params.view === "radio" ? params.view : "";
  const mode = query ? "search" : view || "home";
  let artists: Awaited<ReturnType<typeof listArtists>>["artists"] = [];
  let producers: Awaited<ReturnType<typeof listProducers>>["producers"] = [];
  let loadError: string | null = null;
  let tracks: ProdRow[] = [];
  let tracksError: string | null = null;

  if (mode === "home" || mode === "search") {
    try {
      const data = await listArtists(24, query);
      artists = data.artists;
    } catch (err) {
      loadError = isApiRequestError(err) ? err.message : "Could not load artists.";
    }
  }

  if (mode === "home" || mode === "search") {
    try {
      const data = await listProducers(12, query);
      producers = data.producers;
    } catch {
      producers = [];
    }
  }

  if (mode !== "search") {
    try {
      const data = await listTracks(mode === "home" ? 16 : 40, mode === "radio" ? "plays" : "recent");
      tracks = data.tracks.map((t) =>
        toProdRow(t, {
          meta: t.uploader_display_name || t.uploader_handle || "Unknown",
          metaHref: t.uploader_handle ? `/users/${t.uploader_handle}` : undefined,
        }),
      );
    } catch (err) {
      tracksError = isApiRequestError(err) ? err.message : "Could not load songs.";
    }
  }

  const featured = mode === "home"
    ? await Promise.all(
        artists.slice(0, 3).map(async (artist) => {
          let rows: ProdRow[] = [];
          try {
            const list = await listArtistTracks(artist.slug, 12);
            const cover = artist.cover_url || artist.avatar_url;
            rows = list.tracks.map((t) =>
              toProdRow(t, {
                meta: t.uploader_display_name || t.uploader_handle || artist.name,
                metaHref: t.uploader_handle ? `/users/${t.uploader_handle}` : undefined,
                coverUrl: cover || undefined,
              }),
            );
          } catch {
            rows = [];
          }
          return { artist, rows };
        }),
      )
    : [];

  return (
    <div className="am-page">
      <h1>{query ? `“${query}”` : mode === "new" ? "New" : mode === "radio" ? "Radio" : "Home"}</h1>

      {loadError ? <p className="am-empty">{loadError}</p> : null}

      {mode === "home" && featured.length > 0 ? (
        <div className="am-feature">
          {featured.map(({ artist, rows }) => {
            const cover = artist.cover_url || artist.avatar_url;
            const eyebrow = artist.genres?.[0]?.toUpperCase() || "WALL";
            return (
              <article key={artist.id} className="am-feature__item">
                <p className="am-kicker">{eyebrow}</p>
                <h2>
                  <Link href={`/artists/${artist.slug}`}>{artist.name}</Link>
                </h2>
                <p className="am-feature__sub">{artist.is_official ? "Claimed" : "Community"}</p>
                <div className="am-cardwrap">
                  <Link href={`/artists/${artist.slug}`} className="am-card">
                    {cover ? (
                      <img src={apiUrl(cover)} alt="" />
                    ) : (
                      <span className="am-card__fallback" aria-hidden>
                        {artist.name.slice(0, 1).toUpperCase()}
                      </span>
                    )}
                    <span className="am-card__shade" aria-hidden />
                    <span className="am-card__cap">{blurb(artist)}</span>
                  </Link>
                  <FeaturePlay tracks={rows} />
                </div>
              </article>
            );
          })}
        </div>
      ) : null}

      {mode === "search" ? (
        <section className="am-shelf">
          <h2>
            Artists <IconChevron />
          </h2>
          {artists.length === 0 ? (
            <p className="am-empty">
              No walls for that search. <Link href="/artists/new">New wall</Link>.
            </p>
          ) : (
            <ul className="am-hits">
              {artists.map((artist) => {
                const cover = artist.cover_url || artist.avatar_url;
                return (
                  <li key={artist.id}>
                    <Link href={`/artists/${artist.slug}`} className="am-hit">
                      <span className="am-song__art" aria-hidden>
                        {cover ? <img src={apiUrl(cover)} alt="" /> : artist.name.slice(0, 1)}
                      </span>
                      <span className="am-song__copy">
                        <strong>{artist.name}</strong>
                        <em>{artist.is_official ? "Claimed" : "Community"}</em>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      ) : null}

      {mode === "new" ? (
        <section className="am-shelf am-shelf--songs">
          <h2>Best New Songs</h2>
          {tracksError ? <p className="am-empty">{tracksError}</p> : <SongGrid tracks={tracks} />}
        </section>
      ) : null}

      {mode === "radio" ? (
        <section className="am-shelf">
          <p className="am-feature__sub">A shuffle of the tracks people actually play.</p>
          {tracksError ? <p className="am-empty">{tracksError}</p> : <Station tracks={tracks} />}
        </section>
      ) : null}

      {mode === "home" ? (
        <section className="am-shelf am-shelf--songs">
          <h2>
            <Link href="/app?view=new">
              Best New Songs <IconChevron />
            </Link>
          </h2>
          {tracksError ? <p className="am-empty">{tracksError}</p> : <SongGrid tracks={tracks} />}
        </section>
      ) : null}

      {mode !== "new" && mode !== "radio" && producers.length > 0 ? (
        <section className="am-shelf" id="producers">
          <h2>
            Producers <IconChevron />
          </h2>
          <ul className="am-hits">
            {producers.map((p) => (
              <li key={p.id}>
                <Link href={`/users/${p.handle}`} className="am-hit">
                  <span className="am-song__art" aria-hidden>
                    {p.avatar_url ? (
                      <img src={apiUrl(p.avatar_url)} alt="" />
                    ) : (
                      p.display_name.slice(0, 1).toUpperCase()
                    )}
                  </span>
                  <span className="am-song__copy">
                    <strong>{p.display_name}</strong>
                    <em>@{p.handle}</em>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
