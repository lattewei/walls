import Link from "next/link";
import { notFound } from "next/navigation";

import { PreviewButton } from "@/components/am-ui";
import { ProdActions } from "@/components/prod-actions";
import { isApiRequestError } from "@/lib/api";
import { getTrack } from "@/lib/catalog";
import { site } from "@/content/site";
import { formatDuration, toProdRow } from "@/lib/types";

type Props = {
  params: Promise<{ id: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  try {
    const track = await getTrack(id);
    if (!track) return { title: site.name };
    return { title: `${track.title} · ${site.name}` };
  } catch {
    return { title: site.name };
  }
}

export default async function TrackPage({ params }: Props) {
  const { id } = await params;

  let track;
  try {
    track = await getTrack(id);
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

  if (!track) notFound();

  const wall = track.artist_slugs?.[0];
  const row = toProdRow(track, {
    meta: track.uploader_display_name || track.uploader_handle || "Unknown",
    metaHref: track.uploader_handle ? `/users/${track.uploader_handle}` : undefined,
  });
  const cover = row.coverUrl;
  const posted = new Date(track.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const plays = track.play_count ?? 0;
  const duration = formatDuration(track.duration_seconds);

  return (
    <div className="am-page">
      <section className="am-detail">
        <div className="am-detail__cover">
          {cover ? (
            <img src={cover} alt="" />
          ) : (
            <span aria-hidden>{track.title.slice(0, 1).toUpperCase()}</span>
          )}
        </div>
        <div className="am-detail__copy">
          <p className="am-kicker">Production</p>
          <h1>{track.title}</h1>
          {track.uploader_handle ? (
            <p className="am-detail__by">
              <Link href={`/users/${track.uploader_handle}`}>
                {track.uploader_display_name || track.uploader_handle}
              </Link>
            </p>
          ) : (
            <p className="am-detail__by">{track.uploader_display_name || "Unknown"}</p>
          )}
          <p className="am-detail__when">
            {[duration, `${plays} ${plays === 1 ? "play" : "plays"}`, posted]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {track.description?.trim() ? (
            <p className="am-detail__desc">{track.description.trim()}</p>
          ) : null}
          {track.artist_slugs.length > 0 ? (
            <p className="am-detail__desc">
              On{" "}
              {track.artist_slugs.map((slug, i) => (
                <span key={slug}>
                  {i > 0 ? ", " : null}
                  <Link href={`/artists/${slug}`}>{slug}</Link>
                </span>
              ))}
            </p>
          ) : null}
          {track.tags.length > 0 ? (
            <ul className="am-tags">
              {track.tags.map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>
          ) : null}
          <div className="am-detail__actions">
            <PreviewButton tracks={[row]} />
            {wall ? (
              <Link href={`/artists/${wall}`} className="am-textlink">
                Open wall
              </Link>
            ) : null}
            <ProdActions track={row} />
          </div>
        </div>
      </section>
    </div>
  );
}
