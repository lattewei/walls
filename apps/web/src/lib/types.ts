export type PublicContacts = {
  public_contact_email?: string;
  instagram_url?: string;
  other_links: { label: string; url: string }[];
};

export type PublicUser = {
  id: string;
  handle: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  role?: string;
  created_at: string;
};

export type PublicArtist = {
  id: string;
  name: string;
  slug: string;
  bio?: string;
  avatar_url?: string;
  cover_url?: string;
  genres: string[];
  looking_for?: string;
  claim_status: string;
  badge: string;
  is_official: boolean;
  created_at: string;
};

export type PublicTrack = {
  id: string;
  title: string;
  description?: string;
  audio_format?: string;
  duration_seconds?: number;
  status: string;
  artist_slugs: string[];
  tags: string[];
  uploader_handle?: string;
  uploader_display_name?: string;
  created_at: string;
  audio_url?: string;
};

export type AuthResponse = {
  user: PublicUser;
  contacts: PublicContacts;
  access_token: string;
  token_type: string;
  expires_at: string;
};

export type ApiError = {
  error: {
    code: string;
    message: string;
  };
};
