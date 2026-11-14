package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/lattewei/walls/services/api/internal/auth"
	"github.com/lattewei/walls/services/api/internal/config"
	"github.com/lattewei/walls/services/api/internal/db"
	"github.com/lattewei/walls/services/api/internal/envfile"
	"github.com/lattewei/walls/services/api/internal/media"
)

const demoPassword = "walls-demo-pass"

var (
	seedNS = uuid.NewSHA1(uuid.NameSpaceOID, []byte("walls.local/seed/v1"))
	now    = time.Now().UTC()
)

type seedUser struct {
	Handle    string
	Display   string
	Bio       string
	Email     string
	Instagram string
	Admin     bool
}

type seedWall struct {
	Slug       string
	Name       string
	Bio        string
	LookingFor string
	Genres     []string
	CreatedBy  string
	ClaimedBy  string
}

type seedTrack struct {
	Title    string
	By       string
	Walls    []string
	Tags     []string
	Desc     string
	HoursAgo int
	Plays    int
	Seconds  int
	Removed  bool
}

var seedUsers = []seedUser{
	{
		Handle:    "yunaray",
		Display:   "Yuna Ray",
		Bio:       "R&B vocals, south London. Open to hooks.",
		Email:     "yuna@example.com",
		Instagram: "https://instagram.com/yunaray",
	},
	{
		Handle:  "kaybeats",
		Display: "Kay",
		Bio:     "Drill and trap. 140 or nothing.",
		Email:   "kay@example.com",
	},
	{
		Handle:  "novasound",
		Display: "Nova",
		Bio:     "Synths, hyperpop, odd pop edits.",
		Email:   "nova@example.com",
	},
	{
		Handle:    "marlowwav",
		Display:   "Marlow",
		Bio:       "Boom bap and dusty loops.",
		Instagram: "https://instagram.com/marlowwav",
	},
	{
		Handle:  "junowav",
		Display: "Juno",
		Bio:     "House, afro, percussive edits.",
		Email:   "juno@example.com",
	},
	{
		Handle:  "eraldo",
		Display: "Eraldo",
		Bio:     "Lo-fi keys and jazz chords.",
		Email:   "eraldo@example.com",
	},
	{
		Handle:  "twelvebeats",
		Display: "Twelve",
		Bio:     "Minimal drums for singers.",
		Email:   "twelve@example.com",
	},
	{
		Handle:  "wallsadmin",
		Display: "Walls Admin",
		Bio:     "Demo moderator account.",
		Admin:   true,
	},
}

var seedWalls = []seedWall{
	{
		Slug:       "yuna-ray",
		Name:       "Yuna Ray",
		Bio:        "South London R&B. Sparse, late-night beats only.",
		LookingFor: "Sparse R&B beats, 70-90 BPM",
		Genres:     []string{"rnb", "soul"},
		CreatedBy:  "yunaray",
		ClaimedBy:  "yunaray",
	},
	{
		Slug:       "nova-kane",
		Name:       "Nova Kane",
		Bio:        "Hyperpop hooks and broken synths.",
		LookingFor: "Glitchy pop instrumentals",
		Genres:     []string{"hyperpop", "pop"},
		CreatedBy:  "novasound",
	},
	{
		Slug:       "static-bloom",
		Name:       "Static Bloom",
		Bio:        "Shoegaze guitars buried under tape hiss.",
		LookingFor: "Wide, slow guitar loops",
		Genres:     []string{"shoegaze", "alt"},
		CreatedBy:  "twelvebeats",
	},
	{
		Slug:       "leo-marceau",
		Name:       "Leo Marceau",
		Bio:        "Afro house and warm percussion.",
		LookingFor: "Afro house, 118-126 BPM",
		Genres:     []string{"house", "afro"},
		CreatedBy:  "junowav",
	},
	{
		Slug:       "midnight-sage",
		Name:       "Midnight Sage",
		Bio:        "Lo-fi keys, rain, 2am chords.",
		LookingFor: "Jazz chords and soft drums",
		Genres:     []string{"lo-fi", "jazz"},
		CreatedBy:  "eraldo",
	},
	{
		Slug:       "rami-ode",
		Name:       "Rami Ode",
		Bio:        "Rap over samples that sound like dust.",
		LookingFor: "Boom bap, 86-92 BPM",
		Genres:     []string{"rap", "boom-bap"},
		CreatedBy:  "marlowwav",
	},
	{
		Slug:       "nia-voss",
		Name:       "Nia Voss",
		Bio:        "Alt pop with room for a voice.",
		LookingFor: "Minimal pop instrumentals",
		Genres:     []string{"alt-pop", "electronic"},
		CreatedBy:  "twelvebeats",
	},
}

