package artists

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/openstudio/openstudio/services/api/internal/domain"
)

const (
	defaultListLimit = 20
	maxListLimit     = 50
	maxSearchQuery   = 100
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

type CreateArtistInput struct {
	Name       string
	Slug       string
	Bio        string
	Genres     []string
	LookingFor string
	CreatedBy  string
}

var (
	ErrValidation = errors.New("validation_error")
	ErrConflict   = errors.New("conflict")
)

func (s *Service) Create(ctx context.Context, in CreateArtistInput) (domain.PublicArtist, error) {
	name := NormalizeName(in.Name)
	if err := ValidateName(name); err != nil {
		return domain.PublicArtist{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
	}

	slug := strings.TrimSpace(strings.ToLower(in.Slug))
	if slug == "" {
		slug = slugify(name)
	}
	if err := ValidateSlug(slug); err != nil {
		return domain.PublicArtist{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
	}

	var bio *string
	if b := strings.TrimSpace(in.Bio); b != "" {
		if err := ValidateBio(b); err != nil {
			return domain.PublicArtist{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
		}
		bio = &b
	}

	genres := NormalizeGenres(in.Genres)
	if err := ValidateGenres(genres); err != nil {
		return domain.PublicArtist{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
	}

	var looking *string
	if lf := strings.TrimSpace(in.LookingFor); lf != "" {
		if err := ValidateBio(lf); err != nil {
			return domain.PublicArtist{}, fmt.Errorf("%w: looking_for too long", ErrValidation)
		}
		looking = &lf
	}

	if in.CreatedBy == "" {
		return domain.PublicArtist{}, fmt.Errorf("%w: authentication required", ErrValidation)
	}

	taken, err := s.repo.ExistsBySlug(ctx, slug)
	if err != nil {
		return domain.PublicArtist{}, err
	}
	if taken {
		return domain.PublicArtist{}, fmt.Errorf("%w: an artist page with this slug already exists", ErrConflict)
	}

	nameTaken, err := s.repo.ExistsByNormalizedName(ctx, name)
	if err != nil {
		return domain.PublicArtist{}, err
	}
	if nameTaken {
		return domain.PublicArtist{}, fmt.Errorf("%w: an artist page with this name already exists", ErrConflict)
	}

	artist, err := s.repo.Create(ctx, CreateInput{
		Name:       name,
		Slug:       slug,
		Bio:        bio,
		Genres:     genres,
		LookingFor: looking,
		CreatedBy:  in.CreatedBy,
	})
	if errors.Is(err, ErrSlugTaken) {
		return domain.PublicArtist{}, fmt.Errorf("%w: an artist page with this slug already exists", ErrConflict)
	}
	if err != nil {
		return domain.PublicArtist{}, err
	}

	return artist.ToPublic(), nil
}

func (s *Service) GetBySlug(ctx context.Context, slug string) (domain.PublicArtist, error) {
	slug = strings.TrimSpace(strings.ToLower(slug))
	if err := ValidateSlug(slug); err != nil {
		return domain.PublicArtist{}, ErrNotFound
	}

	artist, err := s.repo.GetBySlug(ctx, slug)
	if errors.Is(err, ErrNotFound) {
		return domain.PublicArtist{}, ErrNotFound
	}
	if err != nil {
		return domain.PublicArtist{}, err
	}
	return artist.ToPublic(), nil
}

type ListInput struct {
	Query  string
	Limit  int
	Offset int
}

type ListResult struct {
	Artists []domain.PublicArtist `json:"artists"`
	Total   int                   `json:"total"`
	Limit   int                   `json:"limit"`
	Offset  int                   `json:"offset"`
}

func (s *Service) List(ctx context.Context, in ListInput) (ListResult, error) {
	q := strings.TrimSpace(in.Query)
	if utf8.RuneCountInString(q) > maxSearchQuery {
		return ListResult{}, fmt.Errorf("%w: q is too long", ErrValidation)
	}

	limit := in.Limit
	if limit <= 0 {
		limit = defaultListLimit
	}
	if limit > maxListLimit {
		limit = maxListLimit
	}
	offset := in.Offset
	if offset < 0 {
		offset = 0
	}

	rows, total, err := s.repo.List(ctx, ListParams{
		Query:  q,
		Limit:  limit,
		Offset: offset,
	})
	if err != nil {
		return ListResult{}, err
	}

	artists := make([]domain.PublicArtist, 0, len(rows))
	for _, a := range rows {
		artists = append(artists, a.ToPublic())
	}
	return ListResult{
		Artists: artists,
		Total:   total,
		Limit:   limit,
		Offset:  offset,
	}, nil
}

func slugify(name string) string {
	return Slugify(name)
}
