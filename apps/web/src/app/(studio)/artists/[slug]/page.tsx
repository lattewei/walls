import Link from "next/link";
import { notFound } from "next/navigation";

import { WallActions } from "@/components/wall-actions";
import { TrackList } from "@/components/track-list";
import { apiUrl, isApiRequestError } from "@/lib/api";
import { getArtist, listArtistTracks } from "@/lib/catalog";
import { site } from "@/content/site";
import { badgeLabel, toProdRow, type ProdRow } from "@/lib/types";

type Props = {
  params: Promise<{ slug: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  try {
    const artist = await getArtist(slug);
    if (!artist) return { title: site.name };
    return { title: `${artist.name} · ${site.name}` };
  } catch {
    return { title: site.name };
  }
}

export default async function ArtistWallPage({ params }: Props) {
  const { slug } = await params;

  let artist;
  try {
    artist = await getArtist(slug);
  } catch (err) {
    if (isApiRequestError(err) && err.status === 0) {
      return (
        <div className="wall">
          <p className="wall__missing">{err.message}</p>
        </div>
      );
    }
    throw err;
  }

  if (!artist) notFound();

  const cover = artist.cover_url || artist.avatar_url;

  let tracks: ProdRow[] = [];
  let tracksError: string | null = null;
  try {
    const list = await listArtistTracks(artist.slug);
    tracks = list.tracks.map((t) =>
      toProdRow(t, {
        meta: t.uploader_display_name || t.uploader_handle || "Unknown",
        metaHref: t.uploader_handle ? `/users/${t.uploader_handle}` : undefined,
        coverUrl: cover || undefined,
      }),
    );
  } catch (err) {
    tracksError = isApiRequestError(err) ? err.message : "Could not load productions.";
  }

  return (
    <div className="wall">
      <section className="wall__head">
        <div className="wall__cover">
          {cover ? (
            <img src={apiUrl(cover)} alt="" />
          ) : (
            <span aria-hidden>{artist.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="wall__intro">
          <h1>{artist.name}</h1>
          <span className="wall__badge">{badgeLabel(artist.badge, artist.is_official)}</span>
          {artist.bio ? <p className="wall__bio">{artist.bio}</p> : null}
          {artist.looking_for ? <p className="wall__bio">Looking for: {artist.looking_for}</p> : null}
          {artist.genres?.length ? (
            <ul className="wall__genres">
              {artist.genres.map((g) => (
                <li key={g}>{g}</li>
              ))}
            </ul>
          ) : null}
          <div className="wall__actions">
            <Link href={`/upload?artist=${artist.slug}`} className="btn">
              Add a production
            </Link>
            <Link href="/artists/new" className="btn btn--ghost">
              Create another wall
            </Link>
            <WallActions slug={artist.slug} official={artist.is_official} />
          </div>
        </div>
      </section>

      <section className="tracks">
        <h2>Productions</h2>
        <TrackList tracks={tracks} loadError={tracksError} />
      </section>
    </div>
  );
}
