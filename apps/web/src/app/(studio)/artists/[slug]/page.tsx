import Link from "next/link";
import { notFound } from "next/navigation";

import { ProdList } from "@/components/studio/prod-list";
import { isApiRequestError } from "@/lib/api";
import { getArtist, listArtistTracks } from "@/lib/catalog";
import { site } from "@/content/site";
import { badgeLabel, formatDuration, type ProdRow } from "@/lib/types";

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

  let tracks: ProdRow[] = [];
  try {
    const list = await listArtistTracks(artist.slug);
    tracks = list.tracks.map((t) => ({
      id: t.id,
      title: t.title,
      meta: t.uploader_display_name || t.uploader_handle || "Unknown",
      metaHref: t.uploader_handle ? `/users/${t.uploader_handle}` : undefined,
      duration: formatDuration(t.duration_seconds),
      audioUrl: t.audio_url,
    }));
  } catch {
    tracks = [];
  }

  const cover = artist.cover_url || artist.avatar_url;

  return (
    <div className="profile">
      <section className="profile__head">
        <div className="profile__cover">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" />
          ) : (
            <span aria-hidden>{artist.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <h1>{artist.name}</h1>
        <span className={artist.is_official ? "profile__badge is-claimed" : "profile__badge"}>
          {badgeLabel(artist.badge, artist.is_official)}
        </span>
        {artist.bio ? <p className="profile__bio">{artist.bio}</p> : null}
        {artist.genres?.length ? (
          <ul className="profile__genres">
            {artist.genres.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        ) : null}
        <Link href="/artists/new" className="profile__action">
          Create another wall
        </Link>
      </section>

      <section className="prods">
        <h2>Productions</h2>
        <ProdList tracks={tracks} />
      </section>
    </div>
  );
}
