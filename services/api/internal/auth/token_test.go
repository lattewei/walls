package auth

import (
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestIssueAndParseAccessToken(t *testing.T) {
	svc := NewTokenService("test-secret-key-32chars-minimum!", 15*time.Minute)
	tok, exp, err := svc.IssueAccessToken("user-1", "johnny", 1)
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
	if claims.UserID != "user-1" || claims.Handle != "johnny" || claims.SessionVersion != 1 {
		t.Fatalf("claims = %+v", claims)
	}
}

func TestParseRejectsTamperedToken(t *testing.T) {
	svc := NewTokenService("test-secret-key-32chars-minimum!", time.Minute)
	tok, _, err := svc.IssueAccessToken("user-1", "johnny", 1)
	if err != nil {
		t.Fatal(err)
	}
	other := NewTokenService("other-secret-key-32chars-minimum!", time.Minute)
	if _, err := other.ParseAccessToken(tok); err == nil {
		t.Fatal("expected invalid token with wrong secret")
	}
}

func TestParseRejectsIssuerMismatch(t *testing.T) {
	svc := NewTokenService("test-secret-key-32chars-minimum!", time.Minute)
	tok, _, err := svc.IssueAccessToken("user-1", "johnny", 1)
	if err != nil {
		t.Fatal(err)
	}
	svc.issuer = "other"
	if _, err := svc.ParseAccessToken(tok); err == nil {
		t.Fatal("expected invalid token with wrong issuer")
	}
}

func TestParseRejectsAlgNone(t *testing.T) {
	svc := NewTokenService("test-secret-key-32chars-minimum!", time.Minute)
	token := jwt.NewWithClaims(jwt.SigningMethodNone, Claims{
		UserID:         "user-1",
		SessionVersion: 1,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "walls",
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute)),
		},
	})
	signed, err := token.SignedString(jwt.UnsafeAllowNoneSignatureType)
	if err != nil {
		t.Fatal(err)
	}
	if _, err := svc.ParseAccessToken(signed); err == nil {
		t.Fatal("expected alg=none to be rejected")
	}
}
