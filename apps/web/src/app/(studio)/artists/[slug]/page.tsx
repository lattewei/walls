import { notFound } from "next/navigation";

import { ProdList } from "@/components/studio/prod-list";
import type { Prod } from "@/content/profiles";
import { site } from "@/content/site";
import { getWall, walls } from "@/content/walls";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateStaticParams() {
  return walls.map((w) => ({ slug: w.slug }));
}

export async function generateMetadata({ params }: Props) {
  const { slug } = await params;
  const wall = getWall(slug);
  if (!wall) return { title: site.name };
  return { title: `${wall.name} · ${site.name}` };
}

export default async function ArtistWallPage({ params }: Props) {
  const { slug } = await params;
  const wall = getWall(slug);
  if (!wall) notFound();

  const tracks: Prod[] = wall.tracks.map((t) => ({
    id: t.id,
    title: t.title,
    meta: t.producer,
    metaHref: `/users/${t.producerHandle}`,
    duration: t.duration,
  }));

  return (
    <div className="profile">
      <section className="profile__head">
        <div className="profile__cover">
          {wall.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={wall.image} alt="" />
          ) : (
            <span aria-hidden>{wall.name.slice(0, 1)}</span>
          )}
        </div>
        <h1>{wall.name}</h1>
        <p className="profile__handle">
          {wall.badge === "claimed" ? "Claimed wall" : "Community wall"}
        </p>
        {wall.bio ? <p className="profile__bio">{wall.bio}</p> : null}
        {wall.genres.length > 0 ? (
          <ul className="profile__genres">
            {wall.genres.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="prods">
        <h2>Productions</h2>
        <ProdList tracks={tracks} />
      </section>
    </div>
  );
}
