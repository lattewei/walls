package moderation

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("report not found")

type Report struct {
	ID             string
	ReporterUserID *string
	ReporterHandle *string
	TargetType     string
	TargetID       string
	TargetLabel    *string
	TargetSlug     *string
	Reason         string
	Details        *string
	Status         string
	CreatedAt      time.Time
	ReviewedAt     *time.Time
	ReviewedBy     *string
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// Report rows carry the human labels the admin console needs. Joining once
// keeps the API honest instead of making the client resolve three target types.
const reportSelect = `
	SELECT r.id, r.reporter_user_id, ru.handle,
	       r.target_type, r.target_id,
	       CASE r.target_type
	           WHEN 'track' THEN t.title
	           WHEN 'artist' THEN a.name
	           WHEN 'user' THEN u.display_name
	       END AS target_label,
	       CASE r.target_type
	           WHEN 'artist' THEN a.slug
	           WHEN 'user' THEN u.handle
	       END AS target_slug,
	       r.reason, r.details, r.status, r.created_at, r.reviewed_at, r.reviewed_by
	FROM reports r
	LEFT JOIN users ru ON ru.id = r.reporter_user_id
	LEFT JOIN tracks t ON r.target_type = 'track' AND t.id = r.target_id
	LEFT JOIN artists a ON r.target_type = 'artist' AND a.id = r.target_id
	LEFT JOIN users u ON r.target_type = 'user' AND u.id = r.target_id
`

func scanReport(row scannable) (Report, error) {
	var rep Report
	err := row.Scan(
		&rep.ID, &rep.ReporterUserID, &rep.ReporterHandle,
		&rep.TargetType, &rep.TargetID, &rep.TargetLabel, &rep.TargetSlug,
		&rep.Reason, &rep.Details, &rep.Status, &rep.CreatedAt, &rep.ReviewedAt, &rep.ReviewedBy,
	)
	return rep, err
}

func (r *Repository) GetByID(ctx context.Context, id string) (Report, error) {
	rep, err := scanReport(r.pool.QueryRow(ctx, reportSelect+` WHERE r.id = $1`, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return Report{}, ErrNotFound
	}
	if err != nil {
		return Report{}, err
	}
	return rep, nil
}

func (r *Repository) TargetExists(ctx context.Context, targetType, targetID string) (bool, error) {
	var q string
	switch targetType {
	case "track":
		q = `SELECT EXISTS(SELECT 1 FROM tracks WHERE id = $1 AND status <> 'removed')`
	case "artist":
		q = `SELECT EXISTS(SELECT 1 FROM artists WHERE id = $1)`
	case "user":
		q = `SELECT EXISTS(SELECT 1 FROM users WHERE id = $1 AND deleted_at IS NULL)`
	default:
		return false, nil
	}
	var ok bool
	if err := r.pool.QueryRow(ctx, q, targetID).Scan(&ok); err != nil {
		return false, err
	}
	return ok, nil
}

func (r *Repository) Create(ctx context.Context, reporterID *string, targetType, targetID, reason string, details *string) (Report, error) {
	const q = `
		INSERT INTO reports (reporter_user_id, target_type, target_id, reason, details)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id
	`
	var id string
	if err := r.pool.QueryRow(ctx, q, reporterID, targetType, targetID, reason, details).Scan(&id); err != nil {
		return Report{}, fmt.Errorf("create report: %w", err)
	}
	return r.GetByID(ctx, id)
}

func (r *Repository) List(ctx context.Context, status string, limit, offset int) ([]Report, int, error) {
	var total int
	var err error
	if status == "" {
		err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM reports`).Scan(&total)
	} else {
		err = r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM reports WHERE status = $1`, status).Scan(&total)
	}
	if err != nil {
		return nil, 0, err
	}

	var rows pgx.Rows
	if status == "" {
		rows, err = r.pool.Query(ctx, reportSelect+`
			ORDER BY r.created_at DESC LIMIT $1 OFFSET $2
		`, limit, offset)
	} else {
		rows, err = r.pool.Query(ctx, reportSelect+`
			WHERE r.status = $1 ORDER BY r.created_at DESC LIMIT $2 OFFSET $3
		`, status, limit, offset)
	}
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	out := []Report{}
	for rows.Next() {
		rep, err := scanReport(rows)
		if err != nil {
			return nil, 0, err
		}
		out = append(out, rep)
	}
	return out, total, rows.Err()
}

func (r *Repository) UpdateStatus(ctx context.Context, id, status, reviewerID string) (Report, error) {
	const q = `
		UPDATE reports
		SET status = $2, reviewed_at = now(), reviewed_by = $3
		WHERE id = $1
		RETURNING id
	`
	var updated string
	err := r.pool.QueryRow(ctx, q, id, status, reviewerID).Scan(&updated)
	if errors.Is(err, pgx.ErrNoRows) {
		return Report{}, ErrNotFound
	}
	if err != nil {
		return Report{}, err
	}
	return r.GetByID(ctx, updated)
}

type scannable interface {
	Scan(dest ...any) error
}
