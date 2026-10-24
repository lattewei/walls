package users

import "testing"

func TestValidateHandle(t *testing.T) {
	ok := []string{"abc", "johnny_beats", "a_1", "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"}
	for _, h := range ok {
		if err := ValidateHandle(h); err != nil {
			t.Errorf("ValidateHandle(%q) unexpected err: %v", h, err)
		}
	}
	bad := []string{"", "ab", "Johnny", "has-dash", "has.dot", "spaces no", "toolongtoolongtoolongtoolongtoolongx"}
	for _, h := range bad {
		if err := ValidateHandle(h); err == nil {
			t.Errorf("ValidateHandle(%q) expected error", h)
		}
	}
}

func TestNormalizeHandle(t *testing.T) {
	if got := NormalizeHandle("  Johnny_Beats "); got != "johnny_beats" {
		t.Fatalf("NormalizeHandle = %q", got)
	}
}
