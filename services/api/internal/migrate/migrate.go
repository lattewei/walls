package migrate

import (
	"errors"
	"fmt"
	"net/url"
	"path/filepath"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

// Runner applies SQL migrations from a filesystem path.
type Runner struct {
	DatabaseURL string
	Path        string // directory containing NNN_name.up.sql files
}

func (r Runner) open() (*migrate.Migrate, error) {
	sourceURL, err := fileSourceURL(r.Path)
	if err != nil {
		return nil, err
	}
	m, err := migrate.New(sourceURL, r.DatabaseURL)
	if err != nil {
		return nil, fmt.Errorf("open migrator: %w", err)
	}
	return m, nil
}

// Up applies all pending migrations.
func (r Runner) Up() error {
	m, err := r.open()
	if err != nil {
		return err
	}
	defer m.Close()

	err = m.Up()
	if err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("migrate up: %w", err)
	}
	return nil
}

// Down rolls back one migration.
func (r Runner) Down() error {
	m, err := r.open()
	if err != nil {
		return err
	}
	defer m.Close()

	err = m.Steps(-1)
	if err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("migrate down: %w", err)
	}
	return nil
}

// Version returns the current migration version and dirty flag.
func (r Runner) Version() (uint, bool, error) {
	m, err := r.open()
	if err != nil {
		return 0, false, err
	}
	defer m.Close()

	v, dirty, err := m.Version()
	if errors.Is(err, migrate.ErrNilVersion) {
		return 0, false, nil
	}
	if err != nil {
		return 0, false, err
	}
	return v, dirty, nil
}

// fileSourceURL builds a file:// URL compatible with golang-migrate on Windows and Unix.
func fileSourceURL(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("resolve migrations path: %w", err)
	}
	// Convert to slash path then URL-encode for drive letters / spaces.
	slash := filepath.ToSlash(abs)
	if !strings.HasPrefix(slash, "/") {
		// Windows absolute path e.g. C:/foo → /C:/foo
		slash = "/" + slash
	}
	u := url.URL{Scheme: "file", Path: slash}
	return u.String(), nil
}
