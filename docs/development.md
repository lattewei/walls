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

App: `http://localhost:3000`  
API must be running on `:8080`.

The browser calls the Go API directly (`NEXT_PUBLIC_API_URL`, default `http://127.0.0.1:8080`). CORS origins are set on the API (`API_CORS_ORIGINS`).
