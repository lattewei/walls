ALTER TABLE tracks
    ADD COLUMN play_count INTEGER NOT NULL DEFAULT 0;

CREATE TABLE track_play_receipts (
    track_id    UUID NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    viewer_key  TEXT NOT NULL,
    day         DATE NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (track_id, viewer_key, day)
);

CREATE INDEX tracks_play_count_idx ON tracks (play_count DESC, created_at DESC)
    WHERE status = 'ready';
