package domain

import (
	"strings"
	"time"
)

const (
	ClaimUnclaimed = "unclaimed"
	ClaimPending   = "pending"
	ClaimClaimed   = "claimed"

	BadgeCommunity    = "community"
	BadgePendingClaim = "pending_claim"
	BadgeClaimed      = "claimed"
)

type Artist struct {
	ID          string
	Name        string
	Slug        string
	Bio         *string
	AvatarURL   *string
	CoverURL    *string
	Genres      []string
	LookingFor  *string
	ClaimStatus string
	CreatedBy   *string
	ClaimedBy   *string
	CreatedAt   time.Time
	UpdatedAt   time.Time
	HiddenAt    *time.Time
}

type PublicArtist struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Slug        string   `json:"slug"`
	Bio         *string  `json:"bio,omitempty"`
	AvatarURL   *string  `json:"avatar_url,omitempty"`
	CoverURL    *string  `json:"cover_url,omitempty"`
	Genres      []string `json:"genres"`
	LookingFor  *string  `json:"looking_for,omitempty"`
	ClaimStatus string   `json:"claim_status"`
	Badge       string   `json:"badge"`
	IsOfficial  bool     `json:"is_official"`
	CanEdit     bool     `json:"can_edit"`
	CreatedAt   string   `json:"created_at"`
}

func ClaimBadge(status string) string {
	switch status {
	case ClaimClaimed:
		return BadgeClaimed
	case ClaimPending:
		return BadgePendingClaim
	default:
		return BadgeCommunity
	}
}

func (a Artist) ToPublic() PublicArtist {
	genres := a.Genres
	if genres == nil {
		genres = []string{}
	}
	status := a.ClaimStatus
	if status == "" {
		status = ClaimUnclaimed
	}
	return PublicArtist{
		ID:          a.ID,
		Name:        a.Name,
		Slug:        a.Slug,
		Bio:         a.Bio,
		AvatarURL:   publicMediaURL(a.AvatarURL),
		CoverURL:    publicMediaURL(a.CoverURL),
		Genres:      genres,
		LookingFor:  a.LookingFor,
		ClaimStatus: status,
		Badge:       ClaimBadge(status),
		IsOfficial:  status == ClaimClaimed,
		CreatedAt:   a.CreatedAt.UTC().Format(time.RFC3339),
	}
}

func publicMediaURL(raw *string) *string {
	if raw == nil {
		return nil
	}
	v := strings.TrimSpace(*raw)
	if v == "" {
		return nil
	}
	if strings.HasPrefix(v, "http://") || strings.HasPrefix(v, "https://") || strings.HasPrefix(v, "/") {
		return &v
	}
	u := "/api/v1/media/" + v
	return &u
}
