# Walls

[![CI](https://github.com/lattewei/walls/actions/workflows/ci.yml/badge.svg)](https://github.com/lattewei/walls/actions/workflows/ci.yml)

Open-source web platform: open artist pages, tagged beat submissions, in-app listening, and direct contact with producers.

> Product name: **Walls**. Module path: `github.com/lattewei/walls`.

## About this project

I am not a web frontend developer. The **web UI** (`apps/web`) was built **with AI assistance** (layout, components, styling). I directed the product, reviewed the result, and own the decisions.

The **backend** (Go API, auth, artists, tracks, Postgres) is the core of the engineering work on this repo.

## The problem

A beatmaker makes a track for Johnny but cannot reach him easily. They create (or open) Johnny's page, upload the prod, and tag it. Johnny sees every production that mentions him, listens in the browser, and contacts the creator (email / Instagram).

## Stack

| Layer        | Tech                            |
|--------------|---------------------------------|
| API          | Go, Gin, PostgreSQL             |
| Web          | Next.js, TypeScript (UI via AI assistance) |
| Local infra  | Docker Compose (optional)       |

## Prerequisites

- [Go](https://go.dev/dl/) >= 1.22
- PostgreSQL (native install **or** Docker; optional for coding / `go test`)
- [Node.js](https://nodejs.org/) >= 20

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
├── apps/web/           # Next.js frontend (UI built with AI assistance)
├── services/api/       # Go API
├── migrations/         # Versioned SQL
├── docs/               # Architecture, API, dev
├── .github/workflows/  # CI
├── docker-compose.yml
├── .env.example
├── LICENSE
└── README.md
```

## Documentation

- [Architecture](./docs/architecture.md)
- [Local development](./docs/development.md)
- [Auth API (handles)](./docs/api-auth.md)
- [Artists API](./docs/api-artists.md)
- [Tracks API](./docs/api-tracks.md)
- [Claims, reports & admin](./docs/api-moderation.md)

## Auth (MVP)

No email at the start: **handle + password**.

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"handle":"johnny_beats","password":"secret123","display_name":"Johnny"}'
```

## Tests

```bash
cd services/api && go test ./...
cd apps/web && npm run lint && npm run build
```

GitHub Actions runs the same checks on every push.

## License

[MIT](./LICENSE)
