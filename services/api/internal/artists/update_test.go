package artists

import (
	"testing"

	"github.com/lattewei/walls/services/api/internal/domain"
)

func TestCanEditArtist(t *testing.T) {
	creator := "u1"
	claimer := "u2"
	a := domain.Artist{CreatedBy: &creator, ClaimedBy: &claimer}
	if !canEditArtist(a, "u1", "user") {
		t.Fatal("creator should edit")
	}
	if !canEditArtist(a, "u2", "user") {
		t.Fatal("claimer should edit")
	}
	if canEditArtist(a, "u3", "user") {
		t.Fatal("stranger should not edit")
	}
	if !canEditArtist(a, "u3", "admin") {
		t.Fatal("admin should edit")
	}
}
