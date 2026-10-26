import { apiUrl } from "./api";

export type PublicArtist = {
  id: string;
  name: string;
  slug: string;
  bio?: string | null;
  avatar_url?: string | null;
  cover_url?: string | null;
  genres: string[];
  looking_for?: string | null;
  claim_status: string;
  badge: string;
  is_official: boolean;
  can_edit?: boolean;
  created_at: string;
};

export type PublicTrack = {
  id: string;
  title: string;
  description?: string | null;
  audio_format?: string | null;
  duration_seconds?: number | null;
  status: string;
  artist_slugs: string[];
  tags: string[];
  uploader_handle?: string;
  uploader_display_name?: string;
  created_at: string;
  audio_url?: string;
  play_count?: number;
};

export type PublicProfileUser = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url?: string | null;
  bio?: string | null;
  created_at: string;
  track_count?: number;
};

export type ExternalLink = {
  label: string;
  url: string;
};

export type PublicContacts = {
  public_contact_email?: string | null;
  instagram_url?: string | null;
  other_links: ExternalLink[];
};

export type ProdRow = {
  id: string;
  title: string;
  meta: string;
  metaHref?: string;
  durationSeconds?: number | null;
  audioUrl?: string;
  coverUrl?: string;
  canWithdraw?: boolean;
  uploaderHandle?: string;
  description?: string | null;
  tags?: string[];
  artistSlugs?: string[];
  detail?: string;
  playCount?: number;
};

export function toProdRow(
  t: PublicTrack,
  extra: Pick<ProdRow, "meta" | "metaHref" | "coverUrl">,
): ProdRow {
  return {
    id: t.id,
    title: t.title,
    meta: extra.meta,
    metaHref: extra.metaHref,
    durationSeconds: t.duration_seconds,
    audioUrl: apiUrl(t.audio_url),
    coverUrl: apiUrl(extra.coverUrl),
    playCount: t.play_count ?? 0,
    uploaderHandle: t.uploader_handle,
    description: t.description ?? null,
    tags: t.tags ?? [],
    artistSlugs: t.artist_slugs ?? [],
    detail: [t.description, t.tags?.length ? t.tags.join(", ") : ""]
      .filter(Boolean)
      .join(" · "),
  };
}

export function formatDuration(seconds?: number | null): string {
  if (seconds == null || seconds < 0 || !Number.isFinite(seconds)) return "—";
  const total = Math.floor(seconds);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function badgeLabel(badge: string, isOfficial: boolean): string {
  if (isOfficial || badge === "claimed") return "Claimed wall";
  if (badge === "pending_claim") return "Claim pending";
  return "Community wall";
}

export type Claim = {
  id: string;
  artist_id: string;
  artist_slug?: string;
  artist_name?: string;
  user_id: string;
  user_handle?: string;
  status: string;
  verification_method: string;
  claim_code: string;
  identity_url?: string | null;
  proof_url?: string | null;
  created_at: string;
};

export type AdminReport = {
  id: string;
  reporter_handle?: string | null;
  target_type: "track" | "artist" | "user";
  target_id: string;
  target_label?: string | null;
  target_slug?: string | null;
  reason: string;
  details?: string | null;
  status: string;
  created_at: string;
};