var seedTracks = []seedTrack{
	{
		Title: "Late Text", By: "kaybeats", Walls: []string{"yuna-ray"},
		Tags: []string{"rnb", "night", "90 bpm"}, Desc: "90 BPM, A minor. Soft 808, no snare on the two.",
		HoursAgo: 3, Plays: 1840, Seconds: 24,
	},
	{
		Title: "Cold Water", By: "kaybeats", Walls: []string{"yuna-ray", "midnight-sage"},
		Tags: []string{"soul", "guitar"}, Desc: "Guitar loop and a drum bus that never opens.",
		HoursAgo: 26, Plays: 920, Seconds: 28,
	},
	{
		Title: "No Signal", By: "novasound", Walls: []string{"nova-kane"},
		Tags: []string{"hyperpop", "glitch", "150"}, Desc: "150 BPM. Pitch it up and it still works.",
		HoursAgo: 5, Plays: 2310, Seconds: 18,
	},
	{
		Title: "Bubblegum Static", By: "novasound", Walls: []string{"nova-kane", "nia-voss"},
		Tags: []string{"pop", "bright"}, Desc: "Bright, clipped, two chords.",
		HoursAgo: 48, Plays: 640, Seconds: 16,
	},
	{
		Title: "Marble Floor", By: "junowav", Walls: []string{"leo-marceau"},
		Tags: []string{"house", "afro", "124"}, Desc: "124 BPM. Log drum and a dry clap.",
		HoursAgo: 7, Plays: 3050, Seconds: 26,
	},
	{
		Title: "Sun Roof", By: "junowav", Walls: []string{"leo-marceau"},
		Tags: []string{"house", "summer"}, Desc: "Chords for a rooftop, 120 BPM.",
		HoursAgo: 96, Plays: 1120, Seconds: 24,
	},
	{
		Title: "Dust Loop", By: "marlowwav", Walls: []string{"rami-ode"},
		Tags: []string{"boom-bap", "dusty", "88"}, Desc: "88 BPM. Vinyl noise left in on purpose.",
		HoursAgo: 24, Plays: 1620, Seconds: 22,
	},
	{
		Title: "Corner Store", By: "marlowwav", Walls: []string{"rami-ode", "midnight-sage"},
		Tags: []string{"sample", "jazz"}, Desc: "Rhodes chop, shuffled hats.",
		HoursAgo: 144, Plays: 780, Seconds: 24,
	},
	{
		Title: "Window Seat", By: "eraldo", Walls: []string{"midnight-sage"},
		Tags: []string{"lo-fi", "keys", "72"}, Desc: "72 BPM. For a hook, not a verse.",
		HoursAgo: 10, Plays: 2210, Seconds: 30,
	},
	{
		Title: "Slow Rain", By: "eraldo", Walls: []string{"midnight-sage"},
		Tags: []string{"rain", "chill"}, Desc: "Soft traffic, soft keys.",
		HoursAgo: 216, Plays: 540, Seconds: 26,
	},
	{
		Title: "Blue Hour", By: "twelvebeats", Walls: []string{"nia-voss"},
		Tags: []string{"alt-pop", "minimal"}, Desc: "Two notes and a lot of space.",
		HoursAgo: 12, Plays: 1940, Seconds: 20,
	},
	{
		Title: "Paper Crown", By: "twelvebeats", Walls: []string{"nia-voss", "static-bloom"},
		Tags: []string{"dreamy", "guitar"}, Desc: "Reverb first, drums second.",
		HoursAgo: 72, Plays: 870, Seconds: 26,
	},
	{
		Title: "Glass Garden", By: "kaybeats", Walls: []string{"static-bloom"},
		Tags: []string{"shoegaze", "walls"}, Desc: "Slow, wide, 6/8.",
		HoursAgo: 120, Plays: 410, Seconds: 32,
	},
	{
		Title: "Hollow", By: "novasound", Walls: []string{"static-bloom"},
		Tags: []string{"drone", "moody"}, Desc: "One chord held for a minute.",
		HoursAgo: 264, Plays: 330, Seconds: 34,
	},
	{
		Title: "Run It", By: "kaybeats", Walls: []string{"rami-ode"},
		Tags: []string{"drill", "dark", "142"}, Desc: "142 BPM. Slides and a cold bass.",
		HoursAgo: 20, Plays: 2870, Seconds: 18,
	},
	{
		Title: "After Party", By: "junowav", Walls: []string{"yuna-ray"},
		Tags: []string{"rnb", "club"}, Desc: "Late, drunk, 108 BPM.",
		HoursAgo: 192, Plays: 1290, Seconds: 24,
	},
	{
		Title: "Northside", By: "marlowwav", Walls: []string{"nia-voss"},
		Tags: []string{"rap", "melodic"}, Desc: "Guitar sample, half-time drums.",
		HoursAgo: 312, Plays: 720, Seconds: 22,
	},
	{
		Title: "Static Love", By: "twelvebeats", Walls: []string{"nova-kane"},
		Tags: []string{"pop", "loud"}, Desc: "Distorted everything.",
		HoursAgo: 360, Plays: 610, Seconds: 18,
	},
	{
		Title: "Old Draft", By: "kaybeats", Walls: []string{"yuna-ray"},
		Tags: []string{"rnb", "draft"}, Desc: "Kept for the arrangement.",
		HoursAgo: 504, Plays: 47, Seconds: 20, Removed: true,
	},
	{
		Title: "Test Bounce", By: "eraldo", Walls: []string{"midnight-sage"},
		Tags: []string{"test"}, Desc: "Mix check before the real thing.",
		HoursAgo: 720, Plays: 12, Seconds: 16, Removed: true,
	},
	{
		Title: "Late Text (Demo Vocal)", By: "yunaray", Walls: []string{"yuna-ray"},
		Tags: []string{"rnb", "vocal", "demo"}, Desc: "Reference vocal over the Kay beat. Not final.",
		HoursAgo: 2, Plays: 260, Seconds: 24,
	},
	{
		Title: "Cold Water (Hook)", By: "yunaray", Walls: []string{"yuna-ray"},
		Tags: []string{"soul", "hook"}, Desc: "Hook idea, one take, phone mic.",
		HoursAgo: 30, Plays: 88, Seconds: 22,
	},
	{
		Title: "Scratch Take", By: "yunaray", Walls: []string{"yuna-ray"},
		Tags: []string{"vocal", "scratch"}, Desc: "Wrong key. Kept for reference.",
		HoursAgo: 400, Plays: 6, Seconds: 18, Removed: true,
	},
}

