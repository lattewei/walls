package artists

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/openstudio/openstudio/services/api/internal/domain"
)

var (
	ErrNotFound  = errors.New("artist not found")
	ErrSlugTaken = errors.New("slug already taken")
)

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

type CreateInput struct {
	Name       string
	Slug       string
	Bio        *string
	Genres     []string
	LookingFor *string
	CreatedBy  string
}

func (r *Repository) Create(ctx context.Context, in CreateInput) (domain.Artist, error) {
	genres := in.Genres
	if genres == nil {
		genres = []string{}
	}

	const q = `
		INSERT INTO artists (name, slug, bio, genres, looking_for, created_by)
		VALUES ($1, $2, $3, $4, $5, $6)
		RETURNING id, name, slug, bio, avatar_url, cover_url, genres, looking_for,
		          claim_status, created_by, claimed_by, created_at, updated_at
	`
	a, err := scanArtist(r.pool.QueryRow(ctx, q,
		in.Name, in.Slug, in.Bio, genres, in.LookingFor, in.CreatedBy,
	))
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.Artist{}, ErrSlugTaken
		}
		return domain.Artist{}, fmt.Errorf("create artist: %w", err)
	}
	return a, nil
}

func (r *Repository) ExistsBySlug(ctx context.Context, slug string) (bool, error) {
	const q = `SELECT EXISTS(SELECT 1 FROM artists WHERE lower(slug) = lower($1))`
	var ok bool
	if err := r.pool.QueryRow(ctx, q, slug).Scan(&ok); err != nil {
		return false, fmt.Errorf("exists by slug: %w", err)
	}
	return ok, nil
}

func (r *Repository) ExistsByNormalizedName(ctx context.Context, name string) (bool, error) {
	const q = `
		SELECT EXISTS(
			SELECT 1 FROM artists
			WHERE lower(regexp_replace(trim(name), '\s+', ' ', 'g')) = lower($1)
		)
	`
	var ok bool
	if err := r.pool.QueryRow(ctx, q, name).Scan(&ok); err != nil {
		return false, fmt.Errorf("exists by name: %w", err)
	}
	return ok, nil
}

func (r *Repository) GetBySlug(ctx context.Context, slug string) (domain.Artist, error) {
	const q = `
		SELECT id, name, slug, bio, avatar_url, cover_url, genres, looking_for,
		       claim_status, created_by, claimed_by, created_at, updated_at
		FROM artists
		WHERE lower(slug) = lower($1)
	`
	a, err := scanArtist(r.pool.QueryRow(ctx, q, slug))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Artist{}, ErrNotFound
	}
	if err != nil {
		return domain.Artist{}, fmt.Errorf("get by slug: %w", err)
	}
	return a, nil
}

type ListParams struct {
	Query  string
	Limit  int
	Offset int
}

func (r *Repository) List(ctx context.Context, p ListParams) ([]domain.Artist, int, error) {
	pattern := ""
	if p.Query != "" {
		pattern = "%" + escapeILIKE(p.Query) + "%"
	}

	const countQ = `
		SELECT COUNT(*)
		FROM artists
		WHERE ($1 = '' OR name ILIKE $1 ESCAPE '\' OR slug ILIKE $1 ESCAPE '\')
	`
	var total int
	if err := r.pool.QueryRow(ctx, countQ, pattern).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("count artists: %w", err)
	}

	const listQ = `
		SELECT id, name, slug, bio, avatar_url, cover_url, genres, looking_for,
		       claim_status, created_by, claimed_by, created_at, updated_at
		FROM artists
		WHERE ($1 = '' OR name ILIKE $1 ESCAPE '\' OR slug ILIKE $1 ESCAPE '\')
		ORDER BY lower(name) ASC, created_at ASC
		LIMIT $2 OFFSET $3
	`
	rows, err := r.pool.Query(ctx, listQ, pattern, p.Limit, p.Offset)
	if err != nil {
		return nil, 0, fmt.Errorf("list artists: %w", err)
	}
	defer rows.Close()

	out := make([]domain.Artist, 0, p.Limit)
	for rows.Next() {
		a, err := scanArtist(rows)
		if err != nil {
			return nil, 0, fmt.Errorf("scan artist: %w", err)
		}
		out = append(out, a)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("list artists rows: %w", err)
	}
	return out, total, nil
}

func escapeILIKE(s string) string {
	replacer := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return replacer.Replace(s)
}

type scannable interface {
	Scan(dest ...any) error
}

func scanArtist(row scannable) (domain.Artist, error) {
	var a domain.Artist
	var bio, avatar, cover, looking *string
	var createdBy, claimedBy *string
	var genres []string
	err := row.Scan(
		&a.ID,
		&a.Name,
		&a.Slug,
		&bio,
		&avatar,
		&cover,
		&genres,
		&looking,
		&a.ClaimStatus,
		&createdBy,
		&claimedBy,
		&a.CreatedAt,
		&a.UpdatedAt,
	)
	if err != nil {
		return domain.Artist{}, err
	}
	a.Bio = bio
	a.AvatarURL = avatar
	a.CoverURL = cover
	a.LookingFor = looking
	a.CreatedBy = createdBy
	a.ClaimedBy = claimedBy
	if genres == nil {
		genres = []string{}
	}
	a.Genres = genres
	return a, nil
}
