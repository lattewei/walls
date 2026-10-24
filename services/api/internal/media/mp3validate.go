package media

import (
	"bytes"
	"fmt"
	"io"

	"github.com/hajimehoshi/go-mp3"
)

const (
	mp3MaxLeadingZeros = 32
	mp3MaxTrailingZero = 8
)

// ConfirmMP3 rejects a file that only wears an MP3 header.
// The bytes after an optional ID3v2 tag must be a contiguous Layer III
// stream, and the decoder must be able to read PCM from it.
func ConfirmMP3(r io.Reader) (int, error) {
	data, err := io.ReadAll(r)
	if err != nil {
		return 0, fmt.Errorf("read audio: %w", err)
	}
	secs, err := walkMP3(data)
	if err != nil {
		return 0, fmt.Errorf("%w: %s", ErrUnsupported, err.Error())
	}
	dec, err := mp3.NewDecoder(bytes.NewReader(data))
	if err != nil {
		return 0, fmt.Errorf("%w: mp3 decode failed", ErrUnsupported)
	}
	buf := make([]byte, 4096)
	got := 0
	for {
		n, err := dec.Read(buf)
		got += n
		if err == io.EOF {
			break
		}
		if err != nil {
			return 0, fmt.Errorf("%w: mp3 decode failed", ErrUnsupported)
		}
	}
	if got < 4 {
		return 0, fmt.Errorf("%w: mp3 decode produced no audio", ErrUnsupported)
	}
	return secs, nil
}

func walkMP3(data []byte) (int, error) {
	offset, err := skipID3v2(data)
	if err != nil {
		return 0, err
	}
	zeros := 0
	for offset < len(data) && data[offset] == 0 && zeros < mp3MaxLeadingZeros {
		offset++
		zeros++
	}
	if offset+4 > len(data) || !mp3Sync(data[offset:]) {
		return 0, fmt.Errorf("mp3 frame not found")
	}

	var (
		frames  int
		samples int
		rate    int
		version int
		layer   int
	)
	for offset+4 <= len(data) {
		if rest := data[offset:]; isID3v1(rest) || isAPETag(rest) {
			break
		}
		parsed, ok := parseMP3Frame(data[offset:])
		if !ok || offset+parsed.Length > len(data) {
			return 0, fmt.Errorf("mp3 frame chain broken")
		}
		if frames == 0 {
			version = parsed.Version
			layer = parsed.Layer
			rate = parsed.Rate
		} else if parsed.Version != version || parsed.Layer != layer || parsed.Rate != rate {
			return 0, fmt.Errorf("mp3 frame chain broken")
		}
		offset += parsed.Length
		samples += parsed.Samples
		frames++
	}
	if frames < 1 || rate == 0 {
		return 0, fmt.Errorf("mp3 frame not found")
	}
	if err := trailingOK(data[offset:]); err != nil {
		return 0, err
	}
	secs := samples / rate
	if samples%rate != 0 {
		secs++
	}
	if secs < 1 {
		secs = 1
	}
	return secs, nil
}

type mp3Parsed struct {
	Version int
	Layer   int
	Rate    int
	Samples int
	Length  int
}

func parseMP3Frame(b []byte) (mp3Parsed, bool) {
	if len(b) < 4 || !mp3Sync(b) {
		return mp3Parsed{}, false
	}
	version := int((b[1] >> 3) & 0x03)
	layer := int((b[1] >> 1) & 0x03)
	bitrateIdx := int((b[2] >> 4) & 0x0F)
	rateIdx := int((b[2] >> 2) & 0x03)
	padding := int((b[2] >> 1) & 0x01)
	// Layer bits 01 are Layer III. 00 is reserved. Version bits 01 are reserved.
	if version == 1 || layer != 1 || bitrateIdx == 0 || bitrateIdx == 15 || rateIdx == 3 {
		return mp3Parsed{}, false
	}
	rates := [3][3]int{
		{44100, 48000, 32000},
		{22050, 24000, 16000},
		{11025, 12000, 8000},
	}
	rateRow := 2
	switch version {
	case 3:
		rateRow = 0
	case 2:
		rateRow = 1
	}
	rate := rates[rateRow][rateIdx]
	br := mp3Bitrate(byte(version), byte(layer), bitrateIdx)
	if br == 0 || rate == 0 {
		return mp3Parsed{}, false
	}
	samples := 1152
	coef := 144
	if version != 3 {
		samples = 576
		coef = 72
	}
	length := coef*br*1000/rate + padding
	side := 17
	if version == 3 {
		side = 32
	}
	if channelMode(b) == 3 {
		if version == 3 {
			side = 17
		} else {
			side = 9
		}
	}
	crc := 0
	if b[1]&0x01 == 0 {
		crc = 2
	}
	if length < 4+crc+side {
		return mp3Parsed{}, false
	}
	return mp3Parsed{Version: version, Layer: layer, Rate: rate, Samples: samples, Length: length}, true
}

func channelMode(b []byte) int {
	return int((b[3] >> 6) & 0x03)
}

func mp3Sync(b []byte) bool {
	return len(b) >= 2 && b[0] == 0xFF && b[1]&0xE0 == 0xE0
}

func skipID3v2(data []byte) (int, error) {
	if len(data) < 3 || string(data[0:3]) != "ID3" {
		return 0, nil
	}
	if len(data) < 10 {
		return 0, fmt.Errorf("truncated id3 tag")
	}
	for _, b := range data[6:10] {
		if b&0x80 != 0 {
			return 0, fmt.Errorf("invalid id3 size")
		}
	}
	size := int(data[6])<<21 | int(data[7])<<14 | int(data[8])<<7 | int(data[9])
	offset := 10 + size
	if data[5]&0x10 != 0 {
		offset += 10
	}
	if offset > len(data) || offset < 10 {
		return 0, fmt.Errorf("id3 tag exceeds file")
	}
	return offset, nil
}

func isID3v1(b []byte) bool {
	return len(b) >= 128 && string(b[0:3]) == "TAG"
}

func isAPETag(b []byte) bool {
	return len(b) >= 32 && string(b[0:8]) == "APETAGEX"
}

func trailingOK(b []byte) error {
	if len(b) == 0 || isID3v1(b) || isAPETag(b) {
		return nil
	}
	if len(b) <= mp3MaxTrailingZero {
		for _, c := range b {
			if c != 0 {
				return fmt.Errorf("mp3 frame chain broken")
			}
		}
		return nil
	}
	return fmt.Errorf("mp3 frame chain broken")
}
