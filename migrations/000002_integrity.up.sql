-- Session revocation, real search index, and the constraints the app already claims.

ALTER TABLE users
    ADD COLUMN session_version INTEGER NOT NULL DEFAULT 1;

DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS artist_social_links;

DROP INDEX IF EXISTS artists_name_trgm_idx;

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE UNIQUE INDEX artists_name_norm_unique ON artists (
    lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))
);

CREATE INDEX artists_name_trgm_idx ON artists USING gin (name gin_trgm_ops);

CREATE UNIQUE INDEX artist_claims_one_accepted_idx
    ON artist_claims (artist_id)
    WHERE status = 'accepted';

CREATE UNIQUE INDEX artist_claims_one_pending_user_idx
    ON artist_claims (artist_id, user_id)
    WHERE status = 'pending';

CREATE INDEX artist_claims_user_id_idx ON artist_claims (user_id);

CREATE INDEX reports_target_idx ON reports (target_type, target_id);

CREATE UNIQUE INDEX reports_open_dedup_idx
    ON reports (reporter_user_id, target_type, target_id)
    WHERE status = 'open' AND reporter_user_id IS NOT NULL;

ALTER TABLE tracks
    ADD CONSTRAINT tracks_ready_has_audio
    CHECK (status <> 'ready' OR audio_object_key IS NOT NULL);

ALTER TABLE users
    ADD CONSTRAINT users_display_name_len CHECK (char_length(display_name) BETWEEN 1 AND 64),
    ADD CONSTRAINT users_bio_len CHECK (bio IS NULL OR char_length(bio) <= 500);

ALTER TABLE artists
    ADD CONSTRAINT artists_name_len CHECK (char_length(name) BETWEEN 1 AND 100),
    ADD CONSTRAINT artists_bio_len CHECK (bio IS NULL OR char_length(bio) <= 2000);

ALTER TABLE tracks
    ADD CONSTRAINT tracks_title_len CHECK (char_length(title) BETWEEN 1 AND 120),
    ADD CONSTRAINT tracks_description_len CHECK (description IS NULL OR char_length(description) <= 2000);

ALTER TABLE artist_claims
    ADD CONSTRAINT artist_claims_proof_len CHECK (proof_url IS NULL OR char_length(proof_url) <= 500);

ALTER TABLE reports
    ADD CONSTRAINT reports_reason_len CHECK (char_length(reason) BETWEEN 1 AND 200),
    ADD CONSTRAINT reports_details_len CHECK (details IS NULL OR char_length(details) <= 2000);
