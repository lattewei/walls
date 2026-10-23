package domain

import "time"

type PublicProfileUser struct {
	ID          string  `json:"id"`
	Handle      string  `json:"handle"`
	DisplayName string  `json:"display_name"`
	AvatarURL   *string `json:"avatar_url,omitempty"`
	Bio         *string `json:"bio,omitempty"`
	CreatedAt   string  `json:"created_at"`
	TrackCount  int     `json:"track_count,omitempty"`
}

type PublicProfile struct {
	User     PublicProfileUser `json:"user"`
	Contacts PublicContacts    `json:"contacts"`
}

func (u User) ToPublicProfile() PublicProfileUser {
	return PublicProfileUser{
		ID:          u.ID,
		Handle:      u.Handle,
		DisplayName: u.DisplayName,
		AvatarURL:   publicMediaURL(u.AvatarURL),
		Bio:         u.Bio,
		CreatedAt:   u.CreatedAt.UTC().Format(time.RFC3339),
	}
}
