package server

import (
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"

	"github.com/openstudio/openstudio/services/api/internal/config"
)

func TestProcessHealth(t *testing.T) {
	cfg := config.Config{
		Host:        "127.0.0.1",
		Port:        8080,
		Env:         "test",
		CORSOrigins: []string{"http://localhost:3000"},
	}
	log := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
	s := New(cfg, log, nil)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	s.Engine().ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("status = %d, body = %s", w.Code, w.Body.String())
	}
}
