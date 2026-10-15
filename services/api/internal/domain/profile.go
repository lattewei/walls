package domain

// ExternalLink is a labeled public URL on a producer profile.
type ExternalLink struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

// ProducerProfile holds optional public contact channels.
// Nothing here is private account data — only what the user chose to publish.
type ProducerProfile struct {
	UserID             string
	PublicContactEmail *string
	InstagramURL       *string
	OtherLinks         []ExternalLink
}

// PublicContacts is the JSON shape exposed by the API.
type PublicContacts struct {
	PublicContactEmail *string        `json:"public_contact_email,omitempty"`
	InstagramURL       *string        `json:"instagram_url,omitempty"`
	OtherLinks         []ExternalLink `json:"other_links"`
}

// ToPublic maps a producer profile to API contacts (empty links → []).
func (p ProducerProfile) ToPublic() PublicContacts {
	links := p.OtherLinks
	if links == nil {
		links = []ExternalLink{}
	}
	return PublicContacts{
		PublicContactEmail: p.PublicContactEmail,
		InstagramURL:       p.InstagramURL,
		OtherLinks:         links,
	}
}

// EmptyContacts returns contacts with an empty link list (JSON []).
func EmptyContacts() PublicContacts {
	return PublicContacts{OtherLinks: []ExternalLink{}}
}

// MeResponse is the authenticated profile payload.
type MeResponse struct {
	User     PublicUser     `json:"user"`
	Contacts PublicContacts `json:"contacts"`
}
