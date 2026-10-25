import { apiFetch, isApiRequestError } from "./api";
import type { PublicArtist, PublicContacts, PublicProfileUser, PublicTrack } from "./types";

export async function listArtists(limit = 24, query = "") {
  const q = query.trim();
  const search = q ? `&q=${encodeURIComponent(q)}` : "";
  return apiFetch<{
    artists: PublicArtist[];
    total: number;
    limit: number;
    offset: number;
  }>(`/api/v1/artists?limit=${limit}&offset=0${search}`);
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

export async function listArtistTracks(slug: string, limit = 50, sort: "recent" | "plays" = "recent") {
  return apiFetch<{
    tracks: PublicTrack[];
    total: number;
    limit: number;
    offset: number;
  }>(`/api/v1/artists/${encodeURIComponent(slug)}/tracks?limit=${limit}&offset=0&sort=${sort}`);
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

export async function listUserTracks(handle: string, limit = 50, sort: "recent" | "plays" = "recent") {
  return apiFetch<{
    tracks: PublicTrack[];
    total: number;
    limit: number;
    offset: number;
  }>(`/api/v1/users/${encodeURIComponent(handle)}/tracks?limit=${limit}&offset=0&sort=${sort}`);
}

export async function listTracks(limit = 24, sort: "recent" | "plays" = "plays") {
  return apiFetch<{
    tracks: PublicTrack[];
    total: number;
    limit: number;
    offset: number;
  }>(`/api/v1/tracks?limit=${limit}&offset=0&sort=${sort}`);
}

export async function recordPlay(trackId: string, token?: string | null) {
  try {
    return await apiFetch<{ counted: boolean; play_count: number }>(
      `/api/v1/tracks/${encodeURIComponent(trackId)}/plays`,
      { method: "POST", token: token || undefined },
    );
  } catch {
    return null;
  }
}

export async function listProducers(limit = 24) {
  return apiFetch<{
    producers: PublicProfileUser[];
    total: number;
    limit: number;
    offset: number;
  }>(`/api/v1/producers?limit=${limit}&offset=0`);
}

export async function requestClaim(
  slug: string,
  token: string,
  verificationMethod: string,
  proofUrl: string,
) {
  return apiFetch<{ claim: { id: string; status: string } }>(
    `/api/v1/artists/${encodeURIComponent(slug)}/claims`,
    {
      method: "POST",
      token,
      body: JSON.stringify({
        verification_method: verificationMethod,
        proof_url: proofUrl,
      }),
    },
  );
}

export async function listMyClaims(token: string, limit = 20, offset = 0) {
  return apiFetch<{
    claims: {
      id: string;
      artist_id: string;
      artist_slug?: string;
      status: string;
      verification_method: string;
      proof_url?: string;
      created_at: string;
    }[];
    total: number;
    limit: number;
    offset: number;
  }>(`/api/v1/me/claims?limit=${limit}&offset=${offset}`, { token });
}

export async function reportTarget(
  token: string,
  targetType: "track" | "artist" | "user",
  targetId: string,
  reason: string,
  details: string,
) {
  return apiFetch(`/api/v1/reports`, {
    method: "POST",
    token,
    body: JSON.stringify({
      target_type: targetType,
      target_id: targetId,
      reason,
      details,
    }),
  });
}

export type UpdateTrackInput = {
  title?: string;
  description?: string | null;
  artist_slugs?: string[];
  tags?: string[];
};

export async function updateTrack(trackId: string, input: UpdateTrackInput, token: string) {
  return apiFetch<{ track: PublicTrack }>(`/api/v1/tracks/${encodeURIComponent(trackId)}`, {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
  });
}

export async function withdrawTrack(trackId: string, token: string) {
  return apiFetch<{ status: string }>(`/api/v1/tracks/${encodeURIComponent(trackId)}`, {
    method: "DELETE",
    token,
  });
}

export type UpdateMeInput = {
  display_name?: string;
  bio?: string | null;
  public_contact_email?: string | null;
  instagram_url?: string | null;
  other_links?: { label: string; url: string }[] | null;
};

export async function getMe(token: string) {
  return apiFetch<{
    user: PublicProfileUser & { role?: string };
    contacts: PublicContacts;
  }>("/api/v1/me", { token });
}

export async function updateMe(input: UpdateMeInput, token: string) {
  return apiFetch<{
    user: PublicProfileUser & { role?: string };
    contacts: PublicContacts;
  }>("/api/v1/me", {
    method: "PATCH",
    token,
    body: JSON.stringify(input),
  });
}

export async function deleteMe(token: string) {
  return apiFetch<{ status: string }>("/api/v1/me", { method: "DELETE", token });
}

export async function uploadAvatar(file: File, token: string) {
  const form = new FormData();
  form.set("avatar", file);
  const data = await apiFetch<{ user: PublicProfileUser & { role?: string } }>(
    "/api/v1/me/avatar",
    {
      method: "POST",
      token,
      body: form,
    },
  );
  return data.user;
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

export type UpdateArtistInput = {
  name?: string;
  bio?: string | null;
  genres?: string[];
  looking_for?: string | null;
  cover?: File | null;
};

export async function updateArtist(slug: string, input: UpdateArtistInput, token: string) {
  if (input.cover) {
    const form = new FormData();
    if (input.name != null) form.set("name", input.name);
    if (input.bio != null) form.set("bio", input.bio);
    if (input.looking_for != null) form.set("looking_for", input.looking_for);
    if (input.genres) form.set("genres", input.genres.join(","));
    form.set("cover", input.cover);
    const data = await apiFetch<{ artist: PublicArtist }>(
      `/api/v1/artists/${encodeURIComponent(slug)}`,
      { method: "PATCH", token, body: form },
    );
    return data.artist;
  }
  const body: Record<string, unknown> = {};
  if (input.name != null) body.name = input.name;
  if (input.bio != null) body.bio = input.bio;
  if (input.looking_for != null) body.looking_for = input.looking_for;
  if (input.genres) body.genres = input.genres;
  const data = await apiFetch<{ artist: PublicArtist }>(
    `/api/v1/artists/${encodeURIComponent(slug)}`,
    { method: "PATCH", token, body: JSON.stringify(body) },
  );
  return data.artist;
}
