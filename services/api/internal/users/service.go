package users

import (
	"context"
	"errors"
	"fmt"
	"io"

	"github.com/lattewei/walls/services/api/internal/domain"
	"github.com/lattewei/walls/services/api/internal/media"
)

const maxAvatarBytes = 5 << 20

type Service struct {
	repo    *Repository
	storage *media.LocalStorage
}

func NewService(repo *Repository, storage *media.LocalStorage) *Service {
	return &Service{repo: repo, storage: storage}
}

func (s *Service) GetPublicProfile(ctx context.Context, handle string) (domain.PublicProfile, error) {
	handle = NormalizeHandle(handle)
	if err := ValidateHandle(handle); err != nil {
		return domain.PublicProfile{}, ErrNotFound
	}

	user, err := s.repo.GetByHandle(ctx, handle)
	if errors.Is(err, ErrNotFound) {
		return domain.PublicProfile{}, ErrNotFound
	}
	if err != nil {
		return domain.PublicProfile{}, fmt.Errorf("get public profile: %w", err)
	}

	profile, err := s.repo.GetProducerProfile(ctx, user.ID)
	if err != nil {
		return domain.PublicProfile{}, err
	}

	return domain.PublicProfile{
		User:     user.ToPublicProfile(),
		Contacts: profile.ToPublic(),
	}, nil
}

func (s *Service) UploadAvatar(ctx context.Context, userID string, file io.Reader, size int64) (domain.PublicUser, error) {
	if userID == "" {
		return domain.PublicUser{}, ErrNotFound
	}
	if file == nil {
		return domain.PublicUser{}, fmt.Errorf("avatar file is required")
	}
	if size > 0 && size > maxAvatarBytes {
		return domain.PublicUser{}, fmt.Errorf("avatar image is too large (max 5MB)")
	}
	if s.storage == nil {
		return domain.PublicUser{}, fmt.Errorf("media storage unavailable")
	}

	user, err := s.repo.GetByID(ctx, userID)
	if errors.Is(err, ErrNotFound) {
		return domain.PublicUser{}, ErrNotFound
	}
	if err != nil {
		return domain.PublicUser{}, err
	}

	info, reader, err := media.DetectImage(file)
	if err != nil {
		return domain.PublicUser{}, err
	}
	key, err := s.storage.SaveCapped(reader, info.Ext, maxAvatarBytes)
	if err != nil {
		return domain.PublicUser{}, err
	}

	old := user.AvatarURL
	updated, err := s.repo.UpdateAvatar(ctx, userID, &key)
	if err != nil {
		_ = s.storage.Delete(key)
		return domain.PublicUser{}, err
	}
	if old != nil && *old != "" && *old != key {
		_ = s.storage.Delete(*old)
	}
	return updated.ToPublic(), nil
}
