package tracks

import (
	"testing"
	"time"
)

func TestParseSort(t *testing.T) {
	if parseSort("plays") != "plays" {
		t.Fatal("plays")
	}
	if parseSort("PLAYS") != "plays" {
		t.Fatal("PLAYS")
	}
	if parseSort("") != "recent" || parseSort("nope") != "recent" {
		t.Fatal("default recent")
	}
}

func TestViewerKeyStableForUser(t *testing.T) {
	now := time.Date(2026, 10, 25, 12, 0, 0, 0, time.UTC)
	a := viewerKey("user-1", "1.2.3.4", "ua", now)
	b := viewerKey("user-1", "9.9.9.9", "other", now)
	if a != b || a != "u:user-1" {
		t.Fatalf("got %s %s", a, b)
	}
}

func TestViewerKeyAnonymousChangesByDay(t *testing.T) {
	d1 := time.Date(2026, 10, 25, 23, 0, 0, 0, time.UTC)
	d2 := time.Date(2026, 10, 26, 1, 0, 0, 0, time.UTC)
	a := viewerKey("", "1.2.3.4", "ua", d1)
	b := viewerKey("", "1.2.3.4", "ua", d2)
	if a == b {
		t.Fatal("anonymous key should rotate daily")
	}
	if a[:2] != "i:" {
		t.Fatalf("prefix %s", a)
	}
}
