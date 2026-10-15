package media

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"

	"github.com/google/uuid"
)

type LocalStorage struct {
	root string
}

func NewLocalStorage(root string) (*LocalStorage, error) {
	if root == "" {
		return nil, fmt.Errorf("media root path is required")
	}
	if err := os.MkdirAll(root, 0o755); err != nil {
		return nil, fmt.Errorf("create media root: %w", err)
	}
	return &LocalStorage{root: root}, nil
}

func (s *LocalStorage) Save(r io.Reader, ext string) (objectKey string, err error) {
	ext = strings.TrimPrefix(strings.ToLower(ext), ".")
	if ext == "" {
		ext = "bin"
	}
	key := uuid.NewString() + "." + ext
	full := filepath.Join(s.root, key)

	f, err := os.OpenFile(full, os.O_CREATE|os.O_WRONLY|os.O_EXCL, 0o644)
	if err != nil {
		return "", fmt.Errorf("create media file: %w", err)
	}
	defer f.Close()

	if _, err := io.Copy(f, r); err != nil {
		_ = os.Remove(full)
		return "", fmt.Errorf("write media file: %w", err)
	}
	return key, nil
}

func (s *LocalStorage) Open(objectKey string) (*os.File, error) {
	if err := validateKey(objectKey); err != nil {
		return nil, err
	}
	full := filepath.Join(s.root, objectKey)
	f, err := os.Open(full)
	if err != nil {
		return nil, fmt.Errorf("open media: %w", err)
	}
	return f, nil
}

func (s *LocalStorage) Delete(objectKey string) error {
	if err := validateKey(objectKey); err != nil {
		return err
	}
	full := filepath.Join(s.root, objectKey)
	if err := os.Remove(full); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("delete media: %w", err)
	}
	return nil
}

func (s *LocalStorage) Path(objectKey string) (string, error) {
	if err := validateKey(objectKey); err != nil {
		return "", err
	}
	return filepath.Join(s.root, objectKey), nil
}

func validateKey(key string) error {
	if key == "" || strings.Contains(key, "..") || strings.ContainsAny(key, `/\`) {
		return fmt.Errorf("invalid object key")
	}
	return nil
}
