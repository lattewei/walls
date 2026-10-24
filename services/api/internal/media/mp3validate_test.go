package media

import (
	"bytes"
	"testing"
)

func TestConfirmMP3RejectsID3Costume(t *testing.T) {
	raw := append([]byte("ID3"), bytes.Repeat([]byte{0, 0, 0, 0, 0, 0, 0}, 8)...)
	raw = append(raw, bytes.Repeat([]byte("not-audio"), 40)...)
	if _, err := ConfirmMP3(bytes.NewReader(raw)); err == nil {
		t.Fatal("expected ID3 costume to be rejected")
	}
}

func TestConfirmMP3RejectsSyncCostume(t *testing.T) {
	raw := []byte{0xFF, 0xFB, 0x90, 0x00}
	raw = append(raw, bytes.Repeat([]byte{0x11, 0x22, 0x33, 0x44}, 200)...)
	if _, err := ConfirmMP3(bytes.NewReader(raw)); err == nil {
		t.Fatal("expected sync costume to be rejected")
	}
}

func TestConfirmMP3RejectsFrameThenJunk(t *testing.T) {
	header := []byte{0xFF, 0xFB, 0x90, 0x64}
	frame, ok := parseMP3Frame(header)
	if !ok {
		t.Fatal("fixture header should parse")
	}
	raw := append([]byte{}, header...)
	raw = append(raw, bytes.Repeat([]byte{0}, frame.Length-4)...)
	raw = append(raw, []byte("this is not another frame")...)
	if _, err := ConfirmMP3(bytes.NewReader(raw)); err == nil {
		t.Fatal("expected trailing junk after a frame to be rejected")
	}
}

func TestConfirmMP3AcceptsFrameChain(t *testing.T) {
	header := []byte{0xFF, 0xFB, 0x90, 0x64}
	frame, ok := parseMP3Frame(header)
	if !ok {
		t.Fatal("fixture header should parse")
	}
	body := append([]byte{}, header...)
	body = append(body, bytes.Repeat([]byte{0}, frame.Length-4)...)
	raw := bytes.Repeat(body, 8)
	secs, err := ConfirmMP3(bytes.NewReader(raw))
	if err != nil {
		t.Fatal(err)
	}
	if secs < 1 {
		t.Fatalf("duration = %d", secs)
	}
}
