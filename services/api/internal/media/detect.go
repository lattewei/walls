package media

import (
	"bytes"
	"fmt"
	"io"
)

type AudioInfo struct {
	Format string
	Ext    string
}

func DetectAudio(r io.Reader) (AudioInfo, io.Reader, error) {
	buf := make([]byte, 12)
	n, err := io.ReadFull(r, buf)
	if err != nil && err != io.ErrUnexpectedEOF && err != io.EOF {
		return AudioInfo{}, nil, fmt.Errorf("read header: %w", err)
	}
	header := buf[:n]
	rest := io.MultiReader(bytes.NewReader(header), r)

	if n >= 12 && string(header[0:4]) == "RIFF" && string(header[8:12]) == "WAVE" {
		return AudioInfo{Format: "wav", Ext: "wav"}, rest, nil
	}
	// Header only. ConfirmMP3 rejects a file that is not a real Layer III stream.
	if n >= 3 && header[0] == 0xFF && (header[1]&0xE0) == 0xE0 {
		return AudioInfo{Format: "mp3", Ext: "mp3"}, rest, nil
	}
	if n >= 3 && string(header[0:3]) == "ID3" {
		return AudioInfo{Format: "mp3", Ext: "mp3"}, rest, nil
	}
	return AudioInfo{}, nil, fmt.Errorf("%w: allowed audio types are mp3 and wav", ErrUnsupported)
}
