package artists

import "testing"

func TestEscapeILIKE(t *testing.T) {
	got := escapeILIKE(`100%_raw\`)
	want := `100\%\_raw\\`
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}
