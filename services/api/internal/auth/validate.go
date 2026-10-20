package auth

import (
	"fmt"
	"strings"
	"unicode/utf8"

	"github.com/lattewei/walls/services/api/internal/users"
)

const (
	minPasswordLen = 8
	maxPasswordLen = 128
	maxDisplayName = 64
	maxBioLen      = 500
)

func ValidateHandle(handle string) error {
	return users.ValidateHandle(handle)
}

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

func ValidateBio(bio string) error {
	if utf8.RuneCountInString(bio) > maxBioLen {
		return fmt.Errorf("bio must be at most %d characters", maxBioLen)
	}
	return nil
}
