-- Open Studio — schéma initial
-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- users
CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email           TEXT NOT NULL,
    password_hash   TEXT NOT NULL,
    display_name    TEXT NOT NULL,
    avatar_url      TEXT,
    bio             TEXT,
    role            TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    email_verified_at TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at      TIMESTAMPTZ
);

CREATE UNIQUE INDEX users_email_unique ON users (lower(email)) WHERE deleted_at IS NULL;

-- producer / public contact profile
CREATE TABLE producer_profiles (
    user_id                 UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    public_contact_email    TEXT,
    instagram_url           TEXT,
    other_links             JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- artists (pages)
CREATE TABLE artists (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name            TEXT NOT NULL,
    slug            TEXT NOT NULL,
    bio             TEXT,
    avatar_url      TEXT,
    cover_url       TEXT,
    genres          TEXT[] NOT NULL DEFAULT '{}',
    looking_for     TEXT,
    claim_status    TEXT NOT NULL DEFAULT 'unclaimed'
                    CHECK (claim_status IN ('unclaimed', 'pending', 'claimed')),
    created_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    claimed_by      UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX artists_slug_unique ON artists (lower(slug));
CREATE INDEX artists_name_trgm_idx ON artists (lower(name));

-- artist claims
CREATE TABLE artist_claims (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id             UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    verification_method   TEXT NOT NULL,
    proof_url             TEXT,
    status                TEXT NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'accepted', 'rejected')),
    reviewed_by           UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at           TIMESTAMPTZ
);

CREATE INDEX artist_claims_artist_id_idx ON artist_claims (artist_id);
CREATE INDEX artist_claims_status_idx ON artist_claims (status);

-- official social links on artist page
CREATE TABLE artist_social_links (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id   UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    platform    TEXT NOT NULL,
    url         TEXT NOT NULL,
    UNIQUE (artist_id, platform)
);

-- tracks (productions)
CREATE TABLE tracks (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    uploader_user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title               TEXT NOT NULL,
    description         TEXT,
    audio_object_key    TEXT,
    audio_format        TEXT,
    duration_seconds    INTEGER,
    status              TEXT NOT NULL DEFAULT 'processing'
                        CHECK (status IN ('processing', 'ready', 'failed', 'removed')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    removed_at          TIMESTAMPTZ
);

CREATE INDEX tracks_uploader_idx ON tracks (uploader_user_id);
CREATE INDEX tracks_status_created_idx ON tracks (status, created_at DESC);

-- track ↔ artist mentions (core product link)
CREATE TABLE track_artists (
    track_id    UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    artist_id   UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (track_id, artist_id)
);

CREATE INDEX track_artists_artist_id_idx ON track_artists (artist_id);

-- genre / free tags on tracks
CREATE TABLE track_tags (
    track_id    UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    tag         TEXT NOT NULL,
    PRIMARY KEY (track_id, tag)
);

CREATE INDEX track_tags_tag_idx ON track_tags (lower(tag));

-- favorites (optional early)
CREATE TABLE favorites (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    track_id    UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, track_id)
);

-- moderation reports
CREATE TABLE reports (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
    target_type         TEXT NOT NULL CHECK (target_type IN ('track', 'artist', 'user')),
    target_id           UUID NOT NULL,
    reason              TEXT NOT NULL,
    details             TEXT,
    status              TEXT NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'reviewing', 'resolved', 'dismissed')),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at         TIMESTAMPTZ,
    reviewed_by         UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX reports_status_idx ON reports (status, created_at DESC);
