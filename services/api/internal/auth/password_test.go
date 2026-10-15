package auth

import "testing"

func TestHashAndCheckPassword(t *testing.T) {
	hash, err := HashPassword("correct-horse-battery")
	if err != nil {
		t.Fatal(err)
	}
	if hash == "" || hash == "correct-horse-battery" {
		t.Fatal("hash should not equal plaintext")
	}
	if !CheckPassword(hash, "correct-horse-battery") {
		t.Fatal("expected password to match")
	}
	if CheckPassword(hash, "wrong-password") {
		t.Fatal("expected wrong password to fail")
	}
}
