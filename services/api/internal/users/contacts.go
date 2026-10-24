package users

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"

	"github.com/lattewei/walls/services/api/internal/domain"
)

func (r *Repository) EnsureProducerProfile(ctx context.Context, userID string) error {
	const q = `
		INSERT INTO producer_profiles (user_id)
		VALUES ($1)
		ON CONFLICT (user_id) DO NOTHING
	`
	_, err := r.pool.Exec(ctx, q, userID)
	if err != nil {
		return fmt.Errorf("ensure producer profile: %w", err)
	}
	return nil
}

func (r *Repository) GetProducerProfile(ctx context.Context, userID string) (domain.ProducerProfile, error) {
	const q = `
		SELECT user_id, public_contact_email, instagram_url, other_links
		FROM producer_profiles
		WHERE user_id = $1
	`
	var p domain.ProducerProfile
	var email, ig *string
	var linksJSON []byte

	err := r.pool.QueryRow(ctx, q, userID).Scan(&p.UserID, &email, &ig, &linksJSON)
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.ProducerProfile{
			UserID:     userID,
			OtherLinks: []domain.ExternalLink{},
		}, nil
	}
	if err != nil {
		return domain.ProducerProfile{}, fmt.Errorf("get producer profile: %w", err)
	}

	p.PublicContactEmail = email
	p.InstagramURL = ig
	p.OtherLinks = []domain.ExternalLink{}
	if len(linksJSON) > 0 {
		if err := json.Unmarshal(linksJSON, &p.OtherLinks); err != nil {
			return domain.ProducerProfile{}, fmt.Errorf("decode other_links: %w", err)
		}
	}
	if p.OtherLinks == nil {
		p.OtherLinks = []domain.ExternalLink{}
	}
	return p, nil
}

func (r *Repository) SaveAccount(ctx context.Context, userID, displayName string, bio *string, profile domain.ProducerProfile) (domain.User, domain.ProducerProfile, error) {
	tx, err := r.pool.Begin(ctx)
	if err != nil {
		return domain.User{}, domain.ProducerProfile{}, fmt.Errorf("begin tx: %w", err)
	}
	defer tx.Rollback(ctx) //nolint:errcheck

	const userQ = `
		UPDATE users
		SET display_name = $2, bio = $3, updated_at = now()
		WHERE id = $1 AND deleted_at IS NULL
		RETURNING id, handle, password_hash, display_name, avatar_url, bio, role,
		          created_at, updated_at, deleted_at
	`
	user, err := scanUser(tx.QueryRow(ctx, userQ, userID, displayName, bio))
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.User{}, domain.ProducerProfile{}, ErrNotFound
	}
	if err != nil {
		return domain.User{}, domain.ProducerProfile{}, fmt.Errorf("update profile: %w", err)
	}

	links := profile.OtherLinks
	if links == nil {
		links = []domain.ExternalLink{}
	}
	raw, err := json.Marshal(links)
	if err != nil {
		return domain.User{}, domain.ProducerProfile{}, fmt.Errorf("encode other_links: %w", err)
	}
	const contactQ = `
		INSERT INTO producer_profiles (user_id, public_contact_email, instagram_url, other_links, updated_at)
		VALUES ($1, $2, $3, $4::jsonb, now())
		ON CONFLICT (user_id) DO UPDATE SET
			public_contact_email = EXCLUDED.public_contact_email,
			instagram_url = EXCLUDED.instagram_url,
			other_links = EXCLUDED.other_links,
			updated_at = now()
		RETURNING user_id, public_contact_email, instagram_url, other_links
	`
	var out domain.ProducerProfile
	var email, ig *string
	var linksJSON []byte
	err = tx.QueryRow(ctx, contactQ, userID, profile.PublicContactEmail, profile.InstagramURL, raw).
		Scan(&out.UserID, &email, &ig, &linksJSON)
	if err != nil {
		return domain.User{}, domain.ProducerProfile{}, fmt.Errorf("upsert producer profile: %w", err)
	}
	out.PublicContactEmail = email
	out.InstagramURL = ig
	out.OtherLinks = []domain.ExternalLink{}
	if len(linksJSON) > 0 {
		if err := json.Unmarshal(linksJSON, &out.OtherLinks); err != nil {
			return domain.User{}, domain.ProducerProfile{}, fmt.Errorf("decode other_links: %w", err)
		}
	}
	if out.OtherLinks == nil {
		out.OtherLinks = []domain.ExternalLink{}
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.User{}, domain.ProducerProfile{}, fmt.Errorf("commit: %w", err)
	}
	return user, out, nil
}

func (r *Repository) UpsertProducerProfile(ctx context.Context, userID string, p domain.ProducerProfile) (domain.ProducerProfile, error) {
	links := p.OtherLinks
	if links == nil {
		links = []domain.ExternalLink{}
	}
	raw, err := json.Marshal(links)
	if err != nil {
		return domain.ProducerProfile{}, fmt.Errorf("encode other_links: %w", err)
	}

	const q = `
		INSERT INTO producer_profiles (user_id, public_contact_email, instagram_url, other_links, updated_at)
		VALUES ($1, $2, $3, $4::jsonb, now())
		ON CONFLICT (user_id) DO UPDATE SET
			public_contact_email = EXCLUDED.public_contact_email,
			instagram_url = EXCLUDED.instagram_url,
			other_links = EXCLUDED.other_links,
			updated_at = now()
		RETURNING user_id, public_contact_email, instagram_url, other_links
	`
	var out domain.ProducerProfile
	var email, ig *string
	var linksJSON []byte
	err = r.pool.QueryRow(ctx, q, userID, p.PublicContactEmail, p.InstagramURL, raw).
		Scan(&out.UserID, &email, &ig, &linksJSON)
	if err != nil {
		return domain.ProducerProfile{}, fmt.Errorf("upsert producer profile: %w", err)
	}
	out.PublicContactEmail = email
	out.InstagramURL = ig
	out.OtherLinks = []domain.ExternalLink{}
	if len(linksJSON) > 0 {
		_ = json.Unmarshal(linksJSON, &out.OtherLinks)
	}
	if out.OtherLinks == nil {
		out.OtherLinks = []domain.ExternalLink{}
	}
	return out, nil
}
