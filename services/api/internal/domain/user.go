package domain

import "time"

type User struct {
	ID           string
	Handle       string
	PasswordHash string
	DisplayName  string
	AvatarURL    *string
	Bio          *string
	Role         string
	CreatedAt    time.Time
	UpdatedAt    time.Time
	DeletedAt    *time.Time
}

type PublicUser struct {
	ID          string  `json:"id"`
	Handle      string  `json:"handle"`
	DisplayName string  `json:"display_name"`
	AvatarURL   *string `json:"avatar_url,omitempty"`
	Bio         *string `json:"bio,omitempty"`
	Role        string  `json:"role"`
	CreatedAt   string  `json:"created_at"`
}

func (u User) ToPublic() PublicUser {
	return PublicUser{
		ID:          u.ID,
		Handle:      u.Handle,
		DisplayName: u.DisplayName,
		AvatarURL:   publicMediaURL(u.AvatarURL),
		Bio:         u.Bio,
		Role:        u.Role,
		CreatedAt:   u.CreatedAt.UTC().Format(time.RFC3339),
	}
}