func main() {
	if err := run(); err != nil {
		fmt.Fprintf(os.Stderr, "seed error: %v\n", err)
		os.Exit(1)
	}
}

func run() error {
	envfile.Load()

	cfg, err := config.Load()
	if err != nil {
		return err
	}
	if !cfg.IsDev() {
		return fmt.Errorf("refusing to seed outside development (API_ENV=%s)", cfg.Env)
	}

	ctx := context.Background()
	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		return err
	}
	defer pool.Close()

	storage, err := media.NewLocalStorage(cfg.MediaLocalPath)
	if err != nil {
		return err
	}

	s := &seeder{pool: pool, storage: storage}
	stats, err := s.seed(ctx)
	if err != nil {
		return err
	}

	fmt.Printf("seed: %d users, %d walls, %d tracks, %d audio files, %d covers\n",
		stats.users, stats.walls, stats.tracks, stats.audio, stats.covers)
	fmt.Printf("seed: skipped %d users, %d walls, %d tracks already present\n",
		stats.skippedUsers, stats.skippedWalls, stats.skippedTracks)
	fmt.Printf("seed: demo accounts use password %q\n", demoPassword)
	fmt.Println("seed: try yunaray (uploads, claimed wall, activity) or wallsadmin (moderation)")
	return nil
}

type stats struct {
	users, walls, tracks, audio, covers int
	skippedUsers, skippedWalls          int
	skippedTracks                       int
}

type seeder struct {
	pool    *pgxpool.Pool
	storage *media.LocalStorage
}

func seedID(kind, key string) string {
	return uuid.NewSHA1(seedNS, []byte(kind+":"+key)).String()
}

