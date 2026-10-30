import Link from "next/link";
import { notFound } from "next/navigation";

import { PreviewButton } from "@/components/am-ui";
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

  const updated = new Date(artist.created_at).toLocaleDateString("en-US", {
    weekday: "long",
  });

  return (
    <div className="am-page">
      <section className="am-detail">
        <div className="am-detail__cover">
          {cover ? (
            <img src={apiUrl(cover)} alt="" />
          ) : (
            <span aria-hidden>{artist.name.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="am-detail__copy">
          <h1>{artist.name}</h1>
          <p className="am-detail__by">{site.name}</p>
          <p className="am-detail__when">Updated {updated}</p>
          <p className="am-detail__desc">
            {artist.bio?.trim() ||
              artist.looking_for?.trim() ||
              badgeLabel(artist.badge, artist.is_official)}
          </p>
          <div className="am-detail__actions">
            <PreviewButton tracks={tracks} />
            <Link href={`/upload?artist=${artist.slug}`} className="am-textlink">
              Add a production
            </Link>
            <WallActions slug={artist.slug} official={artist.is_official} />
          </div>
        </div>
      </section>

      <TrackList tracks={tracks} loadError={tracksError} />
    </div>
  );
}
