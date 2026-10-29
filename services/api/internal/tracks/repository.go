package tracks

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/lattewei/walls/services/api/internal/domain"
)

var (
	ErrNotFound   = errors.New("track not found")
	ErrDailyLimit = errors.New("daily upload limit")
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

type CreateInput struct {
	UploaderUserID  string
	Title           string
	Description     *string
	AudioObjectKey  string
	AudioFormat     string
	DurationSeconds *int
	Status          string
	ArtistIDs       []string
	Tags            []string
	Since           time.Time
	DailyLimit      int
}

func (r *Repository) Create(ctx context.Context, in CreateInput) (domain.Track, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return domain.Track{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var locked string
	err = tx.QueryRow(ctx, `
		SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL FOR UPDATE
	`, in.UploaderUserID).Scan(&locked)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Track{}, ErrNotFound
	}
	if err != nil {
		return domain.Track{}, fmt.Errorf("lock uploader: %w", err)
	}
	if in.DailyLimit > 0 {
		var n int
		if err := tx.QueryRow(ctx, `
			SELECT COUNT(*) FROM tracks
			WHERE uploader_user_id = $1 AND created_at >= $2
		`, in.UploaderUserID, in.Since).Scan(&n); err != nil {
			return domain.Track{}, fmt.Errorf("count uploads: %w", err)
		}
		if n >= in.DailyLimit {
			return domain.Track{}, ErrDailyLimit
		}
	}

	const insertTrack = `
		INSERT INTO tracks (uploader_user_id, title, description, audio_object_key, audio_format, duration_seconds, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, uploader_user_id, title, description, audio_object_key, audio_format,
		          duration_seconds, status, created_at, updated_at, removed_at
	`
	t, err := scanTrack(tx.QueryRow(ctx, insertTrack,
		in.UploaderUserID, in.Title, in.Description, in.AudioObjectKey, in.AudioFormat, in.DurationSeconds, in.Status,
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

	if err := tx.QueryRow(ctx, `SELECT handle, display_name FROM users WHERE id = $1`, in.UploaderUserID).
		Scan(&t.UploaderHandle, &t.UploaderName); err != nil {
		return domain.Track{}, fmt.Errorf("uploader: %w", err)
	}
	if err := attachMeta(ctx, tx, &t); err != nil {
		return domain.Track{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.Track{}, fmt.Errorf("commit: %w", err)
	}
	return t, nil
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
	if err := attachMeta(ctx, r.pool, &t); err != nil {
		return domain.Track{}, err
	}
	return t, nil
}

func trackOrder(sort string) string {
	if sort == "plays" {
		return "t.play_count DESC, t.created_at DESC"
	}
	return "t.created_at DESC"
}

func (r *Repository) ListByArtistSlug(ctx context.Context, slug string, limit, offset int, sort string) ([]domain.Track, int, error) {
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

	listQ := `
		SELECT t.id, t.uploader_user_id, t.title, t.description, t.audio_object_key, t.audio_format,
		       t.duration_seconds, t.status, t.created_at, t.updated_at, t.removed_at,
		       u.handle, u.display_name
		FROM tracks t
		JOIN track_artists ta ON ta.track_id = t.id
		JOIN artists a ON a.id = ta.artist_id
		JOIN users u ON u.id = t.uploader_user_id
		WHERE lower(a.slug) = lower($1) AND t.status = 'ready'
		ORDER BY ` + trackOrder(sort) + `
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
		if err := attachMeta(ctx, r.pool, &out[i]); err != nil {
			return nil, 0, err
		}
	}
	return out, total, nil
}

func (r *Repository) ListByUploaderHandle(ctx context.Context, handle string, limit, offset int, sort string) ([]domain.Track, int, error) {
	var exists bool
	if err := r.pool.QueryRow(ctx, `
		SELECT EXISTS(SELECT 1 FROM users WHERE lower(handle) = lower($1) AND deleted_at IS NULL)
	`, handle).Scan(&exists); err != nil {
		return nil, 0, fmt.Errorf("uploader exists: %w", err)
	}
	if !exists {
		return nil, 0, ErrNotFound
	}

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

	listQ := `
		SELECT t.id, t.uploader_user_id, t.title, t.description, t.audio_object_key, t.audio_format,
		       t.duration_seconds, t.status, t.created_at, t.updated_at, t.removed_at,
		       u.handle, u.display_name
		FROM tracks t
		JOIN users u ON u.id = t.uploader_user_id
		WHERE lower(u.handle) = lower($1) AND t.status = 'ready' AND u.deleted_at IS NULL
		ORDER BY ` + trackOrder(sort) + `
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
		if err := attachMeta(ctx, r.pool, &out[i]); err != nil {
			return nil, 0, err
		}
	}
	return out, total, nil
}

type WallActivityRow struct {
	ArtistSlug string
	ArtistName string
	Track      domain.Track
}

func (r *Repository) ListWallActivity(ctx context.Context, claimedBy string, since time.Time, limit, offset int) ([]WallActivityRow, int, error) {
	const countQ = `
		SELECT COUNT(*)
		FROM tracks t
		JOIN track_artists ta ON ta.track_id = t.id
		JOIN artists a ON a.id = ta.artist_id
		JOIN users u ON u.id = t.uploader_user_id
		WHERE a.claimed_by = $1
		  AND a.claim_status = 'claimed'
		  AND a.hidden_at IS NULL
		  AND t.status = 'ready'
		  AND t.created_at >= $2
		  AND u.deleted_at IS NULL
	`
	var total int
	if err := r.pool.QueryRow(ctx, countQ, claimedBy, since).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count wall activity: %w", err)
	}

	const listQ = `
		SELECT t.id, t.uploader_user_id, t.title, t.description, t.audio_object_key, t.audio_format,
		       t.duration_seconds, t.status, t.created_at, t.updated_at, t.removed_at,
		       u.handle, u.display_name, a.slug, a.name
		FROM tracks t
		JOIN track_artists ta ON ta.track_id = t.id
		JOIN artists a ON a.id = ta.artist_id
		JOIN users u ON u.id = t.uploader_user_id
		WHERE a.claimed_by = $1
		  AND a.claim_status = 'claimed'
		  AND a.hidden_at IS NULL
		  AND t.status = 'ready'
		  AND t.created_at >= $2
		  AND u.deleted_at IS NULL
		ORDER BY t.created_at DESC
		LIMIT $3 OFFSET $4
	`
	rows, err := r.pool.Query(ctx, listQ, claimedBy, since, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list wall activity: %w", err)
	}
	defer rows.Close()

	out := make([]WallActivityRow, 0, limit)
	for rows.Next() {
		var t domain.Track
		var desc, key, format *string
		var dur *int
		var removed *time.Time
		var slug, name string
		if err := rows.Scan(
			&t.ID, &t.UploaderUserID, &t.Title, &desc, &key, &format,
			&dur, &t.Status, &t.CreatedAt, &t.UpdatedAt, &removed,
			&t.UploaderHandle, &t.UploaderName, &slug, &name,
		); err != nil {
			return nil, 0, fmt.Errorf("scan wall activity: %w", err)
		}
		t.Description = desc
		t.AudioObjectKey = key
		t.AudioFormat = format
		t.DurationSeconds = dur
		t.RemovedAt = removed
		out = append(out, WallActivityRow{ArtistSlug: slug, ArtistName: name, Track: t})
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	for i := range out {
		if err := attachMeta(ctx, r.pool, &out[i].Track); err != nil {
			return nil, 0, err
		}
	}
	return out, total, nil
}

func (r *Repository) ListProducers(ctx context.Context, query string, limit, offset int) ([]domain.PublicProfileUser, int, error) {
	pattern := ""
	if query != "" {
		pattern = "%" + escapeILIKE(query) + "%"
	}

	const countQ = `
		SELECT COUNT(DISTINCT u.id)
		FROM users u
		JOIN tracks t ON t.uploader_user_id = u.id AND t.status = 'ready'
		WHERE u.deleted_at IS NULL
		  AND ($1 = '' OR u.handle ILIKE $1 ESCAPE '\' OR u.display_name ILIKE $1 ESCAPE '\')
	`
	var total int
	if err := r.pool.QueryRow(ctx, countQ, pattern).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count producers: %w", err)
	}

	const listQ = `
		SELECT u.id, u.handle, u.display_name, u.avatar_url, u.bio, u.created_at,
		       COUNT(t.id) AS track_count
		FROM users u
		JOIN tracks t ON t.uploader_user_id = u.id AND t.status = 'ready'
		WHERE u.deleted_at IS NULL
		  AND ($1 = '' OR u.handle ILIKE $1 ESCAPE '\' OR u.display_name ILIKE $1 ESCAPE '\')
		GROUP BY u.id, u.handle, u.display_name, u.avatar_url, u.bio, u.created_at
		ORDER BY track_count DESC, u.created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.pool.Query(ctx, listQ, pattern, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list producers: %w", err)
	}
	defer rows.Close()

	out := make([]domain.PublicProfileUser, 0, limit)
	for rows.Next() {
		var u domain.User
		var created time.Time
		var trackCount int
		if err := rows.Scan(&u.ID, &u.Handle, &u.DisplayName, &u.AvatarURL, &u.Bio, &created, &trackCount); err != nil {
			return nil, 0, fmt.Errorf("scan producer: %w", err)
		}
		u.CreatedAt = created
		p := u.ToPublicProfile()
		p.TrackCount = trackCount
		out = append(out, p)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, err
	}
	return out, total, nil
}

func (r *Repository) ListReady(ctx context.Context, limit, offset int, sort string) ([]domain.Track, int, error) {
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM tracks WHERE status = 'ready'`).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count ready tracks: %w", err)
	}
	listQ := `
		SELECT t.id, t.uploader_user_id, t.title, t.description, t.audio_object_key, t.audio_format,
		       t.duration_seconds, t.status, t.created_at, t.updated_at, t.removed_at,
		       u.handle, u.display_name
		FROM tracks t
		JOIN users u ON u.id = t.uploader_user_id
		WHERE t.status = 'ready' AND u.deleted_at IS NULL
		ORDER BY ` + trackOrder(sort) + `
		LIMIT $1 OFFSET $2
	`
	rows, err := r.pool.Query(ctx, listQ, limit, offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list ready tracks: %w", err)
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
		if err := attachMeta(ctx, r.pool, &out[i]); err != nil {
			return nil, 0, err
		}
	}
	return out, total, nil
}

