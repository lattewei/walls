import { apiFetch, isApiRequestError } from "./api";
import type { PublicArtist, PublicContacts, PublicProfileUser, PublicTrack } from "./types";

export async function listArtists(limit = 24) {
  return apiFetch<{
    artists: PublicArtist[];
    total: number;
    limit: number;
    offset: number;
  }>(`/api/v1/artists?limit=${limit}&offset=0`);
}

export async function getArtist(slug: string) {
  try {
    const data = await apiFetch<{ artist: PublicArtist }>(
      `/api/v1/artists/${encodeURIComponent(slug)}`,
    );
    return data.artist;
  } catch (err) {
    if (isApiRequestError(err) && err.status === 404) return null;
    throw err;
  }
}

export async function listArtistTracks(slug: string, limit = 50) {
  return apiFetch<{
    tracks: PublicTrack[];
    total: number;
    limit: number;
    offset: number;
  }>(`/api/v1/artists/${encodeURIComponent(slug)}/tracks?limit=${limit}&offset=0`);
}

export async function getPublicProfile(handle: string) {
  try {
    return await apiFetch<{
      user: PublicProfileUser;
      contacts: PublicContacts;
    }>(`/api/v1/users/${encodeURIComponent(handle)}`);
  } catch (err) {
    if (isApiRequestError(err) && err.status === 404) return null;
    throw err;
  }
}

export type CreateArtistInput = {
  name: string;
  slug?: string;
  bio?: string;
  genres?: string[];
  looking_for?: string;
  cover?: File | null;
};

export async function createArtist(input: CreateArtistInput, token: string) {
  if (input.cover) {
    const form = new FormData();
    form.set("name", input.name.trim());
    if (input.slug?.trim()) form.set("slug", input.slug.trim().toLowerCase());
    if (input.bio?.trim()) form.set("bio", input.bio.trim());
    if (input.looking_for?.trim()) form.set("looking_for", input.looking_for.trim());
    if (input.genres?.length) form.set("genres", input.genres.join(","));
    form.set("cover", input.cover);

    const data = await apiFetch<{ artist: PublicArtist }>("/api/v1/artists", {
      method: "POST",
      token,
      body: form,
    });
    return data.artist;
  }

  const body: Record<string, unknown> = {
    name: input.name.trim(),
  };
  if (input.slug?.trim()) body.slug = input.slug.trim().toLowerCase();
  if (input.bio?.trim()) body.bio = input.bio.trim();
  if (input.looking_for?.trim()) body.looking_for = input.looking_for.trim();
  if (input.genres?.length) body.genres = input.genres;

  const data = await apiFetch<{ artist: PublicArtist }>("/api/v1/artists", {
    method: "POST",
    token,
    body: JSON.stringify(body),
  });
  return data.artist;
}

export type UploadTrackInput = {
  title: string;
  description?: string;
  artistSlugs: string[];
  tags?: string[];
  audio: File;
};

export async function uploadTrack(input: UploadTrackInput, token: string) {
  const form = new FormData();
  form.set("title", input.title.trim());
  if (input.description?.trim()) form.set("description", input.description.trim());
  form.set("artist_slugs", input.artistSlugs.join(","));
  if (input.tags?.length) form.set("tags", input.tags.join(","));
  form.set("audio", input.audio);

  const data = await apiFetch<{ track: PublicTrack }>("/api/v1/tracks", {
    method: "POST",
    token,
    body: form,
  });
  return data.track;
}
