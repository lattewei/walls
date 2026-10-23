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
