package domain

import "time"

const (
	TrackProcessing = "processing"
	TrackReady      = "ready"
	TrackFailed     = "failed"
	TrackRemoved    = "removed"
)

type Track struct {
	ID              string
	UploaderUserID  string
	Title           string
	Description     *string
	AudioObjectKey  *string
	AudioFormat     *string
	DurationSeconds *int
	Status          string
	CreatedAt       time.Time
	UpdatedAt       time.Time
	RemovedAt       *time.Time
	ArtistIDs       []string
	ArtistSlugs     []string
	Tags            []string
	UploaderHandle  string
	UploaderName    string
}

type PublicTrack struct {
	ID              string   `json:"id"`
	Title           string   `json:"title"`
	Description     *string  `json:"description,omitempty"`
	AudioFormat     *string  `json:"audio_format,omitempty"`
	DurationSeconds *int     `json:"duration_seconds,omitempty"`
	Status          string   `json:"status"`
	ArtistSlugs     []string `json:"artist_slugs"`
	Tags            []string `json:"tags"`
	UploaderHandle  string   `json:"uploader_handle,omitempty"`
	UploaderName    string   `json:"uploader_display_name,omitempty"`
	CreatedAt       string   `json:"created_at"`
	AudioURL        string   `json:"audio_url,omitempty"`
}

func (t Track) ToPublic() PublicTrack {
	slugs := t.ArtistSlugs
	if slugs == nil {
		slugs = []string{}
	}
	tags := t.Tags
	if tags == nil {
		tags = []string{}
	}
	p := PublicTrack{
		ID:              t.ID,
		Title:           t.Title,
		Description:     t.Description,
		AudioFormat:     t.AudioFormat,
		DurationSeconds: t.DurationSeconds,
		Status:          t.Status,
		ArtistSlugs:     slugs,
		Tags:            tags,
		UploaderHandle:  t.UploaderHandle,
		UploaderName:    t.UploaderName,
		CreatedAt:       t.CreatedAt.UTC().Format(time.RFC3339),
	}
	if t.Status == TrackReady && t.AudioObjectKey != nil && *t.AudioObjectKey != "" {
		p.AudioURL = "/api/v1/tracks/" + t.ID + "/audio"
	}
	return p
}
