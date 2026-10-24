package tracks

import (
	"context"
	"errors"
	"strings"
	"testing"
)

func TestNormalizeSlugs(t *testing.T) {
	got := normalizeSlugs([]string{" Johnny ", "JOHNNY", "", "kay"})
	if len(got) != 2 || got[0] != "johnny" || got[1] != "kay" {
		t.Fatalf("got %#v", got)
	}
}

func TestNormalizeTags(t *testing.T) {
	got := normalizeTags([]string{" Drill ", "drill", "Dark", ""})
	if len(got) != 2 || got[0] != "Drill" || got[1] != "Dark" {
		t.Fatalf("got %#v", got)
	}
}

func TestValidateTags(t *testing.T) {
	if err := validateTags([]string{"ok"}); err != nil {
		t.Fatal(err)
	}
	long := strings.Repeat("t", maxTagLen+1)
	if err := validateTags([]string{long}); err == nil {
		t.Fatal("expected tag too long")
	}
	many := make([]string, maxTags+1)
	for i := range many {
		many[i] = "t"
	}
	if err := validateTags(many); err == nil {
		t.Fatal("expected too many tags")
	}
}

func TestCreateRejectsInvalidInput(t *testing.T) {
	svc := NewService(nil, nil, nil, 100, 5)
	ctx := context.Background()

	_, err := svc.Create(ctx, UploadInput{})
	if !errors.Is(err, ErrValidation) {
		t.Fatalf("empty title: %v", err)
	}

	_, err = svc.Create(ctx, UploadInput{Title: "Night run"})
	if !errors.Is(err, ErrValidation) {
		t.Fatalf("missing slugs: %v", err)
	}

	slugs := make([]string, maxArtists+1)
	for i := range slugs {
		slugs[i] = "a" + strings.Repeat("x", i)
	}
	_, err = svc.Create(ctx, UploadInput{Title: "Night run", ArtistSlugs: slugs})
	if !errors.Is(err, ErrValidation) {
		t.Fatalf("too many artists: %v", err)
	}

	_, err = svc.Create(ctx, UploadInput{
		Title:       "Night run",
		ArtistSlugs: []string{"johnny"},
		FileSize:    101,
	})
	if !errors.Is(err, ErrValidation) {
		t.Fatalf("file too large: %v", err)
	}
}
