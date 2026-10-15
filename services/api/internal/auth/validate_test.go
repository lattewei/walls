package auth

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

func TestValidatePassword(t *testing.T) {
	if err := ValidatePassword("short"); err == nil {
		t.Fatal("expected short password error")
	}
	if err := ValidatePassword("longenough"); err != nil {
		t.Fatal(err)
	}
}
