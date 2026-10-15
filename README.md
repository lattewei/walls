# Open Studio _(nom provisoire)_

Plateforme web open source : pages d’artistes ouvertes, upload de productions taguées, écoute in-app, contact direct du beatmaker.

> Le nom commercial reste à définir. Le nom technique du dépôt est `openstudio` pour l’instant.

## Le problème

Un beatmaker produit pour Johnny mais ne peut pas le joindre facilement. Il crée (ou ouvre) la page Johnny, uploade sa prod, la tague. Johnny voit toutes les prods qui le mentionnent, écoute dans le navigateur, contacte le créateur (mail / Instagram).

## Stack

| Couche        | Techno                          |
|---------------|---------------------------------|
| API           | Go, Gin, PostgreSQL             |
| Web           | Next.js, TypeScript _(Phase 2+)_ |
| Infra locale  | Docker Compose                  |

## Prérequis

- [Go](https://go.dev/dl/) ≥ 1.22
- PostgreSQL (install native **ou** Docker — au choix ; pas obligatoire pour coder / `go test`)
- [Node.js](https://nodejs.org/) ≥ 20 _(frontend, plus tard)_

`DATABASE_URL` pointe vers ton Postgres local. Voir [docs/development.md](./docs/development.md).

## Démarrage rapide

```bash
# 1. Variables d'environnement
cp .env.example .env

# 2. Base de données
docker compose up -d db

# 3. Migrations
cd services/api
go run ./cmd/migrate up

# 4. API
go run ./cmd/api
```

L’API écoute sur `http://localhost:8080`.

```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/health
```

## Structure

```text
.
├── apps/web/           # Frontend Next.js (à venir)
├── services/api/       # API Go
├── migrations/         # SQL versionné
├── docs/               # Architecture, API, dev
├── scripts/
├── docker-compose.yml
├── .env.example
├── cdc.md              # Cahier des charges
└── README.md
```

## Documentation

- [Cahier des charges](./cdc.md)
- [Architecture](./docs/architecture.md)
- [Développement](./docs/development.md)
- [Auth API (handles)](./docs/api-auth.md)
- [Backlog petites tâches](./docs/tasks.md)

## Auth (MVP)

Pas d’e-mail au début : **handle + mot de passe**.

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"handle":"johnny_beats","password":"secret123","display_name":"Johnny"}'
```

## Licence

À définir (MIT ou AGPL-3.0) avant publication publique.
