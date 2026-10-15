package auth

import (
	"fmt"
	"net/mail"
	"net/url"
	"strings"
	"unicode/utf8"

	"github.com/openstudio/openstudio/services/api/internal/domain"
)

const (
	maxOtherLinks   = 10
	maxLinkLabelLen = 40
	maxURLLen       = 500
)

// ValidatePublicEmail checks an optional public contact email (not account login).
func ValidatePublicEmail(email string) error {
	email = strings.TrimSpace(email)
	if email == "" {
		return nil
	}
	if utf8.RuneCountInString(email) > 254 {
		return fmt.Errorf("public contact email is too long")
	}
	addr, err := mail.ParseAddress(email)
	if err != nil || addr.Address != email {
		return fmt.Errorf("invalid public contact email")
	}
	return nil
}

// ValidateHTTPURL ensures the URL is http(s) with a host (blocks javascript:, etc.).
func ValidateHTTPURL(raw string) error {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return nil
	}
	if utf8.RuneCountInString(raw) > maxURLLen {
		return fmt.Errorf("url is too long")
	}
	u, err := url.Parse(raw)
	if err != nil {
		return fmt.Errorf("invalid url")
	}
	if u.Scheme != "http" && u.Scheme != "https" {
		return fmt.Errorf("url must start with http:// or https://")
	}
	if u.Host == "" {
		return fmt.Errorf("url must include a host")
	}
	return nil
}

// ValidateInstagramURL accepts empty or a valid http(s) URL (flexible host).
func ValidateInstagramURL(raw string) error {
	if err := ValidateHTTPURL(raw); err != nil {
		return fmt.Errorf("instagram_url: %s", err.Error())
	}
	return nil
}

// ValidateOtherLinks validates the optional link list.
func ValidateOtherLinks(links []domain.ExternalLink) error {
	if len(links) > maxOtherLinks {
		return fmt.Errorf("at most %d other links allowed", maxOtherLinks)
	}
	for i, l := range links {
		label := strings.TrimSpace(l.Label)
		href := strings.TrimSpace(l.URL)
		if label == "" || href == "" {
			return fmt.Errorf("other_links[%d]: label and url are required", i)
		}
		if utf8.RuneCountInString(label) > maxLinkLabelLen {
			return fmt.Errorf("other_links[%d]: label is too long", i)
		}
		if err := ValidateHTTPURL(href); err != nil {
			return fmt.Errorf("other_links[%d]: %s", i, err.Error())
		}
	}
	return nil
}

// NormalizeOtherLinks trims labels/urls.
func NormalizeOtherLinks(links []domain.ExternalLink) []domain.ExternalLink {
	if links == nil {
		return []domain.ExternalLink{}
	}
	out := make([]domain.ExternalLink, 0, len(links))
	for _, l := range links {
		out = append(out, domain.ExternalLink{
			Label: strings.TrimSpace(l.Label),
			URL:   strings.TrimSpace(l.URL),
		})
	}
	return out
}

// PtrString returns nil if s is empty after trim, else a pointer to trimmed s.
func PtrString(s string) *string {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	return &s
}
