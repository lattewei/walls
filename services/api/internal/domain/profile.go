package domain

type ExternalLink struct {
	Label string `json:"label"`
	URL   string `json:"url"`
}

type ProducerProfile struct {
	UserID             string
	PublicContactEmail *string
	InstagramURL       *string
	OtherLinks         []ExternalLink
}

type PublicContacts struct {
	PublicContactEmail *string        `json:"public_contact_email,omitempty"`
	InstagramURL       *string        `json:"instagram_url,omitempty"`
	OtherLinks         []ExternalLink `json:"other_links"`
}

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

func EmptyContacts() PublicContacts {
	return PublicContacts{OtherLinks: []ExternalLink{}}
}

type MeResponse struct {
	User     PublicUser     `json:"user"`
	Contacts PublicContacts `json:"contacts"`
}
