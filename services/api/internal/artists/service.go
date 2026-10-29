package artists

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"
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
	repo       *Repository
	storage    *media.LocalStorage
	maxCover   int64
	dailyLimit int
}

func NewService(repo *Repository, storage *media.LocalStorage, dailyLimit int) *Service {
	if dailyLimit < 1 {
		dailyLimit = 10
	}
	return &Service{repo: repo, storage: storage, maxCover: maxCoverBytes, dailyLimit: dailyLimit}
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
	ErrForbidden  = errors.New("forbidden")
	ErrRateLimit  = errors.New("rate_limited")
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
		DailyLimit: s.dailyLimit,
		Since:      time.Now().UTC().Truncate(24 * time.Hour),
	})
	if errors.Is(err, ErrRateLimit) {
		if coverURL != nil && s.storage != nil {
			_ = s.storage.Delete(*coverURL)
		}
		return domain.PublicArtist{}, fmt.Errorf("%w: daily wall limit reached", ErrRateLimit)
	}
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
	return s.GetBySlugForActor(ctx, slug, "", "")
}

// GetBySlugForActor adds the caller-specific edit flag. The actor is optional:
// public requests simply get can_edit=false.
func (s *Service) GetBySlugForActor(ctx context.Context, slug, actorID, role string) (domain.PublicArtist, error) {
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
	pub := artist.ToPublic()
	pub.CanEdit = canEditArtist(artist, actorID, role)
	return pub, nil
}

type UpdateArtistInput struct {
	Slug       string
	ActorID    string
	ActorRole  string
	Name       *string
	Bio        *string
	Genres     *[]string
	LookingFor *string
	Cover      io.Reader
	CoverSize  int64
}

func canEditArtist(a domain.Artist, actorID, role string) bool {
	if role == "admin" {
		return true
	}
	if actorID == "" {
		return false
	}
	// A claimed wall belongs to its claimant. The original creator keeps edit
	// rights while the wall is unclaimed or pending, then loses them on accept.
	if a.ClaimStatus == domain.ClaimClaimed {
		return a.ClaimedBy != nil && *a.ClaimedBy == actorID
	}
	if a.CreatedBy != nil && *a.CreatedBy == actorID {
		return true
	}
	if a.ClaimedBy != nil && *a.ClaimedBy == actorID {
		return true
	}
	return false
}

