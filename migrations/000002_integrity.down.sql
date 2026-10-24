ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_details_len;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reason_len;
ALTER TABLE artist_claims DROP CONSTRAINT IF EXISTS artist_claims_proof_len;
ALTER TABLE tracks DROP CONSTRAINT IF EXISTS tracks_description_len;
ALTER TABLE tracks DROP CONSTRAINT IF EXISTS tracks_title_len;
ALTER TABLE artists DROP CONSTRAINT IF EXISTS artists_bio_len;
ALTER TABLE artists DROP CONSTRAINT IF EXISTS artists_name_len;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_bio_len;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_display_name_len;
ALTER TABLE tracks DROP CONSTRAINT IF EXISTS tracks_ready_has_audio;

DROP INDEX IF EXISTS reports_open_dedup_idx;
DROP INDEX IF EXISTS reports_target_idx;
DROP INDEX IF EXISTS artist_claims_user_id_idx;
DROP INDEX IF EXISTS artist_claims_one_pending_user_idx;
DROP INDEX IF EXISTS artist_claims_one_accepted_idx;
DROP INDEX IF EXISTS artists_name_trgm_idx;
DROP INDEX IF EXISTS artists_name_norm_unique;

CREATE INDEX artists_name_trgm_idx ON artists (lower(name));

CREATE TABLE IF NOT EXISTS artist_social_links (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    artist_id   UUID NOT NULL REFERENCES artists(id) ON DELETE CASCADE,
    platform    TEXT NOT NULL,
    url         TEXT NOT NULL,
    UNIQUE (artist_id, platform)
);

CREATE TABLE IF NOT EXISTS favorites (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    track_id    UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, track_id)
);

ALTER TABLE users DROP COLUMN IF EXISTS session_version;
