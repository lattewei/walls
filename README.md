# Walls


You made a beat for someone you cannot reach. Open their public wall, upload the instrumental, tag their name. They listen in the browser. If they want it, they write you.

No DMs. No sales. No inbox. Handle + password, no email.

Go API + Postgres. Next.js UI (built with AI assistance; I directed it). Auth, uploads, claims, and moderation are enforced on the server. JWT identity is re-checked in the database on every request.

## Run

Go 1.22+, Node 20+, Postgres. Docker can provide the database.

```bash
cp .env.example .env && cp apps/web/.env.example apps/web/.env.local && docker compose up -d db
cd services/api && go run ./cmd/migrate up && go run ./cmd/api
cd apps/web && npm i && npm run dev
```

The last two lines are two terminals. App: [http://localhost:3001](http://localhost:3001). API: [http://localhost:8080](http://localhost:8080).

Native Postgres, env vars, and troubleshooting: [docs/development.md](./docs/development.md).

## Docs

- [Architecture](./docs/architecture.md)
- [Auth](./docs/api-auth.md)
- [Artists](./docs/api-artists.md)
- [Tracks](./docs/api-tracks.md)
- [Claims, reports, admin](./docs/api-moderation.md)

## License

[MIT](./LICENSE)

[![CI](https://github.com/lattewei/walls/actions/workflows/ci.yml/badge.svg)](https://github.com/lattewei/walls/actions/workflows/ci.yml)
