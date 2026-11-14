package auth

import "testing"

func TestGenerateRecoveryCodes(t *testing.T) {
	codes, err := GenerateRecoveryCodes(RecoveryCodeCount)
	if err != nil {
		t.Fatal(err)
	}
	if len(codes) != RecoveryCodeCount {
		t.Fatalf("expected %d codes, got %d", RecoveryCodeCount, len(codes))
	}
	seen := make(map[string]bool, len(codes))
	for _, code := range codes {
		if len(code) != recoveryCodeLength+1 || code[recoveryCodeLength/2] != '-' {
			t.Fatalf("unexpected code format: %q", code)
		}
		if seen[code] {
			t.Fatalf("duplicate code: %q", code)
		}
		seen[code] = true
		for _, r := range code {
			if r == '-' {
				continue
			}
			if !containsRune(recoveryAlphabet, r) {
				t.Fatalf("code %q uses %q outside the alphabet", code, r)
			}
		}
	}
}

func TestRecoveryCodeHashing(t *testing.T) {
	code := "ABCDE-FGHJK"
	want := HashRecoveryCode(code)
	for _, variant := range []string{"abcde-fghjk", " ABCDE FGHJK ", "ABCDEFGHJK"} {
		if got := HashRecoveryCode(variant); got != want {
			t.Fatalf("normalization mismatch for %q", variant)
		}
	}
	if HashRecoveryCode("ABCDE-FGHJM") == want {
		t.Fatal("different codes must hash differently")
	}
}

func containsRune(s string, r rune) bool {
	for _, v := range s {
		if v == r {
			return true
		}
	}
	return false
}
