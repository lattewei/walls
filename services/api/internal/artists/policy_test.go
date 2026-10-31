package artists

import "testing"

func TestCheckWallIdentity(t *testing.T) {
	if err := CheckWallIdentity("Johnny", "johnny"); err != nil {
		t.Fatal(err)
	}
	if err := CheckWallIdentity("A$AP Rocky", "aap-rocky"); err != nil {
		t.Fatal(err)
	}
	bad := []struct {
		name string
		slug string
	}{
		{"admin", "admin"},
		{"Visit https://spam.example", "visit-spam"},
		{"mail@spam.com", "mailspamcom"},
		{"aaaaa", "aaaaa"},
		{"12345", "12345"},
		{"OnlyFans leaks", "onlyfans-leaks"},
		{"!!", "xx"},
	}
	for _, c := range bad {
		if err := CheckWallIdentity(c.name, c.slug); err == nil {
			t.Errorf("CheckWallIdentity(%q, %q) expected error", c.name, c.slug)
		}
	}
}
