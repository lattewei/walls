package main

import (
	"fmt"
	"os"
	"path/filepath"

	"github.com/lattewei/walls/services/api/internal/config"
	"github.com/lattewei/walls/services/api/internal/envfile"
	"github.com/lattewei/walls/services/api/internal/migrate"
)

func main() {
	envfile.Load()

	if len(os.Args) < 2 {
		usage()
		os.Exit(2)
	}

	cfg, err := config.Load()
	if err != nil {
		fail(err)
	}

	path, err := resolveMigrationsPath(cfg.MigrationsPath)
	if err != nil {
		fail(err)
	}

	runner := migrate.Runner{
		DatabaseURL: cfg.DatabaseURL,
		Path:        path,
	}

	switch os.Args[1] {
	case "up":
		if err := runner.Up(); err != nil {
			fail(err)
		}
		fmt.Println("migrate: up ok")
	case "down":
		if err := runner.Down(); err != nil {
			fail(err)
		}
		fmt.Println("migrate: down ok")
	case "version":
		v, dirty, err := runner.Version()
		if err != nil {
			fail(err)
		}
		fmt.Printf("version=%d dirty=%v\n", v, dirty)
	default:
		usage()
		os.Exit(2)
	}
}

func resolveMigrationsPath(configured string) (string, error) {
	candidates := []string{configured}
	if abs, err := filepath.Abs(configured); err == nil {
		candidates = append(candidates, abs)
	}
	// Common layouts when running from services/api or repo root.
	candidates = append(candidates,
		filepath.Join("..", "..", "migrations"),
		filepath.Join("migrations"),
	)

	for _, c := range candidates {
		st, err := os.Stat(c)
		if err == nil && st.IsDir() {
			abs, err := filepath.Abs(c)
			if err != nil {
				return c, nil
			}
			return abs, nil
		}
	}
	return "", fmt.Errorf("migrations directory not found (tried %v)", candidates)
}

func usage() {
	fmt.Fprintf(os.Stderr, "usage: migrate <up|down|version>\n")
}

func fail(err error) {
	fmt.Fprintf(os.Stderr, "migrate error: %v\n", err)
	os.Exit(1)
}
