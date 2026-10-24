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

	"github.com/lattewei/walls/services/api/internal/domain"
)

var (
	ErrNotFound       = errors.New("user not found")
	ErrHandleTaken    = errors.New("handle already taken")
	ErrAvatarRequired = errors.New("avatar file is required")
)

type AuthState struct {
	Handle         string
	Role           string
	SessionVersion int
}

type SessionStore interface {
	AuthState(ctx context.Context, userID string) (AuthState, error)
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

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

func (r *Repository) AuthState(ctx context.Context, id string) (AuthState, error) {
	const q = `
		SELECT handle, role, session_version
		FROM users
		WHERE id = $1 AND deleted_at IS NULL
	`
	var st AuthState
	err := r.pool.QueryRow(ctx, q, id).Scan(&st.Handle, &st.Role, &st.SessionVersion)
	if errors.Is(err, pgx.ErrNoRows) {
		return AuthState{}, ErrNotFound
	}
	if err != nil {
		return AuthState{}, fmt.Errorf("auth state: %w", err)
	}
	return st, nil
}

func (r *Repository) BumpSession(ctx context.Context, id string) error {
	tag, err := r.pool.Exec(ctx, `
		UPDATE users
		SET session_version = session_version + 1, updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL
	`, id)
	if err != nil {
		return fmt.Errorf("bump session: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

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

func (r *Repository) UpdateAvatar(ctx context.Context, id string, avatarURL *string) (domain.User, error) {
	const q = `
		UPDATE users
		SET avatar_url = $2,
		    updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING id, handle, password_hash, display_name, avatar_url, bio, role,
		          created_at, updated_at, deleted_at
	`
	u, err := scanUser(r.pool.QueryRow(ctx, q, id, avatarURL))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.User{}, ErrNotFound
	}
	if err != nil {
		return domain.User{}, fmt.Errorf("update avatar: %w", err)
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

func NormalizeHandle(handle string) string {
	return strings.ToLower(strings.TrimSpace(handle))
}
