package auth

import (
	"fmt"
	"regexp"
	"strings"
	"unicode/utf8"
)

var handleRe = regexp.MustCompile(`^[a-z0-9_]{3,32}$`)

const (
	minPasswordLen = 8
	maxPasswordLen = 128
	maxDisplayName = 64
	maxBioLen      = 500
)

// ValidateHandle checks handle format (already normalized to lowercase).
func ValidateHandle(handle string) error {
	if !handleRe.MatchString(handle) {
		return fmt.Errorf("handle must be 3–32 chars: lowercase letters, digits, underscore")
	}
	return nil
}

// ValidatePassword checks password length only (no email recovery in MVP).
func ValidatePassword(password string) error {
	n := utf8.RuneCountInString(password)
	if n < minPasswordLen {
		return fmt.Errorf("password must be at least %d characters", minPasswordLen)
	}
	if n > maxPasswordLen {
		return fmt.Errorf("password must be at most %d characters", maxPasswordLen)
	}
	return nil
}

// ValidateDisplayName checks an optional display name; empty is allowed (caller may default).
func ValidateDisplayName(name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return fmt.Errorf("display name is required")
	}
	if utf8.RuneCountInString(name) > maxDisplayName {
		return fmt.Errorf("display name must be at most %d characters", maxDisplayName)
	}
	return nil
}

// ValidateBio checks an optional bio.
func ValidateBio(bio string) error {
	if utf8.RuneCountInString(bio) > maxBioLen {
		return fmt.Errorf("bio must be at most %d characters", maxBioLen)
	}
	return nil
}
