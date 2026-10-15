package auth

import (
	"testing"
	"time"
)

func TestIssueAndParseAccessToken(t *testing.T) {
	svc := NewTokenService("test-secret-key-32chars-minimum!", 15*time.Minute)
	tok, exp, err := svc.IssueAccessToken("user-1", "johnny", "user")
	if err != nil {
		t.Fatal(err)
	}
	if tok == "" {
		t.Fatal("empty token")
	}
	if exp.Before(time.Now()) {
		t.Fatal("expiry in the past")
	}

	claims, err := svc.ParseAccessToken(tok)
	if err != nil {
		t.Fatal(err)
	}
	if claims.UserID != "user-1" || claims.Handle != "johnny" || claims.Role != "user" {
		t.Fatalf("claims = %+v", claims)
	}
}

func TestParseRejectsTamperedToken(t *testing.T) {
	svc := NewTokenService("test-secret-key-32chars-minimum!", time.Minute)
	tok, _, err := svc.IssueAccessToken("user-1", "johnny", "user")
	if err != nil {
		t.Fatal(err)
	}
	other := NewTokenService("other-secret-key-32chars-minimum!", time.Minute)
	if _, err := other.ParseAccessToken(tok); err == nil {
		t.Fatal("expected invalid token with wrong secret")
	}
}
