package artists

import (
	"fmt"
	"regexp"
	"strings"
	"unicode"
)

var (
	slugCleanRe = regexp.MustCompile(`[^a-z0-9]+`)
	slugTrimRe  = regexp.MustCompile(`^-+|-+$`)
	slugValidRe = regexp.MustCompile(`^[a-z0-9]+(?:-[a-z0-9]+)*$`)
)

const (
	minSlugLen  = 2
	maxSlugLen  = 64
	maxNameLen  = 100
	maxBioLen   = 2000
	maxGenres   = 20
	maxGenreLen = 40
)

func Slugify(name string) string {
	s := strings.ToLower(strings.TrimSpace(name))
	var b strings.Builder
	b.Grow(len(s))
	for _, r := range s {
		switch {
		case unicode.IsLetter(r) || unicode.IsDigit(r):
			b.WriteRune(unicode.ToLower(r))
		case unicode.IsSpace(r) || r == '-' || r == '_' || r == '.':
			b.WriteByte('-')
		}
	}
	s = b.String()
	s = slugCleanRe.ReplaceAllString(s, "-")
	s = slugTrimRe.ReplaceAllString(s, "")
	if len(s) > maxSlugLen {
		s = strings.Trim(s[:maxSlugLen], "-")
	}
	return s
}

func ValidateSlug(slug string) error {
	if len(slug) < minSlugLen || len(slug) > maxSlugLen {
		return fmt.Errorf("slug must be %d–%d characters", minSlugLen, maxSlugLen)
	}
	if !slugValidRe.MatchString(slug) {
		return fmt.Errorf("slug must be lowercase letters, digits, and single hyphens")
	}
	return nil
}

func ValidateName(name string) error {
	name = strings.TrimSpace(name)
	if name == "" {
		return fmt.Errorf("name is required")
	}
	n := 0
	for range name {
		n++
	}
	if n > maxNameLen {
		return fmt.Errorf("name must be at most %d characters", maxNameLen)
	}
	return nil
}

func ValidateBio(bio string) error {
	n := 0
	for range bio {
		n++
	}
	if n > maxBioLen {
		return fmt.Errorf("bio must be at most %d characters", maxBioLen)
	}
	return nil
}

func ValidateGenres(genres []string) error {
	if len(genres) > maxGenres {
		return fmt.Errorf("at most %d genres allowed", maxGenres)
	}
	for i, g := range genres {
		g = strings.TrimSpace(g)
		if g == "" {
			return fmt.Errorf("genres[%d] is empty", i)
		}
		n := 0
		for range g {
			n++
		}
		if n > maxGenreLen {
			return fmt.Errorf("genres[%d] is too long", i)
		}
	}
	return nil
}

func NormalizeGenres(genres []string) []string {
	if genres == nil {
		return []string{}
	}
	out := make([]string, 0, len(genres))
	seen := make(map[string]struct{}, len(genres))
	for _, g := range genres {
		g = strings.TrimSpace(g)
		if g == "" {
			continue
		}
		key := strings.ToLower(g)
		if _, ok := seen[key]; ok {
			continue
		}
		seen[key] = struct{}{}
		out = append(out, g)
	}
	return out
}

func NormalizeName(name string) string {
	return strings.Join(strings.Fields(strings.TrimSpace(name)), " ")
}
