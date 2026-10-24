package media

import (
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"

	"github.com/google/uuid"
)

var (
	ErrTooLarge    = errors.New("file too large")
	ErrUnsupported = errors.New("unsupported media")
	objectKeyRe    = regexp.MustCompile(`^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp3|wav|jpg|jpeg|png|webp|gif)$`)
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
	abs, err := filepath.Abs(root)
	if err != nil {
		return nil, fmt.Errorf("media root: %w", err)
	}
	return &LocalStorage{root: abs}, nil
}

func (s *LocalStorage) SaveCapped(r io.Reader, ext string, max int64) (string, error) {
	if max < 1 {
		return "", fmt.Errorf("invalid size cap")
	}
	ext = strings.TrimPrefix(strings.ToLower(ext), ".")
	if ext == "" || strings.ContainsAny(ext, `/\.`) {
		return "", fmt.Errorf("invalid extension")
	}
	key := uuid.NewString() + "." + ext
	full, err := s.path(key)
	if err != nil {
		return "", err
	}

	f, err := os.OpenFile(full, os.O_CREATE|os.O_WRONLY|os.O_EXCL, 0o644)
	if err != nil {
		return "", fmt.Errorf("create media file: %w", err)
	}
	defer f.Close()

	n, err := io.Copy(f, io.LimitReader(r, max+1))
	if err != nil {
		_ = os.Remove(full)
		return "", fmt.Errorf("write media file: %w", err)
	}
	if n > max {
		_ = os.Remove(full)
		return "", ErrTooLarge
	}
	return key, nil
}

func (s *LocalStorage) Open(objectKey string) (*os.File, error) {
	full, err := s.path(objectKey)
	if err != nil {
		return nil, err
	}
	f, err := os.Open(full)
	if err != nil {
		return nil, fmt.Errorf("open media: %w", err)
	}
	return f, nil
}

func (s *LocalStorage) Delete(objectKey string) error {
	full, err := s.path(objectKey)
	if err != nil {
		return err
	}
	if err := os.Remove(full); err != nil && !os.IsNotExist(err) {
		return fmt.Errorf("delete media: %w", err)
	}
	return nil
}

func (s *LocalStorage) Path(objectKey string) (string, error) {
	return s.path(objectKey)
}

func (s *LocalStorage) path(key string) (string, error) {
	if err := validateKey(key); err != nil {
		return "", err
	}
	full := filepath.Join(s.root, key)
	rel, err := filepath.Rel(s.root, full)
	if err != nil || rel == ".." || strings.HasPrefix(rel, ".."+string(filepath.Separator)) {
		return "", fmt.Errorf("invalid object key")
	}
	return full, nil
}

func validateKey(key string) error {
	if !objectKeyRe.MatchString(key) {
		return fmt.Errorf("invalid object key")
	}
	return nil
}

func IsAudioKey(key string) bool {
	ext := strings.ToLower(filepath.Ext(key))
	return ext == ".mp3" || ext == ".wav"
}
