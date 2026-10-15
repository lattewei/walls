package users

import (
	"fmt"
	"regexp"
)

var handleRe = regexp.MustCompile(`^[a-z0-9_]{3,32}$`)

func ValidateHandle(handle string) error {
	if !handleRe.MatchString(handle) {
		return fmt.Errorf("handle must be 3–32 chars: lowercase letters, digits, underscore")
	}
	return nil
}
