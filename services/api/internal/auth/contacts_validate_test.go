package auth

import (
	"testing"

	"github.com/openstudio/openstudio/services/api/internal/domain"
)

func TestValidatePublicEmail(t *testing.T) {
	if err := ValidatePublicEmail(""); err != nil {
		t.Fatal(err)
	}
	if err := ValidatePublicEmail("beat@example.com"); err != nil {
		t.Fatal(err)
	}
	if err := ValidatePublicEmail("not-an-email"); err == nil {
		t.Fatal("expected error")
	}
}

func TestValidateHTTPURL(t *testing.T) {
	ok := []string{
		"https://instagram.com/foo",
		"http://soundcloud.com/x",
	}
	for _, u := range ok {
		if err := ValidateHTTPURL(u); err != nil {
			t.Errorf("%q: %v", u, err)
		}
	}
	bad := []string{
		"javascript:alert(1)",
		"ftp://files.example",
		"not a url",
		"/relative",
	}
	for _, u := range bad {
		if err := ValidateHTTPURL(u); err == nil {
			t.Errorf("%q: expected error", u)
		}
	}
}

func TestValidateOtherLinks(t *testing.T) {
	err := ValidateOtherLinks([]domain.ExternalLink{
		{Label: "SC", URL: "https://soundcloud.com/x"},
	})
	if err != nil {
		t.Fatal(err)
	}
	err = ValidateOtherLinks([]domain.ExternalLink{
		{Label: "x", URL: "javascript:alert(1)"},
	})
	if err == nil {
		t.Fatal("expected js url rejected")
	}
}
