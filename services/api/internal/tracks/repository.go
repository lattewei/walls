package tracks

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/lattewei/walls/services/api/internal/domain"
)

var ErrNotFound = errors.New("track not found")

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

type CreateInput struct {
	UploaderUserID string
	Title          string
	Description    *string
	AudioObjectKey string
	AudioFormat    string
	Status         string
	ArtistIDs      []string
	Tags           []string
}

func (r *Repository) Create(ctx context.Context, in CreateInput) (domain.Track, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return domain.Track{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	const insertTrack = `
		INSERT INTO tracks (uploader_user_id, title, description, audio_object_key, audio_format, status)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, uploader_user_id, title, description, audio_object_key, audio_format,
		          duration_seconds, status, created_at, updated_at, removed_at
	`
	t, err := scanTrack(tx.QueryRow(ctx, insertTrack,
		in.UploaderUserID, in.Title, in.Description, in.AudioObjectKey, in.AudioFormat, in.Status,
	))
	if err != nil {
		return domain.Track{}, fmt.Errorf("insert track: %w", err)
	}

	for _, artistID := range in.ArtistIDs {
		if _, err := tx.Exec(ctx,
			`INSERT INTO track_artists (track_id, artist_id) VALUES ($1, $2)`,
			t.ID, artistID,
		); err != nil {
			return domain.Track{}, fmt.Errorf("link artist: %w", err)
		}
	}
	for _, tag := range in.Tags {
		if _, err := tx.Exec(ctx,
			`INSERT INTO track_tags (track_id, tag) VALUES ($1, $2)`,
			t.ID, tag,
		); err != nil {
			return domain.Track{}, fmt.Errorf("link tag: %w", err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return domain.Track{}, fmt.Errorf("commit: %w", err)
	}

	return r.GetByID(ctx, t.ID)
}

func (r *Repository) GetByID(ctx context.Context, id string) (domain.Track, error) {
	const q = `
		SELECT t.id, t.uploader_user_id, t.title, t.description, t.audio_object_key, t.audio_format,
		       t.duration_seconds, t.status, t.created_at, t.updated_at, t.removed_at,
		       u.handle, u.display_name
		FROM tracks t
		JOIN users u ON u.id = t.uploader_user_id
		WHERE t.id = $1
	`
	t, err := scanTrackWithUploader(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Track{}, ErrNotFound
	}
	if err != nil {
		return domain.Track{}, fmt.Errorf("get track: %w", err)
	}
	if err := r.attachMeta(ctx, &t); err != nil {
		return domain.Track{}, err
	}
	return t, nil
}

func (r *Repository) ListByArtistSlug(ctx context.Context, slug string, limit, offset int) ([]domain.Track, int, error) {
	const countQ = `
		SELECT COUNT(*)
		FROM tracks t
		JOIN track_artists ta ON ta.track_id = t.id
		JOIN artists a ON a.id = ta.artist_id
		WHERE lower(a.slug) = lower($1) AND t.status = 'ready'
	`
	var total int
	if err := r.pool.QueryRow(ctx, countQ, slug).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count tracks: %w", err)
	}

	const listQ = `
		SELECT t.id, t.uploader_user_id, t.title, t.description, t.audio_object_key, t.audio_format,
		       t.duration_seconds, t.status, t.created_at, t.updated_at, t.removed_at,
		       u.handle, u.display_name
		FROM tracks t
		JOIN track_artists ta ON ta.track_id = t.id
		JOIN artists a ON a.id = ta.artist_id
		JOIN users u ON u.id = t.uploader_user_id
		WHERE lower(a.slug) = lower($1) AND t.status = 'ready'
		ORDER BY t.created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.pool.Query(ctx, listQ, slug, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list tracks: %w", err)
	}
	defer rows.Close()

	out := make([]domain.Track, 0, limit)
	for rows.Next() {
		t, err := scanTrackWithUploader(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, t)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	for i := range out {
		if err := r.attachMeta(ctx, &out[i]); err != nil {
			return nil, 0, err
		}
	}
	return out, total, nil
}

func (r *Repository) ListByUploaderHandle(ctx context.Context, handle string, limit, offset int) ([]domain.Track, int, error) {
	const countQ = `
		SELECT COUNT(*)
		FROM tracks t
		JOIN users u ON u.id = t.uploader_user_id
		WHERE lower(u.handle) = lower($1) AND t.status = 'ready' AND u.deleted_at IS NULL
	`
	var total int
	if err := r.pool.QueryRow(ctx, countQ, handle).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count uploader tracks: %w", err)
	}

	const listQ = `
		SELECT t.id, t.uploader_user_id, t.title, t.description, t.audio_object_key, t.audio_format,
		       t.duration_seconds, t.status, t.created_at, t.updated_at, t.removed_at,
		       u.handle, u.display_name
		FROM tracks t
		JOIN users u ON u.id = t.uploader_user_id
		WHERE lower(u.handle) = lower($1) AND t.status = 'ready' AND u.deleted_at IS NULL
		ORDER BY t.created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.pool.Query(ctx, listQ, handle, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list uploader tracks: %w", err)
	}
	defer rows.Close()

	out := make([]domain.Track, 0, limit)
	for rows.Next() {
		t, err := scanTrackWithUploader(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, t)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	for i := range out {
		if err := r.attachMeta(ctx, &out[i]); err != nil {
			return nil, 0, err
		}
	}
	return out, total, nil
}

func (r *Repository) ListProducers(ctx context.Context, limit, offset int) ([]domain.PublicProfileUser, int, error) {
	const countQ = `
		SELECT COUNT(DISTINCT u.id)
		FROM users u
		JOIN tracks t ON t.uploader_user_id = u.id AND t.status = 'ready'
		WHERE u.deleted_at IS NULL
	`
	var total int
	if err := r.pool.QueryRow(ctx, countQ).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count producers: %w", err)
	}

	const listQ = `
		SELECT u.id, u.handle, u.display_name, u.avatar_url, u.bio, u.created_at,
		       COUNT(t.id) AS track_count
		FROM users u
		JOIN tracks t ON t.uploader_user_id = u.id AND t.status = 'ready'
		WHERE u.deleted_at IS NULL
		GROUP BY u.id, u.handle, u.display_name, u.avatar_url, u.bio, u.created_at
		ORDER BY track_count DESC, u.created_at DESC
		LIMIT $1 OFFSET $2
	`
	rows, err := r.pool.Query(ctx, listQ, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list producers: %w", err)
	}
	defer rows.Close()

	out := make([]domain.PublicProfileUser, 0, limit)
	for rows.Next() {
		var u domain.PublicProfileUser
		var created time.Time
		if err := rows.Scan(&u.ID, &u.Handle, &u.DisplayName, &u.AvatarURL, &u.Bio, &created, &u.TrackCount); err != nil {
			return nil, 0, fmt.Errorf("scan producer: %w", err)
		}
		u.CreatedAt = created.UTC().Format(time.RFC3339)
		out = append(out, u)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *Repository) SoftDelete(ctx context.Context, id, uploaderID string) error {
	const q = `
		UPDATE tracks
		SET status = 'removed', removed_at = now(), updated_at = now()
		WHERE id = $1 AND uploader_user_id = $2 AND status <> 'removed'
	`
	tag, err := r.pool.Exec(ctx, q, id, uploaderID)
	if err != nil {
		return fmt.Errorf("soft delete track: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) Hide(ctx context.Context, id string) error {
	const q = `
		UPDATE tracks
		SET status = 'removed', removed_at = now(), updated_at = now()
		WHERE id = $1 AND status <> 'removed'
	`
	tag, err := r.pool.Exec(ctx, q, id)
	if err != nil {
		return fmt.Errorf("hide track: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (r *Repository) CountCreatedSince(ctx context.Context, userID string, since time.Time) (int, error) {
	const q = `
		SELECT COUNT(*) FROM tracks
		WHERE uploader_user_id = $1 AND created_at >= $2
	`
	var n int
	if err := r.pool.QueryRow(ctx, q, userID, since).Scan(&n); err != nil {
		return 0, fmt.Errorf("count uploads: %w", err)
	}
	return n, nil
}

func (r *Repository) attachMeta(ctx context.Context, t *domain.Track) error {
	const artistsQ = `
		SELECT a.id, a.slug
		FROM track_artists ta
		JOIN artists a ON a.id = ta.artist_id
		WHERE ta.track_id = $1
		ORDER BY a.slug
	`
	rows, err := r.pool.Query(ctx, artistsQ, t.ID)
	if err != nil {
		return fmt.Errorf("track artists: %w", err)
	}
	defer rows.Close()
	t.ArtistIDs = []string{}
	t.ArtistSlugs = []string{}
	for rows.Next() {
		var id, slug string
		if err := rows.Scan(&id, &slug); err != nil {
			return err
		}
		t.ArtistIDs = append(t.ArtistIDs, id)
		t.ArtistSlugs = append(t.ArtistSlugs, slug)
	}

	const tagsQ = `SELECT tag FROM track_tags WHERE track_id = $1 ORDER BY tag`
	tagRows, err := r.pool.Query(ctx, tagsQ, t.ID)
	if err != nil {
		return fmt.Errorf("track tags: %w", err)
	}
	defer tagRows.Close()
	t.Tags = []string{}
	for tagRows.Next() {
		var tag string
		if err := tagRows.Scan(&tag); err != nil {
			return err
		}
		t.Tags = append(t.Tags, tag)
	}
	return nil
}

type scannable interface {
	Scan(dest ...any) error
}

func scanTrack(row scannable) (domain.Track, error) {
	var t domain.Track
	var desc, key, format *string
	var dur *int
	var removed *time.Time
	err := row.Scan(
		&t.ID, &t.UploaderUserID, &t.Title, &desc, &key, &format,
		&dur, &t.Status, &t.CreatedAt, &t.UpdatedAt, &removed,
	)
	if err != nil {
		return domain.Track{}, err
	}
	t.Description = desc
	t.AudioObjectKey = key
	t.AudioFormat = format
	t.DurationSeconds = dur
	t.RemovedAt = removed
	return t, nil
}

func scanTrackWithUploader(row scannable) (domain.Track, error) {
	var t domain.Track
	var desc, key, format *string
	var dur *int
	var removed *time.Time
	err := row.Scan(
		&t.ID, &t.UploaderUserID, &t.Title, &desc, &key, &format,
		&dur, &t.Status, &t.CreatedAt, &t.UpdatedAt, &removed,
		&t.UploaderHandle, &t.UploaderName,
	)
	if err != nil {
		return domain.Track{}, err
	}
	t.Description = desc
	t.AudioObjectKey = key
	t.AudioFormat = format
	t.DurationSeconds = dur
	t.RemovedAt = removed
	return t, nil
}
