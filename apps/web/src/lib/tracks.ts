import { apiFetch } from "./api";
import type { PublicTrack } from "./types";

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
  if (input.description?.trim()) {
    form.set("description", input.description.trim());
  }
  form.set("artist_slugs", input.artistSlugs.join(","));
  if (input.tags?.length) {
    form.set("tags", input.tags.join(","));
  }
  form.set("audio", input.audio);

  const data = await apiFetch<{ track: PublicTrack }>("/api/v1/tracks", {
    method: "POST",
    token,
    body: form,
  });
  return data.track;
}
