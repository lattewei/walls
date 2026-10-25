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

	"github.com/lattewei/walls/services/api/internal/artists"
	"github.com/lattewei/walls/services/api/internal/domain"
	"github.com/lattewei/walls/services/api/internal/media"
)

const (
	maxTitleLen  = 120
	maxDescLen   = 2000
	maxTags      = 20
	maxTagLen    = 40
	maxArtists   = 10
	defaultLimit = 20
	maxLimit     = 50
	maxOffset    = 10000
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

	info, stream, err := media.DetectAudio(in.File)
	if err != nil {
		if errors.Is(err, media.ErrUnsupported) {
			return domain.PublicTrack{}, fmt.Errorf("%w: unsupported audio type (allowed: mp3, wav)", ErrValidation)
		}
		return domain.PublicTrack{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
	}

	key, err := s.storage.SaveCapped(stream, info.Ext, s.maxBytes)
	if errors.Is(err, media.ErrTooLarge) {
		return domain.PublicTrack{}, fmt.Errorf("%w: file too large", ErrValidation)
	}
	if err != nil {
		return domain.PublicTrack{}, err
	}

	duration, err := confirmedDuration(s.storage, key, info.Format)
	if err != nil {
		_ = s.storage.Delete(key)
		return domain.PublicTrack{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
	}

	track, err := s.repo.Create(ctx, CreateInput{
		UploaderUserID:  in.UploaderID,
		Title:           title,
		Description:     desc,
		AudioObjectKey:  key,
		AudioFormat:     info.Format,
		DurationSeconds: duration,
		Status:          domain.TrackReady,
		ArtistIDs:       artistIDs,
		Tags:            tags,
		Since:           time.Now().UTC().Truncate(24 * time.Hour),
		DailyLimit:      s.dailyLimit,
	})
	if err != nil {
		_ = s.storage.Delete(key)
		if errors.Is(err, ErrDailyLimit) {
			return domain.PublicTrack{}, fmt.Errorf("%w: daily upload limit reached", ErrRateLimit)
		}
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

type UpdateInput struct {
	TrackID     string
	ActorID     string
	Title       *string
	Description *string
	ArtistSlugs *[]string
	Tags        *[]string
}

func (s *Service) Update(ctx context.Context, in UpdateInput) (domain.PublicTrack, error) {
	t, err := s.repo.GetByID(ctx, in.TrackID)
	if errors.Is(err, ErrNotFound) {
		return domain.PublicTrack{}, ErrNotFound
	}
	if err != nil {
		return domain.PublicTrack{}, err
	}
	if t.Status == domain.TrackRemoved {
		return domain.PublicTrack{}, ErrNotFound
	}
	if t.UploaderUserID != in.ActorID {
		return domain.PublicTrack{}, ErrForbidden
	}

	title := t.Title
	if in.Title != nil {
		title = strings.TrimSpace(*in.Title)
		if title == "" {
			return domain.PublicTrack{}, fmt.Errorf("%w: title is required", ErrValidation)
		}
		if utf8.RuneCountInString(title) > maxTitleLen {
			return domain.PublicTrack{}, fmt.Errorf("%w: title is too long", ErrValidation)
		}
	}

	desc := t.Description
	if in.Description != nil {
		d := strings.TrimSpace(*in.Description)
		if utf8.RuneCountInString(d) > maxDescLen {
			return domain.PublicTrack{}, fmt.Errorf("%w: description is too long", ErrValidation)
		}
		if d == "" {
			desc = nil
		} else {
			desc = &d
		}
	}

	slugs := t.ArtistSlugs
	if in.ArtistSlugs != nil {
		slugs = normalizeSlugs(*in.ArtistSlugs)
		if len(slugs) == 0 {
			return domain.PublicTrack{}, fmt.Errorf("%w: at least one artist_slug is required", ErrValidation)
		}
		if len(slugs) > maxArtists {
			return domain.PublicTrack{}, fmt.Errorf("%w: too many artists", ErrValidation)
		}
	}

	tags := t.Tags
	if in.Tags != nil {
		tags = normalizeTags(*in.Tags)
		if err := validateTags(tags); err != nil {
			return domain.PublicTrack{}, fmt.Errorf("%w: %s", ErrValidation, err.Error())
		}
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

	updated, err := s.repo.Update(ctx, t.ID, title, desc, artistIDs, tags)
	if err != nil {
		return domain.PublicTrack{}, err
	}
	return updated.ToPublic(), nil
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
	if offset > maxOffset {
		return ListResult{}, fmt.Errorf("%w: offset is too large", ErrValidation)
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

func (s *Service) ListByUploaderHandle(ctx context.Context, handle string, limit, offset int) (ListResult, error) {
	handle = strings.TrimSpace(strings.ToLower(handle))
	if handle == "" {
		return ListResult{}, ErrNotFound
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
	if offset > maxOffset {
		return ListResult{}, fmt.Errorf("%w: offset is too large", ErrValidation)
	}

	rows, total, err := s.repo.ListByUploaderHandle(ctx, handle, limit, offset)
	if err != nil {
		return ListResult{}, err
	}
	items := make([]domain.PublicTrack, 0, len(rows))
	for _, t := range rows {
		items = append(items, t.ToPublic())
	}
	return ListResult{Tracks: items, Total: total, Limit: limit, Offset: offset}, nil
}

type ProducersResult struct {
	Producers []domain.PublicProfileUser `json:"producers"`
	Total     int                        `json:"total"`
	Limit     int                        `json:"limit"`
	Offset    int                        `json:"offset"`
}

func (s *Service) ListProducers(ctx context.Context, limit, offset int) (ProducersResult, error) {
	if limit <= 0 {
		limit = defaultLimit
	}
	if limit > maxLimit {
		limit = maxLimit
	}
	if offset < 0 {
		offset = 0
	}
	if offset > maxOffset {
		return ProducersResult{}, fmt.Errorf("%w: offset is too large", ErrValidation)
	}
	rows, total, err := s.repo.ListProducers(ctx, limit, offset)
	if err != nil {
		return ProducersResult{}, err
	}
	return ProducersResult{Producers: rows, Total: total, Limit: limit, Offset: offset}, nil
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
	key, err := s.repo.SoftDelete(ctx, trackID, userID)
	if err != nil {
		return err
	}
	s.deleteAudio(key)
	return nil
}

func (s *Service) Hide(ctx context.Context, trackID string) error {
	key, err := s.repo.Hide(ctx, trackID)
	if err != nil {
		return err
	}
	s.deleteAudio(key)
	return nil
}

func (s *Service) deleteAudio(key *string) {
	if key == nil || *key == "" || s.storage == nil {
		return
	}
	_ = s.storage.Delete(*key)
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

func confirmedDuration(storage *media.LocalStorage, key, format string) (*int, error) {
	path, err := storage.Path(key)
	if err != nil {
		return nil, err
	}
	if format == "mp3" {
		f, err := os.Open(path)
		if err != nil {
			return nil, err
		}
		defer f.Close()
		secs, err := media.ConfirmMP3(f)
		if err != nil {
			return nil, fmt.Errorf("not a valid mp3")
		}
		return &secs, nil
	}
	if secs, err := media.ProbeFile(path, format); err == nil && secs > 0 {
		return &secs, nil
	}
	return nil, nil
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
