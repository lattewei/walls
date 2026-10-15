package tracks

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/openstudio/openstudio/services/api/internal/artists"
	"github.com/openstudio/openstudio/services/api/internal/domain"
	"github.com/openstudio/openstudio/services/api/internal/media"
)

const (
	maxTitleLen  = 120
	maxDescLen   = 2000
	maxTags      = 20
	maxTagLen    = 40
	maxArtists   = 10
	defaultLimit = 20
	maxLimit     = 50
)

type Service struct {
	repo       *Repository
	artists    *artists.Repository
	storage    *media.LocalStorage
	maxBytes   int64
	dailyLimit int
}

func NewService(
	repo *Repository,
	artistRepo *artists.Repository,
	storage *media.LocalStorage,
	maxBytes int64,
	dailyLimit int,
) *Service {
	if dailyLimit < 1 {
		dailyLimit = 20
	}
	if maxBytes < 1 {
		maxBytes = 50 << 20
	}
	return &Service{
		repo:       repo,
		artists:    artistRepo,
		storage:    storage,
		maxBytes:   maxBytes,
		dailyLimit: dailyLimit,
	}
}

var (
	ErrValidation = errors.New("validation_error")
	ErrForbidden  = errors.New("forbidden")
	ErrRateLimit  = errors.New("rate_limited")
)

type UploadInput struct {
	UploaderID  string
	Title       string
	Description string
	ArtistSlugs []string
	Tags        []string
	File        io.Reader
	FileSize    int64
}

