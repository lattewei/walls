package artists

import (
	"fmt"
	"regexp"
	"strings"
	"unicode"
)

var (
	urlInNameRe   = regexp.MustCompile(`(?i)https?://|www\.`)
	emailInNameRe = regexp.MustCompile(`(?i)[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}`)
)

var reservedSlugs = map[string]struct{}{
	"about": {}, "admin": {}, "api": {}, "app": {}, "artist": {}, "artists": {},
	"claim": {}, "health": {}, "help": {}, "login": {}, "me": {}, "media": {},
	"mod": {}, "null": {}, "official": {}, "register": {}, "search": {},
	"settings": {}, "static": {}, "support": {}, "undefined": {}, "upload": {},
	"user": {}, "users": {}, "wall": {}, "walls": {}, "www": {},
}

var blockedTokens = []string{
	"childporn", "childsex", "cpvideo", "csam", "onlyfans", "pornhub",
	"xvideos", "xnxx", "freetraffic", "freenitro", "cryptogiveaway",
}

func CheckWallIdentity(name, slug string) error {
	if err := ValidateName(name); err != nil {
		return err
	}
	if err := ValidateSlug(slug); err != nil {
		return err
	}
	if _, ok := reservedSlugs[slug]; ok {
		return fmt.Errorf("this name is reserved")
	}
	if urlInNameRe.MatchString(name) || urlInNameRe.MatchString(slug) {
		return fmt.Errorf("name cannot contain a URL")
	}
	if emailInNameRe.MatchString(name) {
		return fmt.Errorf("name cannot contain an email")
	}
	if hasRepeatedRunes(name, 5) {
		return fmt.Errorf("name looks like spam")
	}
	compact := compactAlnum(name + slug)
	for _, token := range blockedTokens {
		if strings.Contains(compact, token) {
			return fmt.Errorf("this name is not allowed")
		}
	}
	return nil
}

func ValidateName(name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return fmt.Errorf("name is required")
	}
	n := 0
	letters := 0
	for _, r := range name {
		n++
		if unicode.IsLetter(r) {
			letters++
		}
	}
	if n > maxNameLen {
		return fmt.Errorf("name must be at most %d characters", maxNameLen)
	}
	if letters < 2 {
		return fmt.Errorf("name must contain at least two letters")
	}
	return nil
}

func hasRepeatedRunes(s string, n int) bool {
	if n < 2 {
		return false
	}
	var prev rune
	run := 0
	for i, r := range strings.ToLower(s) {
		if i == 0 || r != prev {
			prev = r
			run = 1
			continue
		}
		run++
		if run >= n {
			return true
		}
	}
	return false
}

func compactAlnum(s string) string {
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range strings.ToLower(s) {
		if unicode.IsLetter(r) || unicode.IsDigit(r) {
			b.WriteRune(r)
		}
	}
	return b.String()
}
