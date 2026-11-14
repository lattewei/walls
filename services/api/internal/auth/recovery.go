package auth

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
)

const (
	RecoveryCodeCount  = 10
	recoveryCodeLength = 10
	recoveryAlphabet   = "23456789ABCDEFGHJKMNPQRSTVWXYZ"
)

func GenerateRecoveryCodes(n int) ([]string, error) {
	if n < 1 {
		return nil, fmt.Errorf("recovery code count must be positive")
	}
	codes := make([]string, 0, n)
	buf := make([]byte, recoveryCodeLength)
	for len(codes) < n {
		if _, err := rand.Read(buf); err != nil {
			return nil, fmt.Errorf("generate recovery code: %w", err)
		}
		var b strings.Builder
		for i, v := range buf {
			if i == recoveryCodeLength/2 {
				b.WriteByte('-')
			}
			b.WriteByte(recoveryAlphabet[int(v)%len(recoveryAlphabet)])
		}
		codes = append(codes, b.String())
	}
	return codes, nil
}

func NormalizeRecoveryCode(code string) string {
	var b strings.Builder
	for _, r := range strings.ToUpper(strings.TrimSpace(code)) {
		switch {
		case r >= 'A' && r <= 'Z', r >= '0' && r <= '9':
			b.WriteRune(r)
		}
	}
	return b.String()
}

func HashRecoveryCode(code string) string {
	sum := sha256.Sum256([]byte(NormalizeRecoveryCode(code)))
	return hex.EncodeToString(sum[:])
}