func (s *Service) Create(ctx context.Context, in UploadInput) (domain.PublicTrack, error) {
	title := strings.TrimSpace(in.Title)
	if title == "" {
		return domain.PublicTrack{}, fmt.Errorf("%w: title is required", ErrValidation)
	}
	if utf8.RuneCountInString(title) > maxTitleLen {
		return domain.PublicTrack{}, fmt.Errorf("%w: title is too long", ErrValidation)
	}

	var desc *string
	if d := strings.TrimSpace(in.Description); d != "" {
		if utf8.RuneCountInString(d) > maxDescLen {
			return domain.PublicTrack{}, fmt.Errorf("%w: description is too long", ErrValidation)
		}
		desc = &d
	}

	slugs := normalizeSlugs(in.ArtistSlugs)
	if len(slugs) == 0 {
		return domain.PublicTrack{}, fmt.Errorf("%w: at least one artist_slug is required", ErrValidation)
	}
	if len(slugs) > maxArtists {
		return domain.PublicTrack{}, fmt.Errorf("%w: too many artists", ErrValidation)
	}

	tags := normalizeTags(in.Tags)
	if err := validateTags(tags); err != nil {
		return domain.PublicTrack{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
	}

	if in.FileSize > 0 && in.FileSize > s.maxBytes {
		return domain.PublicTrack{}, fmt.Errorf("%w: file too large", ErrValidation)
	}

	since := time.Now().UTC().Truncate(24 * time.Hour)
	count, err := s.repo.CountCreatedSince(ctx, in.UploaderID, since)
	if err != nil {
		return domain.PublicTrack{}, err
	}
	if count >= s.dailyLimit {
		return domain.PublicTrack{}, fmt.Errorf("%w: daily upload limit reached", ErrRateLimit)
	}

	artistIDs := make([]string, 0, len(slugs))
	for _, slug := range slugs {
		a, err := s.artists.GetBySlug(ctx, slug)
		if errors.Is(err, artists.ErrNotFound) {
			return domain.PublicTrack{}, fmt.Errorf("%w: unknown artist slug %q", ErrValidation, slug)
		}
		if err != nil {
			return domain.PublicTrack{}, err
		}
		artistIDs = append(artistIDs, a.ID)
	}

	limited := io.LimitReader(in.File, s.maxBytes+1)
	info, stream, err := media.DetectAudio(limited)
	if err != nil {
		return domain.PublicTrack{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
	}

	key, err := s.storage.Save(stream, info.Ext)
	if err != nil {
		return domain.PublicTrack{}, err
	}

	track, err := s.repo.Create(ctx, CreateInput{
		UploaderUserID: in.UploaderID,
		Title:          title,
		Description:    desc,
		AudioObjectKey: key,
		AudioFormat:    info.Format,
		Status:         domain.TrackReady,
		ArtistIDs:      artistIDs,
		Tags:           tags,
	})
	if err != nil {
		_ = s.storage.Delete(key)
		return domain.PublicTrack{}, err
	}
	return track.ToPublic(), nil
}

func (s *Service) Get(ctx context.Context, id string) (domain.PublicTrack, error) {
	t, err := s.repo.GetByID(ctx, id)
	if errors.Is(err, ErrNotFound) {
		return domain.PublicTrack{}, ErrNotFound
	}
	if err != nil {
		return domain.PublicTrack{}, err
	}
	if t.Status == domain.TrackRemoved {
		return domain.PublicTrack{}, ErrNotFound
	}
	return t.ToPublic(), nil
}

func (s *Service) ListByArtistSlug(ctx context.Context, slug string, limit, offset int) (ListResult, error) {
	slug = strings.TrimSpace(strings.ToLower(slug))
	if err := artists.ValidateSlug(slug); err != nil {
		return ListResult{}, ErrNotFound
	}
	if _, err := s.artists.GetBySlug(ctx, slug); errors.Is(err, artists.ErrNotFound) {
		return ListResult{}, ErrNotFound
	} else if err != nil {
		return ListResult{}, err
	}

	if limit <= 0 {
		limit = defaultLimit
	}
	if limit > maxLimit {
		limit = maxLimit
	}
	if offset < 0 {
		offset = 0
	}

	rows, total, err := s.repo.ListByArtistSlug(ctx, slug, limit, offset)
	if err != nil {
		return ListResult{}, err
	}
	items := make([]domain.PublicTrack, 0, len(rows))
	for _, t := range rows {
		items = append(items, t.ToPublic())
	}
	return ListResult{Tracks: items, Total: total, Limit: limit, Offset: offset}, nil
}

type ListResult struct {
	Tracks []domain.PublicTrack `json:"tracks"`
	Total  int                  `json:"total"`
	Limit  int                  `json:"limit"`
	Offset int                  `json:"offset"`
}

func (s *Service) Withdraw(ctx context.Context, trackID, userID string) error {
	t, err := s.repo.GetByID(ctx, trackID)
	if errors.Is(err, ErrNotFound) {
		return ErrNotFound
	}
	if err != nil {
		return err
	}
	if t.UploaderUserID != userID {
		return ErrForbidden
	}
	if t.Status == domain.TrackRemoved {
		return ErrNotFound
	}
	return s.repo.SoftDelete(ctx, trackID, userID)
}

func (s *Service) Hide(ctx context.Context, trackID string) error {
	return s.repo.Hide(ctx, trackID)
}

func (s *Service) OpenAudio(ctx context.Context, trackID string) (*os.File, string, error) {
	t, err := s.repo.GetByID(ctx, trackID)
	if errors.Is(err, ErrNotFound) {
		return nil, "", ErrNotFound
	}
	if err != nil {
		return nil, "", err
	}
	if t.Status != domain.TrackReady || t.AudioObjectKey == nil || *t.AudioObjectKey == "" {
		return nil, "", ErrNotFound
	}
	f, err := s.storage.Open(*t.AudioObjectKey)
	if err != nil {
		return nil, "", err
	}
	ct := "application/octet-stream"
	if t.AudioFormat != nil {
		switch *t.AudioFormat {
		case "mp3":
			ct = "audio/mpeg"
		case "wav":
			ct = "audio/wav"
		}
	}
	return f, ct, nil
}

func normalizeSlugs(in []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(in))
	for _, s := range in {
		s = strings.TrimSpace(strings.ToLower(s))
		if s == "" {
			continue
		}
		if _, ok := seen[s]; ok {
			continue
		}
		seen[s] = struct{}{}
		out = append(out, s)
	}
	return out
}

func normalizeTags(in []string) []string {
	seen := map[string]struct{}{}
	out := make([]string, 0, len(in))
	for _, t := range in {
		t = strings.TrimSpace(t)
		if t == "" {
			continue
		}
		key := strings.ToLower(t)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, t)
	}
	return out
}

func validateTags(tags []string) error {
	if len(tags) > maxTags {
		return fmt.Errorf("too many tags")
	}
	for _, t := range tags {
		if utf8.RuneCountInString(t) > maxTagLen {
			return fmt.Errorf("tag too long")
		}
	}
	return nil
}
