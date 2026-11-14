package main

import (
	"bytes"
	"encoding/binary"
	"hash/fnv"
	"image"
	"image/color"
	"image/jpeg"
	"math"
)

var palettes = [][2]color.RGBA{
	{{15, 20, 24, 255}, {58, 86, 99, 255}},
	{{28, 18, 16, 255}, {122, 47, 42, 255}},
	{{14, 22, 18, 255}, {47, 93, 70, 255}},
	{{26, 22, 14, 255}, {150, 112, 43, 255}},
	{{18, 18, 22, 255}, {84, 88, 102, 255}},
	{{30, 14, 18, 255}, {110, 32, 52, 255}},
	{{20, 20, 16, 255}, {116, 106, 72, 255}},
	{{10, 20, 24, 255}, {38, 94, 110, 255}},
}

func hashString(s string) uint64 {
	h := fnv.New64a()
	_, _ = h.Write([]byte(s))
	return h.Sum64()
}

func renderCover(key string, size int) ([]byte, error) {
	seed := hashString(key)
	pal := palettes[seed%uint64(len(palettes))]
	img := image.NewRGBA(image.Rect(0, 0, size, size))

	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			t := (float64(x)/float64(size) + float64(y)/float64(size)) / 2
			img.SetRGBA(x, y, mix(pal[0], pal[1], t))
		}
	}

	accent := lighten(pal[1], 0.35)
	for i := 0; i < 3; i++ {
		cx := int(seed>>(i*7)) % size
		cy := int(seed>>(i*11+5)) % size
		r := size/6 + int(seed>>(i*3+9))%size/4
		disc(img, cx, cy, r, accent, 0.10+0.03*float64(i))
		ring(img, cx, cy, r, accent, 0.35, 2)
	}

	bandY := int(seed>>13) % size
	bandH := size/28 + 2
	for y := bandY; y < bandY+bandH && y < size; y++ {
		for x := 0; x < size; x++ {
			blend(img, x, y, accent, 0.18)
		}
	}

	state := seed | 1
	for y := 0; y < size; y++ {
		for x := 0; x < size; x++ {
			state ^= state << 13
			state ^= state >> 7
			state ^= state << 17
			n := int(state%15) - 7
			i := img.PixOffset(x, y)
			for c := 0; c < 3; c++ {
				v := int(img.Pix[i+c]) + n
				if v < 0 {
					v = 0
				}
				if v > 255 {
					v = 255
				}
				img.Pix[i+c] = uint8(v)
			}
		}
	}

	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 86}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func mix(a, b color.RGBA, t float64) color.RGBA {
	if t < 0 {
		t = 0
	}
	if t > 1 {
		t = 1
	}
	return color.RGBA{
		R: uint8(float64(a.R)*(1-t) + float64(b.R)*t),
		G: uint8(float64(a.G)*(1-t) + float64(b.G)*t),
		B: uint8(float64(a.B)*(1-t) + float64(b.B)*t),
		A: 255,
	}
}

func lighten(c color.RGBA, amount float64) color.RGBA {
	return color.RGBA{
		R: uint8(math.Min(255, float64(c.R)+255*amount)),
		G: uint8(math.Min(255, float64(c.G)+255*amount)),
		B: uint8(math.Min(255, float64(c.B)+255*amount)),
		A: 255,
	}
}

func blend(img *image.RGBA, x, y int, c color.RGBA, alpha float64) {
	if x < 0 || y < 0 || x >= img.Rect.Dx() || y >= img.Rect.Dy() {
		return
	}
	i := img.PixOffset(x, y)
	for k := 0; k < 3; k++ {
		src := float64([3]uint8{c.R, c.G, c.B}[k])
		img.Pix[i+k] = uint8(float64(img.Pix[i+k])*(1-alpha) + src*alpha)
	}
}

func disc(img *image.RGBA, cx, cy, r int, c color.RGBA, alpha float64) {
	for y := cy - r; y <= cy+r; y++ {
		for x := cx - r; x <= cx+r; x++ {
			dx := x - cx
			dy := y - cy
			if dx*dx+dy*dy <= r*r {
				blend(img, x, y, c, alpha)
			}
		}
	}
}

func ring(img *image.RGBA, cx, cy, r int, c color.RGBA, alpha float64, width int) {
	inner := (r - width) * (r - width)
	outer := r * r
	for y := cy - r; y <= cy+r; y++ {
		for x := cx - r; x <= cx+r; x++ {
			dx := x - cx
			dy := y - cy
			d := dx*dx + dy*dy
			if d <= outer && d >= inner {
				blend(img, x, y, c, alpha)
			}
		}
	}
}

const wavRate = 8000

func renderLoop(seed uint64, seconds int) []byte {
	n := wavRate * seconds
	samples := make([]int16, n)
	scale := []float64{0, 2, 4, 7, 9, 12}
	base := 92.5 * math.Pow(2, float64(seed%7)/12)
	step := 0.34
	bassStep := 1.36
	note := 0

	for i := 0; i < n; i++ {
		t := float64(i) / wavRate
		if int(t/step) != note {
			note = int(t / step)
		}
		frac := math.Mod(t, step) / step
		env := math.Exp(-3.2 * frac)
		idx := (note + int(seed%5)) % len(scale)
		freq := base * 2 * math.Pow(2, scale[idx]/12)

		bassFrac := math.Mod(t, bassStep) / bassStep
		bassEnv := math.Exp(-2.0 * bassFrac)
		bassFreq := base / 2 * math.Pow(2, scale[(note/4+int(seed%3))%len(scale)]/12)

		v := 0.26*math.Sin(2*math.Pi*freq*t)*env +
			0.18*math.Sin(2*math.Pi*bassFreq*t)*bassEnv +
			0.05*math.Sin(2*math.Pi*(freq*2.01)*t)*env*env

		fade := 1.0
		if t < 0.08 {
			fade = t / 0.08
		}
		if remain := float64(seconds) - t; remain < 0.25 {
			fade = remain / 0.25
		}
		v *= fade

		samples[i] = int16(math.Max(-1, math.Min(1, v)) * 32000)
	}

	var buf bytes.Buffer
	dataSize := uint32(len(samples) * 2)
	buf.WriteString("RIFF")
	_ = binary.Write(&buf, binary.LittleEndian, 36+dataSize)
	buf.WriteString("WAVE")
	buf.WriteString("fmt ")
	_ = binary.Write(&buf, binary.LittleEndian, uint32(16))
	_ = binary.Write(&buf, binary.LittleEndian, uint16(1))
	_ = binary.Write(&buf, binary.LittleEndian, uint16(1))
	_ = binary.Write(&buf, binary.LittleEndian, uint32(wavRate))
	_ = binary.Write(&buf, binary.LittleEndian, uint32(wavRate*2))
	_ = binary.Write(&buf, binary.LittleEndian, uint16(2))
	_ = binary.Write(&buf, binary.LittleEndian, uint16(16))
	buf.WriteString("data")
	_ = binary.Write(&buf, binary.LittleEndian, dataSize)
	for _, s := range samples {
		_ = binary.Write(&buf, binary.LittleEndian, s)
	}
	return buf.Bytes()
}
