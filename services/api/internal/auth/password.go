package auth

import (
	"fmt"

	"golang.org/x/crypto/bcrypt"
)

const bcryptCost = 12

// dummyHash keeps unknown-handle logins on the same bcrypt path as real ones.
var dummyHash string

func init() {
	h, err := bcrypt.GenerateFromPassword([]byte("walls-dummy-timing-pad"), bcryptCost)
	if err != nil {
		panic(err)
	}
	dummyHash = string(h)
}

func HashPassword(password string) (string, error) {
	b, err := bcrypt.GenerateFromPassword([]byte(password), bcryptCost)
	if err != nil {
		return "", fmt.Errorf("hash password: %w", err)
	}
	return string(b), nil
}

func CheckPassword(hash, password string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}
