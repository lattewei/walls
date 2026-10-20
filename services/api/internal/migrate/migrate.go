package migrate

import (
	"errors"
	"fmt"
	"path/filepath"
	"strings"

	"github.com/golang-migrate/migrate/v4"
	_ "github.com/golang-migrate/migrate/v4/database/postgres"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

type Runner struct {
	DatabaseURL string
	Path        string
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

func fileSourceURL(path string) (string, error) {
	abs, err := filepath.Abs(path)
	if err != nil {
		return "", fmt.Errorf("resolve migrations path: %w", err)
	}
	slash := filepath.ToSlash(abs)

	// Windows drive path: C:/foo -> file://C:/foo (two slashes after file:).
	// file:///C:/foo breaks the file source driver on Windows.
	if len(slash) >= 2 && slash[1] == ':' {
		return "file://" + slash, nil
	}

	if !strings.HasPrefix(slash, "/") {
		slash = "/" + slash
	}
	return "file://" + slash, nil
}
