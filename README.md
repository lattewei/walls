# Walls

Open-source web platform: open artist pages, tagged beat submissions, in-app listening, and direct contact with producers.

> Product name: **Walls**. Some technical identifiers still use `openstudio` (Go module, local DB user) until a full rename.

## The problem

A beatmaker makes a track for Johnny but cannot reach him easily. They create (or open) Johnny’s page, upload the prod, and tag it. Johnny sees every production that mentions him, listens in the browser, and contacts the creator (email / Instagram).

## Stack

| Layer        | Tech                            |
|--------------|---------------------------------|
| API          | Go, Gin, PostgreSQL             |
| Web          | Next.js, TypeScript _(later)_   |
| Local infra  | Docker Compose (optional)       |

## Prerequisites

- [Go](https://go.dev/dl/) ≥ 1.22
- PostgreSQL (native install **or** Docker — optional for coding / `go test`)
- [Node.js](https://nodejs.org/) ≥ 20 _(frontend, later)_

Point `DATABASE_URL` at your local Postgres. See [docs/development.md](./docs/development.md).

## Quick start

```bash
# 1. Environment
cp .env.example .env

# 2. Database (Docker optional)
docker compose up -d db

# 3. Migrations + API
cd services/api
go run ./cmd/migrate up
go run ./cmd/api
```

API: `http://localhost:8080`

```bash
# 4. Frontend (other terminal)
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

Web: `http://localhost:3000`

```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/health
```

## Layout

```text
.
├── apps/web/           # Next.js frontend (upcoming)
├── services/api/       # Go API
├── migrations/         # Versioned SQL
├── docs/               # Architecture, API, dev
├── scripts/
├── docker-compose.yml
├── .env.example
└── README.md
```

## Documentation

- [Architecture](./docs/architecture.md)
- [Local development](./docs/development.md)
- [Auth API (handles)](./docs/api-auth.md)
- [Artists API](./docs/api-artists.md)
- [Tracks API](./docs/api-tracks.md)
- [Claims, reports & admin](./docs/api-moderation.md)
- [Image credits](./CREDITS.md)

## Auth (MVP)

No email at the start: **handle + password**.

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"handle":"johnny_beats","password":"secret123","display_name":"Johnny"}'
```

## License

TBD (MIT or AGPL-3.0) before public release.
