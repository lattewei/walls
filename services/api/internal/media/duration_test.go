package media

import (
	"bytes"
	"encoding/binary"
	"testing"
)

func TestWavDuration(t *testing.T) {
	var buf bytes.Buffer
	write := func(b []byte) { buf.Write(b) }
	write([]byte("RIFF"))
	var size [4]byte
	binary.LittleEndian.PutUint32(size[:], 36+88200)
	write(size[:])
	write([]byte("WAVE"))
	write([]byte("fmt "))
	binary.LittleEndian.PutUint32(size[:], 16)
	write(size[:])
	fmtChunk := make([]byte, 16)
	binary.LittleEndian.PutUint16(fmtChunk[0:2], 1)
	binary.LittleEndian.PutUint16(fmtChunk[2:4], 2)
	binary.LittleEndian.PutUint32(fmtChunk[4:8], 44100)
	binary.LittleEndian.PutUint32(fmtChunk[8:12], 176400)
	binary.LittleEndian.PutUint16(fmtChunk[12:14], 4)
	binary.LittleEndian.PutUint16(fmtChunk[14:16], 16)
	write(fmtChunk)
	write([]byte("data"))
	binary.LittleEndian.PutUint32(size[:], 176400)
	write(size[:])
	write(bytes.Repeat([]byte{0}, 176400))

	secs, err := wavDuration(bytes.NewReader(buf.Bytes()))
	if err != nil {
		t.Fatal(err)
	}
	if secs != 1 {
		t.Fatalf("duration = %d, want 1", secs)
	}
}
