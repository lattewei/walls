package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Host           string
	Port           int
	Env            string
	CORSOrigins    []string
	DatabaseURL    string
	MigrationsPath string
	JWTSecret      string
	JWTAccessTTL   time.Duration
	JWTRefreshTTL  time.Duration
	MediaStorage   string
	MediaLocalPath string
	MediaMaxBytes  int64
	AuthRateLimit   int
	AuthRateWindow  time.Duration
	TrackDailyLimit int
}

func Load() (Config, error) {
	cfg := Config{
		Host:           getEnv("API_HOST", "0.0.0.0"),
		Port:           getEnvInt("API_PORT", 8080),
		Env:            getEnv("API_ENV", "development"),
		CORSOrigins:    splitCSV(getEnv("API_CORS_ORIGINS", "http://localhost:3000")),
		DatabaseURL:    os.Getenv("DATABASE_URL"),
		MigrationsPath: getEnv("MIGRATIONS_PATH", "../../migrations"),
		JWTSecret:      getEnv("JWT_SECRET", "dev-only-change-me"),
		JWTAccessTTL:   getEnvDuration("JWT_ACCESS_TTL", 15*time.Minute),
		JWTRefreshTTL:  getEnvDuration("JWT_REFRESH_TTL", 168*time.Hour),
		MediaStorage:   getEnv("MEDIA_STORAGE", "local"),
		MediaLocalPath: getEnv("MEDIA_LOCAL_PATH", "./data/media"),
		MediaMaxBytes:  getEnvInt64("MEDIA_MAX_UPLOAD_BYTES", 50<<20),
		AuthRateLimit:   getEnvInt("AUTH_RATE_LIMIT", 20),
		AuthRateWindow:  getEnvDuration("AUTH_RATE_WINDOW", time.Minute),
		TrackDailyLimit: getEnvInt("TRACK_DAILY_UPLOAD_LIMIT", 20),
	}

	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.Port < 1 || cfg.Port > 65535 {
		return Config{}, fmt.Errorf("API_PORT out of range: %d", cfg.Port)
	}

	return cfg, nil
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

func getEnvInt(key string, fallback int) int {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.Atoi(v)
	if err != nil {
		return fallback
	}
	return n
}

func getEnvInt64(key string, fallback int64) int64 {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	n, err := strconv.ParseInt(v, 10, 64)
	if err != nil {
		return fallback
	}
	return n
}

func getEnvDuration(key string, fallback time.Duration) time.Duration {
	v := os.Getenv(key)
	if v == "" {
		return fallback
	}
	d, err := time.ParseDuration(v)
	if err != nil {
		return fallback
	}
	return d
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
