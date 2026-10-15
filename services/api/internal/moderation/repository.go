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
	TargetType     string
	TargetID       string
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

func (r *Repository) Create(ctx context.Context, reporterID *string, targetType, targetID, reason string, details *string) (Report, error) {
	const q = `
		INSERT INTO reports (reporter_user_id, target_type, target_id, reason, details)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, reporter_user_id, target_type, target_id, reason, details, status, created_at, reviewed_at, reviewed_by
	`
	var rep Report
	err := r.pool.QueryRow(ctx, q, reporterID, targetType, targetID, reason, details).Scan(
		&rep.ID, &rep.ReporterUserID, &rep.TargetType, &rep.TargetID, &rep.Reason, &rep.Details,
		&rep.Status, &rep.CreatedAt, &rep.ReviewedAt, &rep.ReviewedBy,
	)
	if err != nil {
		return Report{}, fmt.Errorf("create report: %w", err)
	}
	return rep, nil
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
		rows, err = r.pool.Query(ctx, `
			SELECT id, reporter_user_id, target_type, target_id, reason, details, status, created_at, reviewed_at, reviewed_by
			FROM reports ORDER BY created_at DESC LIMIT $1 OFFSET $2
		`, limit, offset)
	} else {
		rows, err = r.pool.Query(ctx, `
			SELECT id, reporter_user_id, target_type, target_id, reason, details, status, created_at, reviewed_at, reviewed_by
			FROM reports WHERE status = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3
		`, status, limit, offset)
	}
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()

	out := []Report{}
	for rows.Next() {
		var rep Report
		if err := rows.Scan(
			&rep.ID, &rep.ReporterUserID, &rep.TargetType, &rep.TargetID, &rep.Reason, &rep.Details,
			&rep.Status, &rep.CreatedAt, &rep.ReviewedAt, &rep.ReviewedBy,
		); err != nil {
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
		RETURNING id, reporter_user_id, target_type, target_id, reason, details, status, created_at, reviewed_at, reviewed_by
	`
	var rep Report
	err := r.pool.QueryRow(ctx, q, id, status, reviewerID).Scan(
		&rep.ID, &rep.ReporterUserID, &rep.TargetType, &rep.TargetID, &rep.Reason, &rep.Details,
		&rep.Status, &rep.CreatedAt, &rep.ReviewedAt, &rep.ReviewedBy,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Report{}, ErrNotFound
	}
	if err != nil {
		return Report{}, err
	}
	return rep, nil
}
