package artists

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"unicode/utf8"

	"github.com/lattewei/walls/services/api/internal/auth"
	"github.com/lattewei/walls/services/api/internal/domain"
	"github.com/lattewei/walls/services/api/internal/media"
)

const (
	defaultListLimit = 20
	maxListLimit     = 50
	maxSearchQuery   = 100
	maxCoverBytes    = 5 << 20
	maxOffset        = 10000
)

type Service struct {
	repo     *Repository
	storage  *media.LocalStorage
	maxCover int64
}

func NewService(repo *Repository, storage *media.LocalStorage) *Service {
	return &Service{repo: repo, storage: storage, maxCover: maxCoverBytes}
}

type CreateArtistInput struct {
	Name       string
	Slug       string
	Bio        string
	Genres     []string
	LookingFor string
	CreatedBy  string
	Cover      io.Reader
	CoverSize  int64
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
		slug = Slugify(name)
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

	var coverURL *string
	if in.Cover != nil {
		if in.CoverSize > 0 && in.CoverSize > s.maxCover {
			return domain.PublicArtist{}, fmt.Errorf("%w: cover image is too large (max 5MB)", ErrValidation)
		}
		if s.storage == nil {
			return domain.PublicArtist{}, fmt.Errorf("%w: media storage unavailable", ErrValidation)
		}
		info, reader, err := media.DetectImage(in.Cover)
		if err != nil {
			if errors.Is(err, media.ErrUnsupported) {
				return domain.PublicArtist{}, fmt.Errorf("%w: unsupported image type", ErrValidation)
			}
			return domain.PublicArtist{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
		}
		key, err := s.storage.SaveCapped(reader, info.Ext, s.maxCover)
		if errors.Is(err, media.ErrTooLarge) {
			return domain.PublicArtist{}, fmt.Errorf("%w: cover image is too large (max 5MB)", ErrValidation)
		}
		if err != nil {
			return domain.PublicArtist{}, err
		}
		coverURL = &key
	}

	artist, err := s.repo.Create(ctx, CreateInput{
		Name:       name,
		Slug:       slug,
		Bio:        bio,
		CoverURL:   coverURL,
		AvatarURL:  coverURL,
		Genres:     genres,
		LookingFor: looking,
		CreatedBy:  in.CreatedBy,
	})
	if errors.Is(err, ErrNameTaken) {
		if coverURL != nil && s.storage != nil {
			_ = s.storage.Delete(*coverURL)
		}
		return domain.PublicArtist{}, fmt.Errorf("%w: an artist page with this name already exists", ErrConflict)
	}
	if errors.Is(err, ErrSlugTaken) {
		if coverURL != nil && s.storage != nil {
			_ = s.storage.Delete(*coverURL)
		}
		return domain.PublicArtist{}, fmt.Errorf("%w: an artist page with this slug already exists", ErrConflict)
	}
	if err != nil {
		if coverURL != nil && s.storage != nil {
			_ = s.storage.Delete(*coverURL)
		}
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
	if offset > maxOffset {
		return ListResult{}, fmt.Errorf("%w: offset is too large", ErrValidation)
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

type ClaimInput struct {
	Slug               string
	UserID             string
	VerificationMethod string
	ProofURL           string
}

type PublicClaim struct {
	ID                 string  `json:"id"`
	ArtistID           string  `json:"artist_id"`
	UserID             string  `json:"user_id"`
	UserHandle         string  `json:"user_handle,omitempty"`
	Status             string  `json:"status"`
	VerificationMethod string  `json:"verification_method"`
	ProofURL           *string `json:"proof_url,omitempty"`
	CreatedAt          string  `json:"created_at"`
}

func (s *Service) RequestClaim(ctx context.Context, in ClaimInput) (PublicClaim, error) {
	method := strings.TrimSpace(in.VerificationMethod)
	if method == "" {
		return PublicClaim{}, fmt.Errorf("%w: verification_method is required", ErrValidation)
	}
	if utf8.RuneCountInString(method) > 100 {
		return PublicClaim{}, fmt.Errorf("%w: verification_method is too long", ErrValidation)
	}

	artist, err := s.GetBySlug(ctx, in.Slug)
	if err != nil {
		return PublicClaim{}, err
	}

	var proof *string
	if p := strings.TrimSpace(in.ProofURL); p != "" {
		if err := auth.ValidateHTTPURL(p); err != nil {
			return PublicClaim{}, fmt.Errorf("%w: proof_url: %s", ErrValidation, err.Error())
		}
		proof = &p
	}

	cl, err := s.repo.CreateClaim(ctx, artist.ID, in.UserID, method, proof)
	if errors.Is(err, ErrClaimExists) {
		return PublicClaim{}, fmt.Errorf("%w: you already have a pending claim for this wall", ErrConflict)
	}
	if err != nil {
		return PublicClaim{}, err
	}
	return toPublicClaim(cl), nil
}

func (s *Service) ListPendingClaims(ctx context.Context, limit, offset int) ([]PublicClaim, int, error) {
	if limit <= 0 {
		limit = defaultListLimit
	}
	if limit > maxListLimit {
		limit = maxListLimit
	}
	if offset < 0 {
		offset = 0
	}
	if offset > maxOffset {
		return nil, 0, fmt.Errorf("%w: offset is too large", ErrValidation)
	}
	rows, total, err := s.repo.ListPendingClaims(ctx, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	out := make([]PublicClaim, 0, len(rows))
	for _, cl := range rows {
		out = append(out, toPublicClaim(cl))
	}
	return out, total, nil
}

func (s *Service) ReviewClaim(ctx context.Context, claimID, reviewerID, status string) (PublicClaim, error) {
	cl, err := s.repo.ReviewClaim(ctx, claimID, reviewerID, status)
	if err != nil {
		switch {
		case errors.Is(err, ErrClaimNotPending):
			return PublicClaim{}, fmt.Errorf("%w: claim is not pending", ErrValidation)
		case errors.Is(err, ErrAlreadyClaimed):
			return PublicClaim{}, fmt.Errorf("%w: artist is already claimed", ErrConflict)
		case errors.Is(err, ErrNotFound):
			return PublicClaim{}, ErrNotFound
		case errors.Is(err, ErrInvalidStatus):
			return PublicClaim{}, fmt.Errorf("%w: invalid claim status", ErrValidation)
		default:
			return PublicClaim{}, err
		}
	}
	return toPublicClaim(cl), nil
}

func toPublicClaim(cl Claim) PublicClaim {
	return PublicClaim{
		ID:                 cl.ID,
		ArtistID:           cl.ArtistID,
		UserID:             cl.UserID,
		UserHandle:         cl.UserHandle,
		Status:             cl.Status,
		VerificationMethod: cl.VerificationMethod,
		ProofURL:           cl.ProofURL,
		CreatedAt:          cl.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}
