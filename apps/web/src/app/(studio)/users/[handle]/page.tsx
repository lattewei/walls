import { notFound } from "next/navigation";

import { ProdList } from "@/components/studio/prod-list";
import { site } from "@/content/site";
import { getProfile } from "@/content/profiles";

type Props = {
  params: Promise<{ handle: string }>;
};

export async function generateStaticParams() {
  const { profiles } = await import("@/content/profiles");
  return profiles.map((p) => ({ handle: p.handle }));
}

export async function generateMetadata({ params }: Props) {
  const { handle } = await params;
  const profile = getProfile(handle);
  if (!profile) return { title: site.name };
  return { title: `${profile.displayName} · ${site.name}` };
}

export default async function UserPage({ params }: Props) {
  const { handle } = await params;
  const profile = getProfile(handle);
  if (!profile) notFound();

  const initial = profile.displayName.slice(0, 1).toUpperCase();
  const hasContacts =
    Boolean(profile.email) || Boolean(profile.instagram) || profile.links.length > 0;

  return (
    <div className="profile">
      <section className="profile__head">
        <div className="profile__avatar" aria-hidden>
          {initial}
        </div>
        <h1>{profile.displayName}</h1>
        <p className="profile__handle">@{profile.handle}</p>
        {profile.bio ? <p className="profile__bio">{profile.bio}</p> : null}
        {profile.genres.length > 0 ? (
          <ul className="profile__genres">
            {profile.genres.map((g) => (
              <li key={g}>{g}</li>
            ))}
          </ul>
        ) : null}
        {hasContacts ? (
          <ul className="profile__links">
            {profile.email ? (
              <li>
                <a href={`mailto:${profile.email}`}>{profile.email}</a>
              </li>
            ) : null}
            {profile.instagram ? (
              <li>
                <a href={profile.instagram} rel="noreferrer" target="_blank">
                  Instagram
                </a>
              </li>
            ) : null}
            {profile.links.map((link) => (
              <li key={link.url}>
                <a href={link.url} rel="noreferrer" target="_blank">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="prods">
        <h2>Productions</h2>
        <ProdList tracks={profile.tracks} />
      </section>
    </div>
  );
}
