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

## `GET /api/v1/tracks`

Public catalog. `sort=recent` (default) or `sort=plays`. Paginated `limit` / `offset`.

## Play counts

`POST /api/v1/tracks/{id}/plays` — public. Call after ~15s of real playback, not on every stream byte.

- One count per listener per track per UTC day
- Logged-in listeners are keyed by user id; anonymous by a hash of IP + user-agent + day
- The uploader's own plays are ignored
- 40 requests / minute / IP

**200** `{ "counted": true, "play_count": 12 }` (`counted` is false if already counted today)

`play_count` is on every track payload.

Artist and uploader lists accept `?sort=plays` or `?sort=recent`.

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

| Param    | Default | Notes |
|----------|---------|-------|
| `q`      | (empty) | Case-insensitive match on **handle** or **display_name** |
| `limit`  | `20`    | Max `50` |
| `offset` | `0`     | Pagination offset |
