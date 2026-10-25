package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Host            string
	Port            int
	Env             string
	CORSOrigins     []string
	DatabaseURL     string
	MigrationsPath  string
	JWTSecret       string
	JWTAccessTTL    time.Duration
	MediaStorage    string
	MediaLocalPath  string
	MediaMaxBytes   int64
	AuthRateLimit   int
	AuthRateWindow  time.Duration
	TrackDailyLimit int
	TrustedProxies  []string
}

func Load() (Config, error) {
	port, err := envInt("API_PORT", 8080)
	if err != nil {
		return Config{}, err
	}
	accessTTL, err := envDuration("JWT_ACCESS_TTL", 15*time.Minute)
	if err != nil {
		return Config{}, err
	}
	maxBytes, err := envInt64("MEDIA_MAX_UPLOAD_BYTES", 50<<20)
	if err != nil {
		return Config{}, err
	}
	rateLimit, err := envInt("AUTH_RATE_LIMIT", 20)
	if err != nil {
		return Config{}, err
	}
	rateWindow, err := envDuration("AUTH_RATE_WINDOW", time.Minute)
	if err != nil {
		return Config{}, err
	}
	daily, err := envInt("TRACK_DAILY_UPLOAD_LIMIT", 20)
	if err != nil {
		return Config{}, err
	}

	cfg := Config{
		Host:            getEnv("API_HOST", "0.0.0.0"),
		Port:            port,
		Env:             getEnv("API_ENV", "development"),
		CORSOrigins:     splitCSV(getEnv("API_CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")),
		DatabaseURL:     os.Getenv("DATABASE_URL"),
		MigrationsPath:  getEnv("MIGRATIONS_PATH", "../../migrations"),
		JWTSecret:       getEnv("JWT_SECRET", "dev-only-change-me"),
		JWTAccessTTL:    accessTTL,
		MediaStorage:    getEnv("MEDIA_STORAGE", "local"),
		MediaLocalPath:  getEnv("MEDIA_LOCAL_PATH", "./data/media"),
		MediaMaxBytes:   maxBytes,
		AuthRateLimit:   rateLimit,
		AuthRateWindow:  rateWindow,
		TrackDailyLimit: daily,
		TrustedProxies:  splitCSV(getEnv("API_TRUSTED_PROXIES", "127.0.0.1,::1")),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.Port < 1 || cfg.Port > 65535 {
		return Config{}, fmt.Errorf("API_PORT out of range: %d", cfg.Port)
	}
	if cfg.JWTAccessTTL <= 0 {
		return Config{}, fmt.Errorf("JWT_ACCESS_TTL must be greater than 0")
	}
	if cfg.MediaMaxBytes < 1 {
		return Config{}, fmt.Errorf("MEDIA_MAX_UPLOAD_BYTES must be greater than 0")
	}
	if cfg.AuthRateLimit < 1 {
		return Config{}, fmt.Errorf("AUTH_RATE_LIMIT must be greater than 0")
	}
	if cfg.TrackDailyLimit < 1 {
		return Config{}, fmt.Errorf("TRACK_DAILY_UPLOAD_LIMIT must be greater than 0")
	}
	if cfg.MediaStorage != "local" {
		return Config{}, fmt.Errorf("MEDIA_STORAGE %q is not implemented (only local)", cfg.MediaStorage)
	}
	if err := cfg.validateSecret(); err != nil {
		return Config{}, err
	}
	return cfg, nil
}

func (c Config) validateSecret() error {
	if c.IsDev() {
		return nil
	}
	if len(c.JWTSecret) < 32 || weakSecret(c.JWTSecret) {
		return fmt.Errorf("JWT_SECRET must be a random string of at least 32 characters outside development")
	}
	return nil
}

func weakSecret(s string) bool {
	switch s {
	case "dev-only-change-me", "change-me-in-production-use-long-random-string":
		return true
	default:
		return false
	}
}

func (c Config) Addr() string {
	return fmt.Sprintf("%s:%d", c.Host, c.Port)
}

func (c Config) IsDev() bool {
	return c.Env == "development" || c.Env == "dev"
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func envInt(key string, fallback int) (int, error) {
	v := os.Getenv(key)
	if v == "" {
		return fallback, nil
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return n, nil
}

func envInt64(key string, fallback int64) (int64, error) {
	v := os.Getenv(key)
	if v == "" {
		return fallback, nil
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return n, nil
}

func envDuration(key string, fallback time.Duration) (time.Duration, error) {
	v := os.Getenv(key)
	if v == "" {
		return fallback, nil
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return 0, fmt.Errorf("%s: %w", key, err)
	}
	return d, nil
}

func splitCSV(s string) []string {
	parts := strings.Split(s, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			out = append(out, p)
		}
	}
	return out
}
