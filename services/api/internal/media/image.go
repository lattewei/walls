package media

import (
	"bytes"
	"fmt"
	"io"
	"path/filepath"
	"strings"
)

type ImageInfo struct {
	Format string
	Ext    string
	MIME   string
}

func DetectImage(r io.Reader) (ImageInfo, io.Reader, error) {
	buf := make([]byte, 16)
	n, err := io.ReadFull(r, buf)
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return ImageInfo{}, nil, fmt.Errorf("read header: %w", err)
	}
	header := buf[:n]
	rest := io.MultiReader(bytes.NewReader(header), r)

	if n >= 3 && header[0] == 0xFF && header[1] == 0xD8 && header[2] == 0xFF {
		return ImageInfo{Format: "jpeg", Ext: "jpg", MIME: "image/jpeg"}, rest, nil
	}
	if n >= 8 && header[0] == 0x89 && string(header[1:4]) == "PNG" {
		return ImageInfo{Format: "png", Ext: "png", MIME: "image/png"}, rest, nil
	}
	if n >= 12 && string(header[0:4]) == "RIFF" && string(header[8:12]) == "WEBP" {
		return ImageInfo{Format: "webp", Ext: "webp", MIME: "image/webp"}, rest, nil
	}
	if n >= 6 && (string(header[0:6]) == "GIF87a" || string(header[0:6]) == "GIF89a") {
		return ImageInfo{Format: "gif", Ext: "gif", MIME: "image/gif"}, rest, nil
	}
	return ImageInfo{}, nil, fmt.Errorf("%w: allowed image types are jpeg, png, webp, gif", ErrUnsupported)
}

func MIMEFromKey(key string) string {
	ext := strings.ToLower(strings.TrimPrefix(filepath.Ext(key), "."))
	switch ext {
	case "jpg", "jpeg":
		return "image/jpeg"
	case "png":
		return "image/png"
	case "webp":
		return "image/webp"
	case "gif":
		return "image/gif"
	case "mp3":
		return "audio/mpeg"
	case "wav":
		return "audio/wav"
	default:
		return "application/octet-stream"
	}
}
