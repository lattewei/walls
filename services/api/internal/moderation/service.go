package moderation

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"
	"unicode/utf8"
)

var (
	ErrValidation = errors.New("validation_error")
)

type Service struct {
	repo *Repository
}

func NewService(repo *Repository) *Service {
	return &Service{repo: repo}
}

type PublicReport struct {
	ID         string  `json:"id"`
	TargetType string  `json:"target_type"`
	TargetID   string  `json:"target_id"`
	Reason     string  `json:"reason"`
	Details    *string `json:"details,omitempty"`
	Status     string  `json:"status"`
	CreatedAt  string  `json:"created_at"`
}

func (s *Service) Create(ctx context.Context, reporterID string, targetType, targetID, reason, details string) (PublicReport, error) {
	targetType = strings.TrimSpace(targetType)
	switch targetType {
	case "track", "artist", "user":
	default:
		return PublicReport{}, fmt.Errorf("%w: target_type must be track, artist, or user", ErrValidation)
	}
	targetID = strings.TrimSpace(targetID)
	if targetID == "" {
		return PublicReport{}, fmt.Errorf("%w: target_id is required", ErrValidation)
	}
	reason = strings.TrimSpace(reason)
	if reason == "" || utf8.RuneCountInString(reason) > 200 {
		return PublicReport{}, fmt.Errorf("%w: reason is required (max 200 chars)", ErrValidation)
	}
	var det *string
	if d := strings.TrimSpace(details); d != "" {
		if utf8.RuneCountInString(d) > 2000 {
			return PublicReport{}, fmt.Errorf("%w: details too long", ErrValidation)
		}
		det = &d
	}
	var reporter *string
	if reporterID != "" {
		reporter = &reporterID
	}
	rep, err := s.repo.Create(ctx, reporter, targetType, targetID, reason, det)
	if err != nil {
		return PublicReport{}, err
	}
	return toPublic(rep), nil
}

func (s *Service) List(ctx context.Context, status string, limit, offset int) ([]PublicReport, int, error) {
	if limit <= 0 {
		limit = 20
	}
	if limit > 50 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}
	if status != "" {
		switch status {
		case "open", "reviewing", "resolved", "dismissed":
		default:
			return nil, 0, fmt.Errorf("%w: invalid status filter", ErrValidation)
		}
	}
	rows, total, err := s.repo.List(ctx, status, limit, offset)
	if err != nil {
		return nil, 0, err
	}
	out := make([]PublicReport, 0, len(rows))
	for _, r := range rows {
		out = append(out, toPublic(r))
	}
	return out, total, nil
}

func (s *Service) UpdateStatus(ctx context.Context, id, status, reviewerID string) (PublicReport, error) {
	switch status {
	case "open", "reviewing", "resolved", "dismissed":
	default:
		return PublicReport{}, fmt.Errorf("%w: invalid status", ErrValidation)
	}
	rep, err := s.repo.UpdateStatus(ctx, id, status, reviewerID)
	if errors.Is(err, ErrNotFound) {
		return PublicReport{}, ErrNotFound
	}
	if err != nil {
		return PublicReport{}, err
	}
	return toPublic(rep), nil
}

func toPublic(r Report) PublicReport {
	return PublicReport{
		ID:         r.ID,
		TargetType: r.TargetType,
		TargetID:   r.TargetID,
		Reason:     r.Reason,
		Details:    r.Details,
		Status:     r.Status,
		CreatedAt:  r.CreatedAt.UTC().Format(time.RFC3339),
	}
}
