package artists

import (
	"testing"

	"github.com/lattewei/walls/services/api/internal/domain"
)

func TestCanEditArtist(t *testing.T) {
	creator := "u1"
	claimer := "u2"

	open := domain.Artist{CreatedBy: &creator, ClaimedBy: &claimer}
	if !canEditArtist(open, "u1", "user") {
		t.Fatal("creator should edit an unclaimed wall")
	}
	if !canEditArtist(open, "u2", "user") {
		t.Fatal("claimer should edit")
	}
	if canEditArtist(open, "u3", "user") {
		t.Fatal("stranger should not edit")
	}
	if !canEditArtist(open, "u3", "admin") {
		t.Fatal("admin should edit")
	}

	pending := domain.Artist{CreatedBy: &creator, ClaimedBy: &claimer, ClaimStatus: domain.ClaimPending}
	if !canEditArtist(pending, "u1", "user") {
		t.Fatal("creator should edit while a claim is pending")
	}

	claimed := domain.Artist{CreatedBy: &creator, ClaimedBy: &claimer, ClaimStatus: domain.ClaimClaimed}
	if canEditArtist(claimed, "u1", "user") {
		t.Fatal("creator must lose edit rights once the wall is claimed")
	}
	if !canEditArtist(claimed, "u2", "user") {
		t.Fatal("claimed owner should edit a claimed wall")
	}
	if !canEditArtist(claimed, "u3", "admin") {
		t.Fatal("admin should edit a claimed wall")
	}
}
