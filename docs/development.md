# Local development

## Prerequisites

1. Go >= 1.22
2. Local PostgreSQL (native install **or** Docker Compose)
3. Copy `.env.example` -> `.env`

Docker is **not** required. Without a database you can still code and run `go test ./...` (unit tests need no DB).

## Database

### Option A - PostgreSQL native

1. Install PostgreSQL and ensure `psql` is available
2. Create user/db (as superuser, e.g. `postgres`):

```sql
CREATE USER walls WITH PASSWORD 'walls_dev';
CREATE DATABASE walls OWNER walls;
\c walls
CREATE EXTENSION IF NOT EXISTS pgcrypto;
```

3. Copy `.env.example` to `.env` (defaults already match)
4. Run migrations:

```bash
cd services/api
go run ./cmd/migrate up
```

### Option B — Docker Compose

```bash
docker compose up -d db
docker compose ps
```

## Migrations

```bash
cd services/api
go run ./cmd/migrate up
go run ./cmd/migrate down   # one step back
go run ./cmd/migrate version
```

SQL files live in `/migrations` at the repo root.

## Run the API

```bash
cd services/api
go run ./cmd/api
```

Health checks:

- `GET /health` - process up
- `GET /api/v1/health` - process + DB

## Seed data

Development only (`API_ENV=development`). Populates users, walls, tagged tracks, plays and generated cover art / audio so the UI is not empty.

```bash
cd services/api
go run ./cmd/seed
```

- Safe to rerun: rows and files are deterministic and skipped when present. It stops with an error if a demo handle or wall slug already belongs to a different row.
- Demo password for every seeded account: `walls-demo-pass`
- `yunaray` - claimed wall, own uploads (one withdrawn), wall activity
- `wallsadmin` - admin role for moderation screens
- Covers are generated JPEGs and audio is a synthesized WAV loop; no external assets and no network access.
- Files land in `MEDIA_LOCAL_PATH` (`./data/media` by default).

## Tests

```bash
cd services/api
go test ./...
```

## Manual auth (after migrate)

```bash
# Register
curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"handle\":\"demo_user\",\"password\":\"secret123\",\"display_name\":\"Demo\"}"

# Call /me with the token
curl -s http://localhost:8080/api/v1/me \
  -H "Authorization: Bearer <access_token>"
```

See [api-auth.md](./api-auth.md).

## Frontend (Next.js)

```bash
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

App: `http://localhost:3001`  
API must be running on `:8080`.

The browser calls the Go API directly (`NEXT_PUBLIC_API_URL`, default `http://127.0.0.1:8080`). CORS origins are set on the API (`API_CORS_ORIGINS`).
