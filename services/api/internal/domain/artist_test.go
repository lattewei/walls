package domain

import (
	"testing"
	"time"
)

func TestClaimBadge(t *testing.T) {
	cases := map[string]string{
		ClaimUnclaimed: BadgeCommunity,
		ClaimPending:   BadgePendingClaim,
		ClaimClaimed:   BadgeClaimed,
		"":             BadgeCommunity,
		"weird":        BadgeCommunity,
	}
	for in, want := range cases {
		if got := ClaimBadge(in); got != want {
			t.Errorf("ClaimBadge(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestToPublicOfficialOnlyWhenClaimed(t *testing.T) {
	base := Artist{
		ID:        "1",
		Name:      "Johnny",
		Slug:      "johnny",
		CreatedAt: time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC),
	}

	base.ClaimStatus = ClaimUnclaimed
	p := base.ToPublic()
	if p.Badge != BadgeCommunity || p.IsOfficial {
		t.Fatalf("unclaimed: badge=%s official=%v", p.Badge, p.IsOfficial)
	}

	base.ClaimStatus = ClaimClaimed
	p = base.ToPublic()
	if p.Badge != BadgeClaimed || !p.IsOfficial {
		t.Fatalf("claimed: badge=%s official=%v", p.Badge, p.IsOfficial)
	}

	base.ClaimStatus = ClaimPending
	p = base.ToPublic()
	if p.Badge != BadgePendingClaim || p.IsOfficial {
		t.Fatalf("pending: badge=%s official=%v", p.Badge, p.IsOfficial)
	}
}
