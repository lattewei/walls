# Architecture — Open Studio (working name)

## Overview

Modular monolith:

- **Go API** (`services/api`): auth, users, artists, tracks, media, moderation
- **Next.js web** (`apps/web`): UI + HTML5 audio player
- **PostgreSQL**: source of truth
- **Audio storage**: abstract interface (local in dev, S3-compatible in prod)

```text
Browser  →  Next.js  →  REST /api/v1  →  Go modules  →  PostgreSQL
                                      ↘  media store (files)
```

## Core product flow

1. Create or open an artist page (`artists`)
2. Upload a track + `track_artists` links (tags / mentions)
3. Play audio via stream endpoint / signed URL
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
- No microservices in the MVP
- Versioned SQL migrations in `/migrations`
- Config only via environment variables
