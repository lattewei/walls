# Architecture — Walls

## Overview

Modular monolith:

- **Go API** (`services/api`): auth, users, artists, tracks, media, moderation
- **Next.js web** (`apps/web`): UI + HTML5 audio player
- **PostgreSQL**: source of truth
- **Audio storage**: local files in this version (`MEDIA_STORAGE=local` only)

```text
Browser  →  Next.js (UI)
         →  Go API /api/v1  →  PostgreSQL
                            ↘  media store (files)
```

## Core product flow

1. Create or open an artist page (`artists`)
2. Upload a track + `track_artists` links (tags / mentions)
3. Play audio via `GET /tracks/:id/audio` (Range requests are supported)
4. Contact via the uploader’s public profile fields

## API modules

| Module       | Responsibility                         |
|--------------|----------------------------------------|
| `auth`       | Register, login, JWT                   |
| `users`      | Profiles, public contacts              |
| `artists`    | Pages, slugs, claims                   |
| `tracks`     | Productions, artist tags               |
| `media`      | Validation, storage, streaming         |
| `moderation` | Reports, admin actions                 |

## Principles

- Access control **on the server only**
- JWT carries user id, handle, and session version. Role is never taken from the token; it is loaded from the database on each request
- No microservices in the MVP
- Versioned SQL migrations in `/migrations`
- Config only via environment variables