func (s *seeder) seed(ctx context.Context) (stats, error) {
	var out stats

	hash, err := auth.HashPassword(demoPassword)
	if err != nil {
		return out, err
	}

	userIDs := make(map[string]string, len(seedUsers))
	for _, u := range seedUsers {
		id := seedID("user", u.Handle)
		userIDs[u.Handle] = id

		avatarKey := seedID("avatar", u.Handle) + ".jpg"
		created, err := s.ensureFile(avatarKey, func() ([]byte, error) {
			return renderCover("avatar:"+u.Handle, 400)
		})
		if err != nil {
			return out, err
		}
		if created {
			out.covers++
		}

		status, err := s.insertUser(ctx, u, id, hash, avatarKey)
		if err != nil {
			return out, err
		}
		if status == insertCreated {
			out.users++
		} else {
			out.skippedUsers++
		}
	}

	wallIDs := make(map[string]string, len(seedWalls))
	for _, w := range seedWalls {
		id := seedID("wall", w.Slug)
		wallIDs[w.Slug] = id

		coverKey := seedID("wall-cover", w.Slug) + ".jpg"
		created, err := s.ensureFile(coverKey, func() ([]byte, error) {
			return renderCover("wall:"+w.Slug, 800)
		})
		if err != nil {
			return out, err
		}
		if created {
			out.covers++
		}

		var createdBy, claimedBy *string
		if id, ok := userIDs[w.CreatedBy]; ok {
			createdBy = &id
		}
		claimStatus := "unclaimed"
		if id, ok := userIDs[w.ClaimedBy]; ok {
			claimedBy = &id
			claimStatus = "claimed"
		}

		status, err := s.insertWall(ctx, w, id, coverKey, claimStatus, createdBy, claimedBy)
		if err != nil {
			return out, err
		}
		if status == insertCreated {
			out.walls++
		} else {
			out.skippedWalls++
		}
	}

	for _, t := range seedTracks {
		id := seedID("track", t.By+"/"+t.Title)
		status, err := s.insertTrack(ctx, t, id, userIDs, wallIDs, &out)
		if err != nil {
			return out, err
		}
		if status == insertCreated {
			out.tracks++
		} else {
			out.skippedTracks++
		}
	}

	return out, nil
}

type insertResult int

const (
	insertCreated insertResult = iota
	insertExists
)

func (s *seeder) insertUser(ctx context.Context, u seedUser, id, hash, avatarKey string) (insertResult, error) {
	var existing string
	err := s.pool.QueryRow(ctx, `SELECT id FROM users WHERE handle = $1 AND deleted_at IS NULL`, u.Handle).Scan(&existing)
	if err == nil {
		if existing != id {
			return insertExists, fmt.Errorf("handle %q already belongs to another account", u.Handle)
		}
		return insertExists, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return insertExists, fmt.Errorf("check user %s: %w", u.Handle, err)
	}

	role := "user"
	if u.Admin {
		role = "admin"
	}
	created := now.Add(-45 * 24 * time.Hour)
	if _, err := s.pool.Exec(ctx, `
		INSERT INTO users (id, handle, password_hash, display_name, bio, avatar_url, role, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8)
	`, id, u.Handle, hash, u.Display, u.Bio, avatarKey, role, created); err != nil {
		return insertExists, fmt.Errorf("insert user %s: %w", u.Handle, err)
	}

	links, err := json.Marshal([]map[string]string{})
	if err != nil {
		return insertExists, err
	}
	if _, err := s.pool.Exec(ctx, `
		INSERT INTO producer_profiles (user_id, public_contact_email, instagram_url, other_links)
		VALUES ($1, NULLIF($2, ''), NULLIF($3, ''), $4::jsonb)
		ON CONFLICT (user_id) DO NOTHING
	`, id, u.Email, u.Instagram, string(links)); err != nil {
		return insertExists, fmt.Errorf("insert profile %s: %w", u.Handle, err)
	}
	return insertCreated, nil
}

