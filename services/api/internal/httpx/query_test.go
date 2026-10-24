package httpx

import "testing"

func TestSplitCSV(t *testing.T) {
	got := SplitCSV(" rap, drill , ,dark")
	if len(got) != 3 || got[0] != "rap" || got[1] != "drill" || got[2] != "dark" {
		t.Fatalf("got %#v", got)
	}
	if SplitCSV("") != nil {
		t.Fatal("empty should be nil")
	}
}

func TestParseNonNegInt(t *testing.T) {
	n, err := ParseNonNegInt("", 20)
	if err != nil || n != 20 {
		t.Fatalf("fallback: %d %v", n, err)
	}
	n, err = ParseNonNegInt("7", 20)
	if err != nil || n != 7 {
		t.Fatalf("parse: %d %v", n, err)
	}
	if _, err := ParseNonNegInt("-1", 0); err == nil {
		t.Fatal("expected error for negative")
	}
	if _, err := ParseNonNegInt("x", 0); err == nil {
		t.Fatal("expected error for junk")
	}
}
