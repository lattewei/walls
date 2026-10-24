package artists

import "testing"

func TestNextClaimStatusKeepsClaimedPage(t *testing.T) {
	if got := NextClaimStatus("claimed", false); got != "claimed" {
		t.Fatalf("rejecting a side claim on a claimed page = %s, want claimed", got)
	}
	if got := NextClaimStatus("claimed", true); got != "claimed" {
		t.Fatalf("claimed page with another pending claim = %s, want claimed", got)
	}
	if got := NextClaimStatus("pending", true); got != "pending" {
		t.Fatalf("pending with another claim = %s", got)
	}
	if got := NextClaimStatus("pending", false); got != "unclaimed" {
		t.Fatalf("last pending rejection = %s, want unclaimed", got)
	}
}