func (r *Repository) RecordPlay(ctx context.Context, trackID, viewerKey string) (counted bool, playCount int, err error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return false, 0, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	var status string
	err = tx.QueryRow(ctx, `
		SELECT status, play_count FROM tracks WHERE id = $1 FOR UPDATE
	`, trackID).Scan(&status, &playCount)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, 0, ErrNotFound
	}
	if err != nil {
		return false, 0, err
	}
	if status != domain.TrackReady {
		return false, 0, ErrNotFound
	}

	tag, err := tx.Exec(ctx, `
		INSERT INTO track_play_receipts (track_id, viewer_key, day)
		VALUES ($1, $2, (timezone('utc', now()))::date)
		ON CONFLICT DO NOTHING
	`, trackID, viewerKey)
	if err != nil {
		return false, 0, fmt.Errorf("play receipt: %w", err)
	}
	if tag.RowsAffected() == 0 {
		if err := tx.Commit(ctx); err != nil {
			return false, playCount, err
		}
		return false, playCount, nil
	}
	if err := tx.QueryRow(ctx, `
		UPDATE tracks SET play_count = play_count + 1 WHERE id = $1
		RETURNING play_count
	`, trackID).Scan(&playCount); err != nil {
		return false, 0, err
	}
	if err := tx.Commit(ctx); err != nil {
		return false, 0, err
	}
	return true, playCount, nil
}

