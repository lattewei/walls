package users

import (
	"context"
	"errors"
	"fmt"

	"github.com/lattewei/walls/services/api/internal/domain"
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
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
