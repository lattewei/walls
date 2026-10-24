package artists

// NextClaimStatus is the page status after a claim is rejected.
// A page that is already claimed stays claimed. Rejecting someone else
// must not clear claimed_by.
func NextClaimStatus(current string, otherPending bool) string {
	if current == "claimed" {
		return "claimed"
	}
	if otherPending {
		return "pending"
	}
	return "unclaimed"
}