func (r *Repository) Update(ctx context.Context, id, title string, description *string, artistIDs, tags []string) (domain.Track, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return domain.Track{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	const q = `
		UPDATE tracks
		SET title = $2, description = $3, updated_at = now()
		WHERE id = $1 AND status <> 'removed'
		RETURNING id, uploader_user_id, title, description, audio_object_key, audio_format,
		          duration_seconds, status, created_at, updated_at, removed_at
	`
	t, err := scanTrack(tx.QueryRow(ctx, q, id, title, description))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Track{}, ErrNotFound
	}
	if err != nil {
		return domain.Track{}, fmt.Errorf("update track: %w", err)
	}

	if _, err := tx.Exec(ctx, `DELETE FROM track_artists WHERE track_id = $1`, id); err != nil {
		return domain.Track{}, fmt.Errorf("clear artists: %w", err)
	}
	for _, artistID := range artistIDs {
		if _, err := tx.Exec(ctx, `INSERT INTO track_artists (track_id, artist_id) VALUES ($1, $2)`, id, artistID); err != nil {
			return domain.Track{}, fmt.Errorf("link artist: %w", err)
		}
	}
	if _, err := tx.Exec(ctx, `DELETE FROM track_tags WHERE track_id = $1`, id); err != nil {
		return domain.Track{}, fmt.Errorf("clear tags: %w", err)
	}
	for _, tag := range tags {
		if _, err := tx.Exec(ctx, `INSERT INTO track_tags (track_id, tag) VALUES ($1, $2)`, id, tag); err != nil {
			return domain.Track{}, fmt.Errorf("link tag: %w", err)
		}
	}

	if err := tx.QueryRow(ctx, `SELECT handle, display_name FROM users WHERE id = $1`, t.UploaderUserID).
		Scan(&t.UploaderHandle, &t.UploaderName); err != nil {
		return domain.Track{}, fmt.Errorf("uploader: %w", err)
	}
	if err := attachMeta(ctx, tx, &t); err != nil {
		return domain.Track{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.Track{}, fmt.Errorf("commit: %w", err)
	}
	return t, nil
}

func (r *Repository) SoftDelete(ctx context.Context, id, uploaderID string) (*string, error) {
	const q = `
		WITH old AS (
			SELECT id, audio_object_key
			FROM tracks
			WHERE id = $1 AND uploader_user_id = $2 AND status <> 'removed'
		)
		UPDATE tracks t
		SET status = 'removed', removed_at = now(), updated_at = now(), audio_object_key = NULL
		FROM old
		WHERE t.id = old.id
		RETURNING old.audio_object_key
	`
	var key *string
	err := r.pool.QueryRow(ctx, q, id, uploaderID).Scan(&key)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("soft delete track: %w", err)
	}
	return key, nil
}

