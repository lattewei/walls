package artists

import "testing"

func TestSlugify(t *testing.T) {
	cases := map[string]string{
		"Johnny":           "johnny",
		"  Johnny Hallyday ": "johnny-hallyday",
		"Ninho!!":          "ninho",
		"A$AP Rocky":       "aap-rocky",
		"Damso / Paris":    "damso-paris",
		"---":              "",
	}
	for in, want := range cases {
		got := Slugify(in)
		if got != want {
			t.Errorf("Slugify(%q) = %q, want %q", in, got, want)
		}
	}
}

func TestValidateSlug(t *testing.T) {
	if err := ValidateSlug("johnny"); err != nil {
		t.Fatal(err)
	}
	if err := ValidateSlug("johnny-hallyday"); err != nil {
		t.Fatal(err)
	}
	bad := []string{"", "a", "Johnny", "-johnny", "johnny-", "john--ny", "has_underscore"}
	for _, s := range bad {
		if err := ValidateSlug(s); err == nil {
			t.Errorf("ValidateSlug(%q) expected error", s)
		}
	}
}

func TestNormalizeGenres(t *testing.T) {
	got := NormalizeGenres([]string{" Rap ", "rap", "Drill", ""})
	if len(got) != 2 || got[0] != "Rap" || got[1] != "Drill" {
		t.Fatalf("got %#v", got)
	}
}
