import Link from "next/link";
import { notFound } from "next/navigation";

import { ClaimWall } from "@/components/claim-wall";
import { ProdList } from "@/components/studio/prod-list";
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
        <div className="profile">
          <p className="profile__missing">{err.message}</p>
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
    <div className="profile">
      <section className="profile__head">
        <div className="profile__cover">
          {cover ? (
            <img src={apiUrl(cover)} alt="" />
          ) : (
            <span aria-hidden>{artist.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <h1>{artist.name}</h1>
        <span className={artist.is_official ? "profile__badge is-claimed" : "profile__badge"}>
          {badgeLabel(artist.badge, artist.is_official)}
        </span>
        {artist.bio ? <p className="profile__bio">{artist.bio}</p> : null}
        {artist.looking_for ? <p className="profile__bio">Looking for: {artist.looking_for}</p> : null}
        {artist.genres?.length ? (
          <ul className="profile__genres">
            {artist.genres.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        ) : null}
        <div className="profile__actions">
          <Link href={`/upload?artist=${artist.slug}`} className="profile__action">
            Add a production
          </Link>
          <Link href="/artists/new" className="profile__action profile__action--ghost">
            Create another wall
          </Link>
          <ClaimWall slug={artist.slug} official={artist.is_official} />
        </div>
      </section>

      <section className="prods">
        <h2>Productions</h2>
        <ProdList tracks={tracks} loadError={tracksError} />
      </section>
    </div>
  );
}