func (r *Repository) Hide(ctx context.Context, id string) (*string, error) {
	const q = `
		WITH old AS (
			SELECT id, audio_object_key
			FROM tracks
			WHERE id = $1 AND status <> 'removed'
		)
		UPDATE tracks t
		SET status = 'removed', removed_at = now(), updated_at = now(), audio_object_key = NULL
		FROM old
		WHERE t.id = old.id
		RETURNING old.audio_object_key
	`
	var key *string
	err := r.pool.QueryRow(ctx, q, id).Scan(&key)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("hide track: %w", err)
	}
	return key, nil
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

type rowQuery interface {
	Query(ctx context.Context, sql string, args ...any) (pgx.Rows, error)
}

func attachMeta(ctx context.Context, q rowQuery, t *domain.Track) error {
	const artistsQ = `
		SELECT a.id, a.slug
		FROM track_artists ta
		JOIN artists a ON a.id = ta.artist_id
		WHERE ta.track_id = $1
		ORDER BY a.slug
	`
	rows, err := q.Query(ctx, artistsQ, t.ID)
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
	if err := rows.Err(); err != nil {
		return err
	}

	const tagsQ = `SELECT tag FROM track_tags WHERE track_id = $1 ORDER BY tag`
	tagRows, err := q.Query(ctx, tagsQ, t.ID)
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
	if err := tagRows.Err(); err != nil {
		return err
	}

	pcRows, err := q.Query(ctx, `SELECT play_count FROM tracks WHERE id = $1`, t.ID)
	if err != nil {
		return fmt.Errorf("play count: %w", err)
	}
	defer pcRows.Close()
	if pcRows.Next() {
		if err := pcRows.Scan(&t.PlayCount); err != nil {
			return err
		}
	}
	return pcRows.Err()
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

func escapeILIKE(s string) string {
	replacer := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return replacer.Replace(s)
}
