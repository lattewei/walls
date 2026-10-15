package users

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/openstudio/openstudio/services/api/internal/domain"
)

var (
	// ErrNotFound is returned when no user matches the query.
	ErrNotFound = errors.New("user not found")
	// ErrHandleTaken is returned on unique handle conflict.
	ErrHandleTaken = errors.New("handle already taken")
)

// Repository persists users in PostgreSQL.
type Repository struct {
	pool *pgxpool.Pool
}

// NewRepository creates a user repository.
func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

// Create inserts a new user and an empty producer_profiles row in one transaction.
func (r *Repository) Create(ctx context.Context, handle, passwordHash, displayName string) (domain.User, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return domain.User{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	const insertUser = `
		INSERT INTO users (handle, password_hash, display_name)
		VALUES ($1, $2, $3)
		RETURNING id, handle, password_hash, display_name, avatar_url, bio, role,
		          created_at, updated_at, deleted_at
	`
	u, err := scanUser(tx.QueryRow(ctx, insertUser, handle, passwordHash, displayName))
	if err != nil {
		var pgErr *pgconn.PgError
		if errors.As(err, &pgErr) && pgErr.Code == "23505" {
			return domain.User{}, ErrHandleTaken
		}
		return domain.User{}, fmt.Errorf("create user: %w", err)
	}

	const insertProfile = `INSERT INTO producer_profiles (user_id) VALUES ($1)`
	if _, err := tx.Exec(ctx, insertProfile, u.ID); err != nil {
		return domain.User{}, fmt.Errorf("create producer profile: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return domain.User{}, fmt.Errorf("commit: %w", err)
	}
	return u, nil
}

// GetByHandle returns a non-deleted user by handle (exact, already normalized).
func (r *Repository) GetByHandle(ctx context.Context, handle string) (domain.User, error) {
	const q = `
		SELECT id, handle, password_hash, display_name, avatar_url, bio, role,
		       created_at, updated_at, deleted_at
		FROM users
		WHERE handle = $1 AND deleted_at IS NULL
	`
	u, err := scanUser(r.pool.QueryRow(ctx, q, handle))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.User{}, ErrNotFound
	}
	if err != nil {
		return domain.User{}, fmt.Errorf("get by handle: %w", err)
	}
	return u, nil
}

// GetByID returns a non-deleted user by id.
func (r *Repository) GetByID(ctx context.Context, id string) (domain.User, error) {
	const q = `
		SELECT id, handle, password_hash, display_name, avatar_url, bio, role,
		       created_at, updated_at, deleted_at
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`
	u, err := scanUser(r.pool.QueryRow(ctx, q, id))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.User{}, ErrNotFound
	}
	if err != nil {
		return domain.User{}, fmt.Errorf("get by id: %w", err)
	}
	return u, nil
}

// UpdateProfile updates mutable profile fields.
func (r *Repository) UpdateProfile(ctx context.Context, id string, displayName string, bio *string) (domain.User, error) {
	const q = `
		UPDATE users
		SET display_name = $2,
		    bio = $3,
		    updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING id, handle, password_hash, display_name, avatar_url, bio, role,
		          created_at, updated_at, deleted_at
	`
	u, err := scanUser(r.pool.QueryRow(ctx, q, id, displayName, bio))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.User{}, ErrNotFound
	}
	if err != nil {
		return domain.User{}, fmt.Errorf("update profile: %w", err)
	}
	return u, nil
}

type scannable interface {
	Scan(dest ...any) error
}

func scanUser(row scannable) (domain.User, error) {
	var u domain.User
	var avatar, bio *string
	var deletedAt *time.Time
	err := row.Scan(
		&u.ID,
		&u.Handle,
		&u.PasswordHash,
		&u.DisplayName,
		&avatar,
		&bio,
		&u.Role,
		&u.CreatedAt,
		&u.UpdatedAt,
		&deletedAt,
	)
	if err != nil {
		return domain.User{}, err
	}
	u.AvatarURL = avatar
	u.Bio = bio
	u.DeletedAt = deletedAt
	return u, nil
}

// NormalizeHandle lowercases and trims a handle candidate.
func NormalizeHandle(handle string) string {
	return strings.ToLower(strings.TrimSpace(handle))
}
