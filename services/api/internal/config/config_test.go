package config

import (
	"testing"
	"time"
)

func TestLoadRequiresDatabaseURL(t *testing.T) {
	t.Setenv("DATABASE_URL", "")
	_, err := Load()
	if err == nil {
		t.Fatal("expected error when DATABASE_URL is empty")
	}
}

func TestLoadDefaults(t *testing.T) {
	t.Setenv("DATABASE_URL", "postgres://u:p@localhost:5432/db?sslmode=disable")
	t.Setenv("API_PORT", "")
	t.Setenv("API_HOST", "")
	t.Setenv("API_ENV", "")
	t.Setenv("JWT_ACCESS_TTL", "")

	cfg, err := Load()
	if err != nil {
		t.Fatalf("Load: %v", err)
	}
	if cfg.Port != 8080 {
		t.Errorf("Port = %d, want 8080", cfg.Port)
	}
	if cfg.Host != "0.0.0.0" {
		t.Errorf("Host = %q, want 0.0.0.0", cfg.Host)
	}
	if cfg.JWTAccessTTL != 15*time.Minute {
		t.Errorf("JWTAccessTTL = %v, want 15m", cfg.JWTAccessTTL)
	}
	if cfg.Addr() != "0.0.0.0:8080" {
		t.Errorf("Addr = %q", cfg.Addr())
	}
}

func TestSplitCSV(t *testing.T) {
	got := splitCSV(" http://a.com , http://b.com, ")
	if len(got) != 2 || got[0] != "http://a.com" || got[1] != "http://b.com" {
		t.Fatalf("splitCSV = %#v", got)
	}
}
