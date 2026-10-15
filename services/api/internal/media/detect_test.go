package media

import (
	"bytes"
	"io"
	"testing"
)

func TestDetectWAV(t *testing.T) {
	raw := make([]byte, 16)
	copy(raw[0:4], "RIFF")
	copy(raw[8:12], "WAVE")
	info, r, err := DetectAudio(bytes.NewReader(raw))
	if err != nil {
		t.Fatal(err)
	}
	if info.Format != "wav" {
		t.Fatalf("format = %s", info.Format)
	}
	out, _ := io.ReadAll(r)
	if !bytes.Equal(out, raw) {
		t.Fatal("reader lost bytes")
	}
}

func TestDetectMP3ID3(t *testing.T) {
	raw := []byte("ID3............")
	info, _, err := DetectAudio(bytes.NewReader(raw))
	if err != nil {
		t.Fatal(err)
	}
	if info.Format != "mp3" {
		t.Fatalf("format = %s", info.Format)
	}
}

func TestDetectRejectsGarbage(t *testing.T) {
	_, _, err := DetectAudio(bytes.NewReader([]byte("not-audio")))
	if err == nil {
		t.Fatal("expected error")
	}
}
