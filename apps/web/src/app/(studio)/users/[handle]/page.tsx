import { notFound } from "next/navigation";

import { EditProfileGate } from "@/components/edit-profile-gate";
import { ProfileTracks } from "@/components/profile-tracks";
import { isApiRequestError } from "@/lib/api";
import { getPublicProfile, listUserTracks } from "@/lib/catalog";
import { site } from "@/content/site";
import { formatDuration, type ProdRow } from "@/lib/types";

type Props = {
  params: Promise<{ handle: string }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: Props) {
  const { handle } = await params;
  try {
    const profile = await getPublicProfile(handle);
    if (!profile) return { title: site.name };
    return { title: `${profile.user.display_name} · ${site.name}` };
  } catch {
    return { title: site.name };
  }
}

export default async function UserPage({ params }: Props) {
  const { handle } = await params;

  let profile;
  try {
    profile = await getPublicProfile(handle);
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

  if (!profile) notFound();

  const { user, contacts } = profile;
  const initial = user.display_name.slice(0, 1).toUpperCase();
  const hasContacts =
    Boolean(contacts.public_contact_email) ||
    Boolean(contacts.instagram_url) ||
    (contacts.other_links?.length ?? 0) > 0;

  let tracks: ProdRow[] = [];
  try {
    const list = await listUserTracks(user.handle);
    tracks = list.tracks.map((t) => {
      const wall = t.artist_slugs?.[0];
      return {
        id: t.id,
        title: t.title,
        meta: wall ?? "Wall",
        metaHref: wall ? `/artists/${wall}` : undefined,
        duration: formatDuration(t.duration_seconds),
        durationSeconds: t.duration_seconds,
        audioUrl: t.audio_url,
        wallName: wall,
      };
    });
  } catch {
    tracks = [];
  }

  return (
    <div className="profile">
      <section className="profile__head">
        <div className="profile__avatar" aria-hidden>
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" />
          ) : (
            initial
          )}
        </div>
        <h1>{user.display_name}</h1>
        <p className="profile__handle">@{user.handle}</p>
        {user.bio ? <p className="profile__bio">{user.bio}</p> : null}
        {hasContacts ? (
          <ul className="profile__links">
            {contacts.public_contact_email ? (
              <li>
                <a href={`mailto:${contacts.public_contact_email}`}>
                  {contacts.public_contact_email}
                </a>
              </li>
            ) : null}
            {contacts.instagram_url ? (
              <li>
                <a href={contacts.instagram_url} rel="noreferrer" target="_blank">
                  Instagram
                </a>
              </li>
            ) : null}
            {(contacts.other_links ?? []).map((link) => (
              <li key={link.url}>
                <a href={link.url} rel="noreferrer" target="_blank">
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="profile__actions">
          <EditProfileGate handle={user.handle} />
        </div>
      </section>

      <section className="prods">
        <h2>Productions</h2>
        <ProfileTracks handle={user.handle} tracks={tracks} />
      </section>
    </div>
  );
}
