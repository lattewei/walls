# Développement local

## Prérequis

1. Go ≥ 1.22
2. Docker Desktop (pour PostgreSQL)
3. Copier `.env.example` → `.env`

## Base de données

```bash
docker compose up -d db
```

Vérifier :

```bash
docker compose ps
```

## Migrations

```bash
cd services/api
go run ./cmd/migrate up
go run ./cmd/migrate down   # une étape en arrière
go run ./cmd/migrate version
```

Les fichiers SQL sont dans `/migrations` à la racine du dépôt.

## Lancer l’API

```bash
cd services/api
go run ./cmd/api
```

Health checks :

- `GET /health` — process up
- `GET /api/v1/health` — process + DB

## Tests

```bash
cd services/api
go test ./...
```

## Auth manuelle (après migrate)

```bash
# Register
curl -s -X POST http://localhost:8080/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"handle\":\"demo_user\",\"password\":\"secret123\",\"display_name\":\"Demo\"}"

# Login puis appeler /me avec le token
curl -s http://localhost:8080/api/v1/me \
  -H "Authorization: Bearer <access_token>"
```

Voir [api-auth.md](./api-auth.md). Backlog : [tasks.md](./tasks.md).

## Sans Docker

Installer PostgreSQL localement, créer la base `openstudio`, puis ajuster `DATABASE_URL` dans `.env`.