func (s *seeder) insertWall(ctx context.Context, w seedWall, id, coverKey, claimStatus string, createdBy, claimedBy *string) (insertResult, error) {
	var existing string
	err := s.pool.QueryRow(ctx, `SELECT id FROM artists WHERE lower(slug) = lower($1)`, w.Slug).Scan(&existing)
	if err == nil {
		if existing != id {
			return insertExists, fmt.Errorf("slug %q already belongs to another wall", w.Slug)
		}
		return insertExists, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return insertExists, fmt.Errorf("check wall %s: %w", w.Slug, err)
	}

	created := now.Add(-40 * 24 * time.Hour)
	if _, err := s.pool.Exec(ctx, `
		INSERT INTO artists (id, name, slug, bio, cover_url, genres, looking_for,
		                     claim_status, created_by, claimed_by, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
	`, id, w.Name, w.Slug, w.Bio, coverKey, w.Genres, w.LookingFor, claimStatus, createdBy, claimedBy, created); err != nil {
		return insertExists, fmt.Errorf("insert wall %s: %w", w.Slug, err)
	}
	return insertCreated, nil
}

func (s *seeder) insertTrack(ctx context.Context, t seedTrack, id string, userIDs, wallIDs map[string]string, out *stats) (insertResult, error) {
	uploaderID, ok := userIDs[t.By]
	if !ok {
		return insertExists, fmt.Errorf("track %q has unknown uploader %q", t.Title, t.By)
	}

	audioKey := seedID("audio", t.By+"/"+t.Title) + ".wav"
	coverKey := seedID("track-cover", t.By+"/"+t.Title) + ".jpg"

	if !t.Removed {
		created, err := s.ensureFile(audioKey, func() ([]byte, error) {
			return renderLoop(hashString(t.Title+t.By), t.Seconds), nil
		})
		if err != nil {
			return insertExists, err
		}
		if created {
			out.audio++
		}

		created, err = s.ensureFile(coverKey, func() ([]byte, error) {
			return renderCover("track:"+t.By+"/"+t.Title, 600)
		})
		if err != nil {
			return insertExists, err
		}
		if created {
			out.covers++
		}
	}

	var exists bool
	if err := s.pool.QueryRow(ctx, `SELECT EXISTS(SELECT 1 FROM tracks WHERE id = $1)`, id).Scan(&exists); err != nil {
		return insertExists, fmt.Errorf("check track %q: %w", t.Title, err)
	}
	if exists {
		return insertExists, nil
	}

	created := now.Add(-time.Duration(t.HoursAgo) * time.Hour)
	status := "ready"
	var audio, cover, format any
	var removedAt any
	audio = audioKey
	cover = coverKey
	format = "wav"
	if t.Removed {
		status = "removed"
		audio = nil
		cover = nil
		format = nil
		removedAt = created.Add(72 * time.Hour)
	}

	if _, err := s.pool.Exec(ctx, `
		INSERT INTO tracks (id, uploader_user_id, title, description, cover_url, audio_object_key,
		                    audio_format, duration_seconds, status, play_count, created_at, updated_at, removed_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $12)
	`, id, uploaderID, t.Title, t.Desc, cover, audio, format, t.Seconds, status, t.Plays, created, removedAt); err != nil {
		return insertExists, fmt.Errorf("insert track %q: %w", t.Title, err)
	}

	for _, slug := range t.Walls {
		wallID, ok := wallIDs[slug]
		if !ok {
			return insertExists, fmt.Errorf("track %q references unknown wall %q", t.Title, slug)
		}
		if _, err := s.pool.Exec(ctx, `
			INSERT INTO track_artists (track_id, artist_id) VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, id, wallID); err != nil {
			return insertExists, fmt.Errorf("link track %q to %s: %w", t.Title, slug, err)
		}
	}

	for _, tag := range t.Tags {
		if _, err := s.pool.Exec(ctx, `
			INSERT INTO track_tags (track_id, tag) VALUES ($1, $2)
			ON CONFLICT DO NOTHING
		`, id, tag); err != nil {
			return insertExists, fmt.Errorf("tag track %q: %w", t.Title, err)
		}
	}

	return insertCreated, nil
}

func (s *seeder) ensureFile(key string, render func() ([]byte, error)) (bool, error) {
	path, err := s.storage.Path(key)
	if err != nil {
		return false, err
	}
	if _, err := os.Stat(path); err == nil {
		return false, nil
	}
	data, err := render()
	if err != nil {
		return false, fmt.Errorf("render %s: %w", key, err)
	}
	if err := os.WriteFile(path, data, 0o644); err != nil {
		return false, fmt.Errorf("write %s: %w", key, err)
	}
	return true, nil
}
