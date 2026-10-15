package domain

import "time"

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
	CreatedAt   string   `json:"created_at"`
}

func (a Artist) ToPublic() PublicArtist {
	genres := a.Genres
	if genres == nil {
		genres = []string{}
	}
	return PublicArtist{
		ID:          a.ID,
		Name:        a.Name,
		Slug:        a.Slug,
		Bio:         a.Bio,
		AvatarURL:   a.AvatarURL,
		CoverURL:    a.CoverURL,
		Genres:      genres,
		LookingFor:  a.LookingFor,
		ClaimStatus: a.ClaimStatus,
		CreatedAt:   a.CreatedAt.UTC().Format(time.RFC3339),
	}
}