func (s *Service) Update(ctx context.Context, in UpdateArtistInput) (domain.PublicArtist, error) {
	current, err := s.repo.GetBySlug(ctx, strings.TrimSpace(strings.ToLower(in.Slug)))
	if errors.Is(err, ErrNotFound) {
		return domain.PublicArtist{}, ErrNotFound
	}
	if err != nil {
		return domain.PublicArtist{}, err
	}
	if !canEditArtist(current, in.ActorID, in.ActorRole) {
		return domain.PublicArtist{}, ErrForbidden
	}

	name := current.Name
	if in.Name != nil {
		name = NormalizeName(*in.Name)
		if err := ValidateName(name); err != nil {
			return domain.PublicArtist{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
		}
		if name != current.Name {
			taken, err := s.repo.existsByNormalizedName(ctx, name, current.ID)
			if err != nil {
				return domain.PublicArtist{}, err
			}
			if taken {
				return domain.PublicArtist{}, fmt.Errorf("%w: an artist page with this name already exists", ErrConflict)
			}
		}
	}

	bio := current.Bio
	if in.Bio != nil {
		b := strings.TrimSpace(*in.Bio)
		if err := ValidateBio(b); err != nil {
			return domain.PublicArtist{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
		}
		if b == "" {
			bio = nil
		} else {
			bio = &b
		}
	}

	genres := current.Genres
	if in.Genres != nil {
		genres = NormalizeGenres(*in.Genres)
		if err := ValidateGenres(genres); err != nil {
			return domain.PublicArtist{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
		}
	}

	looking := current.LookingFor
	if in.LookingFor != nil {
		lf := strings.TrimSpace(*in.LookingFor)
		if err := ValidateBio(lf); err != nil {
			return domain.PublicArtist{}, fmt.Errorf("%w: looking_for too long", ErrValidation)
		}
		if lf == "" {
			looking = nil
		} else {
			looking = &lf
		}
	}

	coverURL := current.CoverURL
	avatarURL := current.AvatarURL
	var newKey string
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
		newKey = key
		coverURL = &key
		avatarURL = &key
	}

	updated, err := s.repo.Update(ctx, current.ID, UpdateFields{
		Name:       name,
		Bio:        bio,
		CoverURL:   coverURL,
		AvatarURL:  avatarURL,
		Genres:     genres,
		LookingFor: looking,
	})
	if errors.Is(err, ErrNameTaken) {
		if newKey != "" {
			_ = s.storage.Delete(newKey)
		}
		return domain.PublicArtist{}, fmt.Errorf("%w: an artist page with this name already exists", ErrConflict)
	}
	if err != nil {
		if newKey != "" {
			_ = s.storage.Delete(newKey)
		}
		return domain.PublicArtist{}, err
	}
	if newKey != "" && current.CoverURL != nil && *current.CoverURL != "" && *current.CoverURL != newKey {
		_ = s.storage.Delete(*current.CoverURL)
	}
	return updated.ToPublic(), nil
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
	IdentityURL        string
	ProofURL           string
}

type PublicClaim struct {
	ID                 string  `json:"id"`
	ArtistID           string  `json:"artist_id"`
	ArtistSlug         string  `json:"artist_slug,omitempty"`
	ArtistName         string  `json:"artist_name,omitempty"`
	UserID             string  `json:"user_id"`
	UserHandle         string  `json:"user_handle,omitempty"`
	Status             string  `json:"status"`
	VerificationMethod string  `json:"verification_method"`
	ClaimCode          string  `json:"claim_code"`
	IdentityURL        *string `json:"identity_url,omitempty"`
	ProofURL           *string `json:"proof_url,omitempty"`
	CreatedAt          string  `json:"created_at"`
}

func (s *Service) RequestClaim(ctx context.Context, in ClaimInput) (PublicClaim, error) {
	method := strings.TrimSpace(in.VerificationMethod)
	if method == "" {
		method = "identity"
	}
	if utf8.RuneCountInString(method) > 100 {
		return PublicClaim{}, fmt.Errorf("%w: verification_method is too long", ErrValidation)
	}

	identity := strings.TrimSpace(in.IdentityURL)
	if identity == "" {
		return PublicClaim{}, fmt.Errorf("%w: identity_url is required", ErrValidation)
	}
	if err := auth.ValidateHTTPURL(identity); err != nil {
		return PublicClaim{}, fmt.Errorf("%w: identity_url: %s", ErrValidation, err.Error())
	}

	artist, err := s.GetBySlug(ctx, in.Slug)
	if err != nil {
		return PublicClaim{}, err
	}
	if artist.ClaimStatus == domain.ClaimClaimed {
		return PublicClaim{}, fmt.Errorf("%w: this wall is already claimed", ErrConflict)
	}

	var proof *string
	if p := strings.TrimSpace(in.ProofURL); p != "" {
		if err := auth.ValidateHTTPURL(p); err != nil {
			return PublicClaim{}, fmt.Errorf("%w: proof_url: %s", ErrValidation, err.Error())
		}
		proof = &p
	}

	cl, err := s.repo.CreateClaim(ctx, artist.ID, in.UserID, method, &identity, proof)
	if errors.Is(err, ErrClaimExists) {
		return PublicClaim{}, fmt.Errorf("%w: you already have a pending claim for this wall", ErrConflict)
	}
	if err != nil {
		return PublicClaim{}, err
	}
	cl.ArtistSlug = artist.Slug
	cl.ArtistName = artist.Name
	return toPublicClaim(cl), nil
}

// UpdateClaimProof attaches the public post that carries the claim code.
func (s *Service) UpdateClaimProof(ctx context.Context, claimID, userID, proofURL string) (PublicClaim, error) {
	if strings.TrimSpace(claimID) == "" {
		return PublicClaim{}, ErrNotFound
	}
	var proof *string
	if p := strings.TrimSpace(proofURL); p != "" {
		if err := auth.ValidateHTTPURL(p); err != nil {
			return PublicClaim{}, fmt.Errorf("%w: proof_url: %s", ErrValidation, err.Error())
		}
		proof = &p
	}
	cl, err := s.repo.UpdateClaimProof(ctx, claimID, userID, proof)
	if errors.Is(err, ErrNotFound) {
		return PublicClaim{}, ErrNotFound
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

func (s *Service) ListMine(ctx context.Context, userID string, limit, offset int) ([]PublicClaim, int, error) {
	if userID == "" {
		return nil, 0, ErrNotFound
	}
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
	rows, total, err := s.repo.ListByUser(ctx, userID, limit, offset)
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
		ArtistSlug:         cl.ArtistSlug,
		ArtistName:         cl.ArtistName,
		UserID:             cl.UserID,
		UserHandle:         cl.UserHandle,
		Status:             cl.Status,
		VerificationMethod: cl.VerificationMethod,
		ClaimCode:          cl.ClaimCode,
		IdentityURL:        cl.IdentityURL,
		ProofURL:           cl.ProofURL,
		CreatedAt:          cl.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}
