package moderation

import (
	"context"
	"errors"
	"testing"
)

func TestCreateRejectsInvalidInput(t *testing.T) {
	svc := NewService(nil)
	ctx := context.Background()

	_, err := svc.Create(ctx, "", "playlist", "11111111-1111-1111-1111-111111111111", "spam", "")
	if !errors.Is(err, ErrValidation) {
		t.Fatalf("bad target_type: %v", err)
	}

	_, err = svc.Create(ctx, "", "track", "not-a-uuid", "spam", "")
	if !errors.Is(err, ErrValidation) {
		t.Fatalf("bad target_id: %v", err)
	}
}

func TestUpdateStatusRejectsInvalidStatus(t *testing.T) {
	svc := NewService(nil)
	_, err := svc.UpdateStatus(context.Background(), "id", "nope", "reviewer")
	if !errors.Is(err, ErrValidation) {
		t.Fatalf("got %v", err)
	}
}

func TestListRejectsInvalidStatusFilter(t *testing.T) {
	svc := NewService(nil)
	_, _, err := svc.List(context.Background(), "nope", 20, 0)
	if !errors.Is(err, ErrValidation) {
		t.Fatalf("got %v", err)
	}
}
