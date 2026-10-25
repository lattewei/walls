DROP INDEX IF EXISTS tracks_play_count_idx;
DROP TABLE IF EXISTS track_play_receipts;
ALTER TABLE tracks DROP COLUMN IF EXISTS play_count;
