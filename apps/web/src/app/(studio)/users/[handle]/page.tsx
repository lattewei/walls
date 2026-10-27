import { notFound } from "next/navigation";

import { EditProfileLink } from "@/components/wall-actions";
import { OwnerTrackList } from "@/components/track-list";
import { apiUrl, isApiRequestError } from "@/lib/api";
import { getPublicProfile, listUserTracks } from "@/lib/catalog";
import { site } from "@/content/site";
import { toProdRow, type ProdRow } from "@/lib/types";

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
        <div className="wall">
          <p className="wall__missing">{err.message}</p>
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
  let tracksError: string | null = null;
  try {
    const list = await listUserTracks(user.handle);
    tracks = list.tracks.map((t) => {
      const wall = t.artist_slugs?.[0];
      return toProdRow(t, {
        meta: wall ?? "Wall",
        metaHref: wall ? `/artists/${wall}` : undefined,
      });
    });
  } catch (err) {
    tracksError = isApiRequestError(err) ? err.message : "Could not load productions.";
  }

  return (
    <div className="wall">
      <section className="wall__head">
        <div className="wall__avatar" aria-hidden>
          {user.avatar_url ? <img src={apiUrl(user.avatar_url)} alt="" /> : initial}
        </div>
        <div className="wall__intro">
          <h1>{user.display_name}</h1>
          <p className="wall__handle">@{user.handle}</p>
          {user.bio ? <p className="wall__bio">{user.bio}</p> : null}
          {hasContacts ? (
            <ul className="wall__links">
              {contacts.public_contact_email ? (
                <li>
                  <a href={`mailto:${contacts.public_contact_email}`}>
                    {contacts.public_contact_email}
                  </a>
                </li>
              ) : null}
              {contacts.instagram_url && /^https?:\/\//i.test(contacts.instagram_url) ? (
                <li>
                  <a href={contacts.instagram_url} rel="noreferrer" target="_blank">
                    Instagram
                  </a>
                </li>
              ) : null}
              {(contacts.other_links ?? [])
                .filter((link) => /^https?:\/\//i.test(link.url))
                .map((link) => (
                  <li key={link.url}>
                    <a href={link.url} rel="noreferrer" target="_blank">
                      {link.label}
                    </a>
                  </li>
                ))}
            </ul>
          ) : null}
          <div className="wall__actions">
            <EditProfileLink handle={user.handle} />
          </div>
        </div>
      </section>

      <section className="tracks">
        <h2>Productions</h2>
        <OwnerTrackList handle={user.handle} tracks={tracks} loadError={tracksError} />
      </section>
    </div>
  );
}
