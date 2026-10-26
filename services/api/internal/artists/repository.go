package artists

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/lattewei/walls/services/api/internal/dberr"
	"github.com/lattewei/walls/services/api/internal/domain"
)

var (
	ErrNotFound        = errors.New("artist not found")
	ErrSlugTaken       = errors.New("slug already taken")
	ErrNameTaken       = errors.New("name already taken")
	ErrClaimNotPending = errors.New("claim is not pending")
	ErrAlreadyClaimed  = errors.New("artist already claimed")
	ErrClaimExists     = errors.New("pending claim already exists")
	ErrInvalidStatus   = errors.New("invalid claim status")
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
	CoverURL   *string
	AvatarURL  *string
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
		INSERT INTO artists (name, slug, bio, avatar_url, cover_url, genres, looking_for, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		RETURNING id, name, slug, bio, avatar_url, cover_url, genres, looking_for,
		          claim_status, created_by, claimed_by, created_at, updated_at
	`
	a, err := scanArtist(r.pool.QueryRow(ctx, q,
		in.Name, in.Slug, in.Bio, in.AvatarURL, in.CoverURL, genres, in.LookingFor, in.CreatedBy,
	))
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			if pgErr.ConstraintName == "artists_name_norm_unique" {
				return domain.Artist{}, ErrNameTaken
			}
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
	return r.existsByNormalizedName(ctx, name, "")
}

func (r *Repository) existsByNormalizedName(ctx context.Context, name, exceptID string) (bool, error) {
	const q = `
		SELECT EXISTS(
			SELECT 1 FROM artists
			WHERE lower(regexp_replace(trim(name), '\s+', ' ', 'g')) = lower($1)
			  AND ($2 = '' OR id::text <> $2)
		)
	`
	var ok bool
	if err := r.pool.QueryRow(ctx, q, name, exceptID).Scan(&ok); err != nil {
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

func (r *Repository) GetByID(ctx context.Context, id string) (domain.Artist, error) {
	const q = `
		SELECT id, name, slug, bio, avatar_url, cover_url, genres, looking_for,
		       claim_status, created_by, claimed_by, created_at, updated_at
		FROM artists
		WHERE id = $1
	`
	a, err := scanArtist(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Artist{}, ErrNotFound
	}
	if err != nil {
		return domain.Artist{}, fmt.Errorf("get by id: %w", err)
	}
	return a, nil
}

type UpdateFields struct {
	Name       string
	Bio        *string
	CoverURL   *string
	AvatarURL  *string
	Genres     []string
	LookingFor *string
}

func (r *Repository) Update(ctx context.Context, id string, in UpdateFields) (domain.Artist, error) {
	genres := in.Genres
	if genres == nil {
		genres = []string{}
	}
	const q = `
		UPDATE artists
		SET name = $2,
		    bio = $3,
		    cover_url = $4,
		    avatar_url = $5,
		    genres = $6,
		    looking_for = $7,
		    updated_at = now()
		WHERE id = $1
		RETURNING id, name, slug, bio, avatar_url, cover_url, genres, looking_for,
		          claim_status, created_by, claimed_by, created_at, updated_at
	`
	a, err := scanArtist(r.pool.QueryRow(ctx, q,
		id, in.Name, in.Bio, in.CoverURL, in.AvatarURL, genres, in.LookingFor,
	))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.Artist{}, ErrNotFound
	}
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			if pgErr.ConstraintName == "artists_name_norm_unique" {
				return domain.Artist{}, ErrNameTaken
			}
			return domain.Artist{}, ErrSlugTaken
		}
		return domain.Artist{}, fmt.Errorf("update artist: %w", err)
	}
	return a, nil
}

type Claim struct {
	ID                 string
	ArtistID           string
	ArtistName         string
	ArtistSlug         string
	UserID             string
	UserHandle         string
	VerificationMethod string
	ClaimCode          string
	IdentityURL        *string
	ProofURL           *string
	Status             string
	ReviewedBy         *string
	CreatedAt          time.Time
	ReviewedAt         *time.Time
}

func (r *Repository) CreateClaim(ctx context.Context, artistID, userID, method string, identityURL, proofURL *string) (Claim, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return Claim{}, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	const insert = `
		INSERT INTO artist_claims (artist_id, user_id, verification_method, identity_url, proof_url, status)
		VALUES ($1, $2, $3, $4, $5, 'pending')
		RETURNING id, artist_id, user_id, verification_method, claim_code, identity_url, proof_url, status, reviewed_by, created_at, reviewed_at
	`
	var cl Claim
	err = tx.QueryRow(ctx, insert, artistID, userID, method, identityURL, proofURL).Scan(
		&cl.ID, &cl.ArtistID, &cl.UserID, &cl.VerificationMethod, &cl.ClaimCode,
		&cl.IdentityURL, &cl.ProofURL,
		&cl.Status, &cl.ReviewedBy, &cl.CreatedAt, &cl.ReviewedAt,
	)
	if err != nil {
		if dberr.IsUnique(err) {
			return Claim{}, ErrClaimExists
		}
		return Claim{}, fmt.Errorf("create claim: %w", err)
	}

	const touch = `
		UPDATE artists
		SET claim_status = CASE WHEN claim_status = 'claimed' THEN claim_status ELSE 'pending' END,
		    updated_at = now()
		WHERE id = $1
	`
	if _, err := tx.Exec(ctx, touch, artistID); err != nil {
		return Claim{}, fmt.Errorf("update artist claim status: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return Claim{}, err
	}
	return cl, nil
}

func (r *Repository) GetClaim(ctx context.Context, id string) (Claim, error) {
	const q = `
		SELECT id, artist_id, user_id, verification_method, claim_code, identity_url, proof_url, status, reviewed_by, created_at, reviewed_at
		FROM artist_claims WHERE id = $1
	`
	var cl Claim
	err := r.pool.QueryRow(ctx, q, id).Scan(
		&cl.ID, &cl.ArtistID, &cl.UserID, &cl.VerificationMethod, &cl.ClaimCode,
		&cl.IdentityURL, &cl.ProofURL,
		&cl.Status, &cl.ReviewedBy, &cl.CreatedAt, &cl.ReviewedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Claim{}, ErrNotFound
	}
	if err != nil {
		return Claim{}, err
	}
	return cl, nil
}

func (r *Repository) ListPendingClaims(ctx context.Context, limit, offset int) ([]Claim, int, error) {
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM artist_claims WHERE status = 'pending'`).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.pool.Query(ctx, `
		SELECT c.id, c.artist_id, c.user_id, u.handle, a.slug, a.name,
		       c.verification_method, c.claim_code, c.identity_url, c.proof_url,
		       c.status, c.reviewed_by, c.created_at, c.reviewed_at
		FROM artist_claims c
		JOIN users u ON u.id = c.user_id
		JOIN artists a ON a.id = c.artist_id
		WHERE c.status = 'pending'
		ORDER BY c.created_at ASC
		LIMIT $1 OFFSET $2
	`, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []Claim{}
	for rows.Next() {
		var cl Claim
		if err := rows.Scan(
			&cl.ID, &cl.ArtistID, &cl.UserID, &cl.UserHandle, &cl.ArtistSlug, &cl.ArtistName,
			&cl.VerificationMethod, &cl.ClaimCode, &cl.IdentityURL, &cl.ProofURL,
			&cl.Status, &cl.ReviewedBy, &cl.CreatedAt, &cl.ReviewedAt,
		); err != nil {
			return nil, 0, err
		}
		out = append(out, cl)
	}
	return out, total, rows.Err()
}

func (r *Repository) ListByUser(ctx context.Context, userID string, limit, offset int) ([]Claim, int, error) {
	var total int
	if err := r.pool.QueryRow(ctx, `SELECT COUNT(*) FROM artist_claims WHERE user_id = $1`, userID).Scan(&total); err != nil {
		return nil, 0, err
	}
	rows, err := r.pool.Query(ctx, `
		SELECT c.id, c.artist_id, c.user_id, u.handle, a.slug, a.name,
		       c.verification_method, c.claim_code, c.identity_url, c.proof_url,
		       c.status, c.reviewed_by, c.created_at, c.reviewed_at
		FROM artist_claims c
		JOIN users u ON u.id = c.user_id
		JOIN artists a ON a.id = c.artist_id
		WHERE c.user_id = $1
		ORDER BY c.created_at DESC
		LIMIT $2 OFFSET $3
	`, userID, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	defer rows.Close()
	out := []Claim{}
	for rows.Next() {
		var cl Claim
		if err := rows.Scan(
			&cl.ID, &cl.ArtistID, &cl.UserID, &cl.UserHandle, &cl.ArtistSlug, &cl.ArtistName,
			&cl.VerificationMethod, &cl.ClaimCode, &cl.IdentityURL, &cl.ProofURL,
			&cl.Status, &cl.ReviewedBy, &cl.CreatedAt, &cl.ReviewedAt,
		); err != nil {
			return nil, 0, err
		}
		out = append(out, cl)
	}
	return out, total, rows.Err()
}

func (r *Repository) ReviewClaim(ctx context.Context, claimID, reviewerID, status string) (Claim, error) {
	if status != "accepted" && status != "rejected" {
		return Claim{}, ErrInvalidStatus
	}
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return Claim{}, err
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	const lockClaim = `
		SELECT id, artist_id, user_id, verification_method, claim_code, identity_url, proof_url, status, reviewed_by, created_at, reviewed_at
		FROM artist_claims
		WHERE id = $1
		FOR UPDATE
	`
	var cl Claim
	err = tx.QueryRow(ctx, lockClaim, claimID).Scan(
		&cl.ID, &cl.ArtistID, &cl.UserID, &cl.VerificationMethod, &cl.ClaimCode,
		&cl.IdentityURL, &cl.ProofURL,
		&cl.Status, &cl.ReviewedBy, &cl.CreatedAt, &cl.ReviewedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Claim{}, ErrNotFound
	}
	if err != nil {
		return Claim{}, err
	}
	if cl.Status != "pending" {
		return Claim{}, ErrClaimNotPending
	}

	var claimStatus string
	var claimedBy *string
	err = tx.QueryRow(ctx, `
		SELECT claim_status, claimed_by FROM artists WHERE id = $1 FOR UPDATE
	`, cl.ArtistID).Scan(&claimStatus, &claimedBy)
	if errors.Is(err, pgx.ErrNoRows) {
		return Claim{}, ErrNotFound
	}
	if err != nil {
		return Claim{}, err
	}
	if status == "accepted" && claimStatus == "claimed" && (claimedBy == nil || *claimedBy != cl.UserID) {
		return Claim{}, ErrAlreadyClaimed
	}

	var otherPending bool
	if err := tx.QueryRow(ctx, `
		SELECT EXISTS(
			SELECT 1 FROM artist_claims
			WHERE artist_id = $1 AND status = 'pending' AND id <> $2
		)
	`, cl.ArtistID, claimID).Scan(&otherPending); err != nil {
		return Claim{}, err
	}

	const upd = `
		UPDATE artist_claims
		SET status = $2, reviewed_by = $3, reviewed_at = now()
		WHERE id = $1 AND status = 'pending'
		RETURNING id, artist_id, user_id, verification_method, claim_code, identity_url, proof_url, status, reviewed_by, created_at, reviewed_at
	`
	var out Claim
	err = tx.QueryRow(ctx, upd, claimID, status, reviewerID).Scan(
		&out.ID, &out.ArtistID, &out.UserID, &out.VerificationMethod, &out.ClaimCode,
		&out.IdentityURL, &out.ProofURL,
		&out.Status, &out.ReviewedBy, &out.CreatedAt, &out.ReviewedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Claim{}, ErrClaimNotPending
	}
	if err != nil {
		return Claim{}, err
	}

	if status == "accepted" {
		_, err = tx.Exec(ctx, `
			UPDATE artists
			SET claim_status = 'claimed', claimed_by = $2, updated_at = now()
			WHERE id = $1
		`, out.ArtistID, out.UserID)
		if err != nil {
			return Claim{}, err
		}
		// One accepted claim closes the wall: other requests are not left in limbo.
		_, err = tx.Exec(ctx, `
			UPDATE artist_claims
			SET status = 'rejected', reviewed_by = $3, reviewed_at = now()
			WHERE artist_id = $1 AND status = 'pending' AND id <> $2
		`, out.ArtistID, claimID, reviewerID)
	} else {
		_, err = tx.Exec(ctx, `
			UPDATE artists
			SET claim_status = $2, updated_at = now()
			WHERE id = $1
		`, out.ArtistID, NextClaimStatus(claimStatus, otherPending))
	}
	if err != nil {
		return Claim{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return Claim{}, err
	}
	return out, nil
}

// UpdateClaimProof lets the claimant add the public post that contains the
// claim code, while the claim is still pending.
func (r *Repository) UpdateClaimProof(ctx context.Context, claimID, userID string, proofURL *string) (Claim, error) {
	const q = `
		UPDATE artist_claims
		SET proof_url = $3
		WHERE id = $1 AND user_id = $2 AND status = 'pending'
		RETURNING id, artist_id, user_id, verification_method, claim_code, identity_url, proof_url, status, reviewed_by, created_at, reviewed_at
	`
	var cl Claim
	err := r.pool.QueryRow(ctx, q, claimID, userID, proofURL).Scan(
		&cl.ID, &cl.ArtistID, &cl.UserID, &cl.VerificationMethod, &cl.ClaimCode,
		&cl.IdentityURL, &cl.ProofURL,
		&cl.Status, &cl.ReviewedBy, &cl.CreatedAt, &cl.ReviewedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return Claim{}, ErrNotFound
	}
	if err != nil {
		return Claim{}, err
	}
	return cl, nil
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
