# Tracks API

## `POST /api/v1/tracks`

Auth required. Multipart form upload.

| Field | Required | Notes |
|-------|----------|--------|
| `audio` | yes | file (mp3 or wav) |
| `title` | yes | max 120 chars |
| `description` | no | |
| `artist_slugs` | yes | comma-separated or repeated field |
| `tags` | no | comma-separated |

```bash
curl -X POST http://localhost:8080/api/v1/tracks \
  -H "Authorization: Bearer $TOKEN" \
  -F "audio=@beat.mp3" \
  -F "title=For Johnny" \
  -F "artist_slugs=johnny" \
  -F "tags=drill,dark"
```

**201** `{ "track": { …, "duration_seconds": 142, "audio_url": "/api/v1/tracks/{id}/audio" } }`  
Duration is computed at insert for mp3 and wav.  
**400** validation · **429** daily upload limit (`TRACK_DAILY_UPLOAD_LIMIT`)

## `GET /api/v1/tracks/{id}`

Public metadata (not removed tracks).

## `PATCH /api/v1/tracks/{id}`

Auth required. Owner only. JSON. Omit a field to leave it. Empty `description` clears it. `artist_slugs` must stay non-empty if sent.

```json
{
  "title": "Night run",
  "description": "",
  "artist_slugs": ["johnny"],
  "tags": ["drill"]
}
```

**200** `{ "track": { … } }` · **403** not the uploader

## `GET /api/v1/tracks/{id}/audio`

Public stream for `ready` tracks. Supports range requests via `ServeContent`.

## `DELETE /api/v1/tracks/{id}`

Auth required. Owner withdraws own track (`status=removed`) and the audio file is deleted.

## `GET /api/v1/artists/{slug}/tracks`

Public list of ready tracks on an artist page.

```bash
curl "http://localhost:8080/api/v1/artists/johnny/tracks?limit=20&offset=0"
```

## `GET /api/v1/users/{handle}/tracks`

Public list of ready tracks uploaded by that user.

## `GET /api/v1/producers`

Public list of users who have at least one ready track, ordered by track count.
