package media

import (
	"encoding/binary"
	"fmt"
	"io"
	"os"
)

func ProbeFile(path, format string) (int, error) {
	f, err := os.Open(path)
	if err != nil {
		return 0, err
	}
	defer f.Close()
	switch format {
	case "wav":
		return wavDuration(f)
	case "mp3":
		return mp3Duration(f)
	default:
		return 0, fmt.Errorf("no duration parser for %s", format)
	}
}

func wavDuration(r io.ReadSeeker) (int, error) {
	var hdr [12]byte
	if _, err := io.ReadFull(r, hdr[:]); err != nil {
		return 0, err
	}
	if string(hdr[0:4]) != "RIFF" || string(hdr[8:12]) != "WAVE" {
		return 0, fmt.Errorf("not a wav")
	}
	var byteRate uint32
	var dataSize uint32
	for {
		var chunk [8]byte
		if _, err := io.ReadFull(r, chunk[:]); err != nil {
			if err == io.EOF || err == io.ErrUnexpectedEOF {
				break
			}
			return 0, err
		}
		id := string(chunk[0:4])
		size := binary.LittleEndian.Uint32(chunk[4:8])
		if id == "fmt " && size >= 16 {
			buf := make([]byte, size)
			if _, err := io.ReadFull(r, buf); err != nil {
				return 0, err
			}
			byteRate = binary.LittleEndian.Uint32(buf[8:12])
		} else if id == "data" {
			dataSize = size
			break
		} else {
			skip := int64(size)
			if size%2 == 1 {
				skip++
			}
			if _, err := r.Seek(skip, io.SeekCurrent); err != nil {
				return 0, err
			}
		}
	}
	if byteRate == 0 || dataSize == 0 {
		return 0, fmt.Errorf("wav duration unavailable")
	}
	secs := int(dataSize / byteRate)
	if dataSize%byteRate != 0 {
		secs++
	}
	if secs < 1 {
		secs = 1
	}
	return secs, nil
}

func mp3Duration(r io.Reader) (int, error) {
	buf := make([]byte, 10)
	if _, err := io.ReadFull(r, buf); err != nil {
		return 0, err
	}
	rest := io.MultiReader(bytesReader(buf), r)
	if string(buf[0:3]) == "ID3" && len(buf) >= 10 {
		size := int(buf[6])<<21 | int(buf[7])<<14 | int(buf[8])<<7 | int(buf[9])
		if _, err := io.CopyN(io.Discard, rest, int64(size)); err != nil {
			return 0, err
		}
	}
	var samples int
	var rate int
	header := make([]byte, 4)
	scratch := make([]byte, 4096)
	pending := buf[:0]
	src := rest
	for samples < 16000*60*60 {
		need := 4
		for len(pending) < need {
			n, err := src.Read(scratch)
			if n > 0 {
				pending = append(pending, scratch[:n]...)
			}
			if err != nil {
				if samples == 0 {
					return 0, err
				}
				break
			}
		}
		if len(pending) < 4 {
			break
		}
		copy(header, pending[:4])
		if header[0] != 0xFF || header[1]&0xE0 != 0xE0 {
			pending = pending[1:]
			continue
		}
		frameSamples, sampleRate, frameLen, ok := mp3Frame(header)
		if !ok || frameLen < 4 {
			pending = pending[1:]
			continue
		}
		if rate == 0 {
			rate = sampleRate
		}
		samples += frameSamples
		if len(pending) >= frameLen {
			pending = pending[frameLen:]
			continue
		}
		skip := frameLen - len(pending)
		pending = pending[:0]
		if _, err := io.CopyN(io.Discard, src, int64(skip)); err != nil {
			break
		}
	}
	if rate == 0 || samples == 0 {
		return 0, fmt.Errorf("mp3 duration unavailable")
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

func mp3Frame(h []byte) (samples, rate, length int, ok bool) {
	version := (h[1] >> 3) & 0x03
	layer := (h[1] >> 1) & 0x03
	bitrateIdx := (h[2] >> 4) & 0x0F
	rateIdx := (h[2] >> 2) & 0x03
	padding := int((h[2] >> 1) & 0x01)
	if version == 1 || layer == 0 || bitrateIdx == 0 || bitrateIdx == 15 || rateIdx == 3 {
		return 0, 0, 0, false
	}
	rates := [3][3]int{
		{44100, 48000, 32000},
		{22050, 24000, 16000},
		{11025, 12000, 8000},
	}
	var rateRow int
	switch version {
	case 3:
		rateRow = 0
	case 2:
		rateRow = 1
	default:
		rateRow = 2
	}
	rate = rates[rateRow][rateIdx]
	br := mp3Bitrate(version, layer, int(bitrateIdx))
	if br == 0 {
		return 0, 0, 0, false
	}
	if layer == 3 {
		if version == 3 {
			samples = 1152
		} else {
			samples = 576
		}
		length = (samples/8)*br*1000/rate + padding
		return samples, rate, length, length >= 4
	}
	if version == 3 {
		samples = 1152
	} else {
		samples = 576
	}
	length = 144*br*1000/rate + padding
	if version != 3 && layer == 3 {
		length = 72*br*1000/rate + padding
	}
	return samples, rate, length, length >= 4
}

func mp3Bitrate(version, layer byte, idx int) int {
	v1l1 := []int{0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448}
	v1l2 := []int{0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384}
	v1l3 := []int{0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320}
	v2l1 := []int{0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256}
	v2l3 := []int{0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160}
	if idx < 1 || idx > 14 {
		return 0
	}
	switch {
	case version == 3 && layer == 3:
		return v1l1[idx]
	case version == 3 && layer == 2:
		return v1l2[idx]
	case version == 3 && layer == 1:
		return v1l3[idx]
	case layer == 3:
		return v2l1[idx]
	default:
		return v2l3[idx]
	}
}

type sliceReader struct {
	b []byte
}

func bytesReader(b []byte) io.Reader {
	return &sliceReader{b: append([]byte(nil), b...)}
}

func (s *sliceReader) Read(p []byte) (int, error) {
	if len(s.b) == 0 {
		return 0, io.EOF
	}
	n := copy(p, s.b)
	s.b = s.b[n:]
	return n, nil
}
