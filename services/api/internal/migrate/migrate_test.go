package migrate

import (
	"runtime"
	"strings"
	"testing"
)

func TestFileSourceURLWindowsStyle(t *testing.T) {
	if runtime.GOOS != "windows" {
		t.Skip("windows path shape")
	}
	got, err := fileSourceURL(`C:\Users\ltcwr\Desktop\music\migrations`)
	if err != nil {
		t.Fatal(err)
	}
	if !strings.HasPrefix(got, "file://C:/") {
		t.Fatalf("want file://C:/... got %q", got)
	}
	if strings.HasPrefix(got, "file:///C:") {
		t.Fatalf("triple-slash Windows URL is invalid for migrate: %q", got)
	}
	if !strings.HasSuffix(got, "/migrations") {
		t.Fatalf("path lost: %q", got)
	}
}
